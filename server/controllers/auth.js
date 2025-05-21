import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();
import User from "../models/User.js";
import ErrorResponse from "../utils/errorResponse.js";
import catchAsync from "../utils/catchAsync.js";

import authRequestsValidator from "../schema/userAuthValidator.js";

import sendEmail from "../utils/sendEmail.js"

import generateJWT from "../utils/generateJWT.js"

import calculateAge from '../utils/calculateAge.js'

import {STATUS_CODE} from '../utils/httpStatusCode.js'


const verifyEmailBody = (passwordResetCode) => {
  // sending password reset code the user email
  return {
    subject: "Email Verification",
    message: `
  <div style="
    font-family: 'Arial', sans-serif;
    max-width: 600px;
    margin: auto;
    padding: 20px;
    background-color: #ffffff;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    text-align: center;
  ">
   

    <!-- Headline -->
    <h2 style="color: #2a9d8f; margin-bottom: 10px;">
      Welcome to CoClinic!
    </h2>

    <!-- Subhead -->
    <p style="font-size: 16px; color: #333333; margin-bottom: 30px;">
      You’re one step away from accessing our telehealth platform.
      Simply enter the code below to verify your email address:
    </p>

    <!-- Verification Code -->
    <div style="
      display: inline-block;
      padding: 15px 25px;
      font-size: 28px;
      letter-spacing: 4px;
      background-color: #e76f51;
      color: #ffffff;
      border-radius: 4px;
      margin-bottom: 20px;
    ">
      ${passwordResetCode}
    </div>

    <!-- Timer Notice -->
    <p style="font-size: 14px; color: #f4a261; margin-bottom: 30px;">
      This code expires in <strong>2 minutes</strong>.
    </p>

    <!-- Fallback -->
    <p style="font-size: 14px; color: #666666;">
      Didn’t sign up for CoClinic? No worries — you can safely ignore this message.
    </p>

    <!-- Footer -->
    <hr style="border: none; height: 1px; background-color: #efefef; margin: 30px 0;" />
    <p style="font-size: 12px; color: #999999;">
      Need help? Contact us at
      <a href="mailto:support@coclinic.com" style="color: #2a9d8f;">
        support@coclinic.com
      </a>
    </p>
    <p style="font-size: 12px; color: #cccccc;">
      © 2025 CoClinic. All rights reserved.
    </p>
  </div>
`
  };
};


const resetPasswordTokenToMail = (code, userEmail) => {
  return {
    subject: "Password Reset Code",
    message: `
      <div style="
        font-family: Arial, sans-serif;
        max-width: 600px;
        margin: auto;
        padding: 20px;
        background-color: #ffffff;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        line-height: 1.6;
      ">
        <h2 style="color: #2a9d8f; text-align: center; margin-bottom: 10px;">
          Your Password Reset Code
        </h2>
        <p style="font-size: 16px; color: #333333; text-align: center; margin-bottom: 30px;">
          Hello,<br><br>
          We received a request to reset the password for <strong>${userEmail}</strong>.  
          Please copy the 4-digit code below and include it in your password-reset request:
        </p>
        <div style="
          text-align: center;
          margin-bottom: 30px;
        ">
          <span style="
            display: inline-block;
            padding: 15px 20px;
            font-family: monospace;
            font-size: 24px;
            letter-spacing: 4px;
            color: #ffffff;
            background-color: #e76f51;
            border-radius: 6px;
          ">${code}</span>
        </div>
        
        <p style="font-size: 14px; color: #f4a261; text-align: center; margin-bottom: 30px;">
          This code expires in <strong>5 minutes</strong>.  
          If you didn’t request this, simply ignore this email.
        </p>
        <hr style="border: none; height: 1px; background-color: #efefef; margin: 30px 0;" />
        <p style="font-size: 12px; color: #666666; text-align: center;">
          Need help? Contact support at
          <a href="mailto:support@coclinic.com" style="color: #2a9d8f; text-decoration: none;">
            support@coclinic.com
          </a>
        </p>
        <p style="font-size: 12px; color: #cccccc; text-align: center;">
          © 2025 CoClinic. All rights reserved.
        </p>
      </div>
    `
  };
};

export const signup = catchAsync(async (req, res, next) => {
  const { username, birthDate, name, email, password, gender, isDoctor, isAdmin, specialization } = req.body;

  const errorInValidation = authRequestsValidator("signup", req.body);
  if (errorInValidation !== true) {
    return next(errorInValidation);
  }

  const existingByEmail = await User.findOne({ email });
  const existingByUsername = await User.findOne({ username });

  const hashedPassword = await bcrypt.hash(password, 10);

  // Helper to send verification email
  const sendVerification = async (user) => {
    const code = user.generateEmailVerificationCodeForUsers();
    await user.save({ validateBeforeSave: false });
    const emailBody = verifyEmailBody(code);
    const info = await sendEmail({ html: emailBody.message, subject: emailBody.subject, to: user.email });
    if (info.rejected.length > 0) throw new Error('Email send failed');
  };

  // Re-registration flow
  if (existingByEmail) {
    if (existingByEmail.emailVerified) {
      return next(new ErrorResponse("Email already exists.", 400));
    }
    Object.assign(existingByEmail, { username, name, birthDate, gender, isDoctor, isAdmin });
    if (isDoctor) existingByEmail.specialization = specialization;
    const emailRes = await sendVerification(existingByEmail);
    return res.status(200).json({
      data: { username, name, email, birthDate, gender, isDoctor, isAdmin, specialization: isDoctor ? specialization : undefined },
      status: STATUS_CODE.SUCCESS,
      message: "Verification email sent. Please verify your email.",
    });
  }

  if (existingByUsername) {
    if (existingByUsername.emailVerified) {
      return next(new ErrorResponse("Username already exists.", 400));
    }
    Object.assign(existingByUsername, { email, name, birthDate, gender, isDoctor, isAdmin });
    if (isDoctor) existingByUsername.specialization = specialization;
    const emailRes = await sendVerification(existingByUsername);
    return res.status(200).json({
      data: { username, name, email, birthDate, gender, isDoctor, isAdmin, specialization: isDoctor ? specialization : undefined },
      status: STATUS_CODE.SUCCESS,
      message: "Verification email sent. Please verify your email.",
    });
  }

  // New user flow
  const newUser = new User({ username, name, email, password: hashedPassword, birthDate, gender, isDoctor, isAdmin });
  if (isDoctor) newUser.specialization = specialization;
  await newUser.save({ validateBeforeSave: false });
  await sendVerification(newUser);
  res.status(201).json({
    data: { username, name, email, birthDate, gender, isDoctor, isAdmin, specialization: isDoctor ? specialization : undefined },
    status: STATUS_CODE.SUCCESS,
    message: "Verification email sent. Please verify your email.",
  });
});

export const verifyEmail = catchAsync(async (req, res, next) => {
  const error = authRequestsValidator("verifyUser", req.body);
  if (error !== true) {
    return next(error);
  }

  const { email, confirmCode } = req.body;

  const user = await User.findOne({ email });
  if (!user)
    return next(
      new ErrorResponse("There is no user with this email address", 404)
    );

  //check if the confirmation code is correct
  if (user.emailVerifiedCode !== confirmCode)
    return next(
      new ErrorResponse("Incorrect confirmation code, please try again", 400)
    );

  //  check if the code still valid :
  if (user.emailVerifiedCodeExpireIn < Date.now())
    return next(
      new ErrorResponse(
        "This code not valid any more please try another one",
        400
      )
    );

  // if every thing ok then allow him to change his password and send response back
  user.emailVerified = true;
  user.emailVerifiedCode = undefined;
  user.emailVerifiedCodeExpireIn = undefined;

  await user.save({ validateBeforeSave: false });

  res.status(200).json({
    status: STATUS_CODE.SUCCESS,
    message: "Your email has been verified successfully ",
  });
});

export const signin = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  const errorInValidation = authRequestsValidator("signin", req.body);
  if (errorInValidation !== true) return next(errorInValidation);

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return next(new ErrorResponse("User not found", 404));
    }

    if (!user.emailVerified) {
      return next(new ErrorResponse("User not verified", 400));
    }

    const isMatch = await user.matchPassword(password);

    console.log("is match ===> ",isMatch)

    if (!isMatch) {
      return next(new ErrorResponse("Invalid email or password", 400));
    }

    // const accessToken = generateJWT({ userId: user._id }, "1h");

    
    const token = generateJWT({ userId: user._id }, "30d");


    const readableAge = calculateAge(user.birthDate)





    res
      .clearCookie("token")
      .cookie("token", token, {
        httpOnly: true, // Prevents client-side JavaScript access
        // secure: true, // Ensures it is sent over HTTPS
        // sameSite: "None", // Allows sharing cookies across different domains
        maxAge: 30 * 24 * 60 * 60 * 1000, // Expires in 30 days
      })

      .status(200)

      .json({
        data: {
          token,
            _id: user._id,
            username: user.username,
            name: user.name,
            gender: user.gender,
            email: user.email,
            age: readableAge,
            isAdmin: user?.isAdmin,
            isDoctor: user?.isDoctor,
            avatar: user?.avatar,
            approved: user?.approved,
        },
        status: STATUS_CODE.SUCCESS,
        message: "Logged in successfully",
      });
  } catch (error) {
    next(error);
  }
});


export const forgetPassword = catchAsync(async (req, res, next) => {
  // 1) get the user based on posted email :

  const { email } = req.body;

  const validationError = authRequestsValidator("reset_password_request", req.body);
  if (validationError !== true) {
    return next(validationError);
  }

  const user = await User.findOne({ email });

  if (!user)
    return next(new ErrorResponse( 'There is no user with this email address', 404,));

  //2) generate reset password :
  
  const passwordResetCode = user.generatePasswordResetCodeForUsers();

  user.resetPasswordExpires = Date.now() + 800000;
  await user.save({ validateBeforeSave: false });

  const resetPasswordToken = resetPasswordTokenToMail(passwordResetCode, user.email)


  try {
    const info = await sendEmail({ html: resetPasswordToken.message, subject: resetPasswordToken.subject, to: user.email });

    if (info.rejected.length > 0) {
      return next(
        new ErrorResponse(
          'Something wrong with this email maybe it does not exist',

          400,
        )
      );
    }

    res.status(200).json({
      status: STATUS_CODE.SUCCESS,
      message: 'reset password message sent to your email successfully',
    });
  } catch (err) {
    console.log(err);
    next(err);
  }
})

export const verifyCodeForResetPassword = catchAsync(async(req, res ,next) => {
  const { email, confirmCode } = req.body;

  const errorInValidation = authRequestsValidator("reset_password_verify", req.body);
  if (errorInValidation !== true) {
    return next(errorInValidation)
  }
  
  const user = await User.findOne({
    email,
    passwordResetCode: confirmCode,
    resetPasswordExpires: { $gt: Date.now() },
  });
  if (!user) {
    return res.status(400).json({ 
      status: STATUS_CODE.FAILED,
      message: 'Invalid or expired token' });
  }
  res.status(200).json({ status: STATUS_CODE.SUCCESS,
    message: "Code verified, you can reset password",});
})

export const resetPassword = catchAsync(async (req, res, next) => {
  const { email, confirmCode, newPassword } = req.body;

  const validationError = authRequestsValidator("reset_password", {email, confirmCode, newPassword});
  if (validationError !== true) {
    return next(validationError);
  }

  const user = await User.findOne({
    email,
    passwordResetCode: confirmCode,
    resetPasswordExpires: { $gt: Date.now() },
  });
  if (!user) {
    return res.status(400).json({ 
      status: STATUS_CODE.FAILED,
      message: 'Invalid or expired token' });
  }
  
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  
  user.password = hashedPassword;
  user.passwordResetCode = undefined;
  user.resetPasswordExpires = undefined;

  await user.save({validateBeforeSave: false});

  res.status(200).json({ 
    status: STATUS_CODE.SUCCESS,
    message: 'Password has been reset successfully' });
})

export const google = catchAsync(async (req, res, next) => {
  try {
    const { name, email, avatar } = req.body;
    let user = await User.findOne({ email });
    if (user) {
      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
      const { password: pwd, ...userData } = user._doc;
      return res
        .cookie("token", token, { httpOnly: true })
        .status(200)
        .json(userData);
    }
    const generatedPassword = Math.random().toString(36).slice(-8);
    const hashedPassword = await bcrypt.hash(generatedPassword, 10);
    user = await User({
      username:
        name.split(" ").join("").toLowerCase() +
        Math.random().toString(36).slice(-4),
      email,
      password: hashedPassword,
      avatar,
    });
    await user.save();
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
    const { password: pwd, ...userData } = user._doc;

    res
      .cookie("token", token, { httpOnly: true })
      .status(200)
      .json(userData);
  } catch (error) {
    next(error);
  }
});

export const signout = catchAsync(async (req, res, next) => {
  try {
    res.clearCookie("token");
    res.status(200).json({
      status: STATUS_CODE.SUCCESS,
      message: "User has been logged out!",
    });
  } catch (error) {
    next(error);
  }
});
