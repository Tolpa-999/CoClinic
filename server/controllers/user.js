import bcrypt from "bcryptjs";
import User from "../models/User.js";
import ErrorResponse from "../utils/errorResponse.js";
import getUserDetailsFromToken from "../utils/getUserDetailsFromToken.js";
import userManagemntValidator from "../schema/userManagementValidator.js";
import calculateAge from "../utils/calculateAge.js";

import {STATUS_CODE} from '../utils/httpStatusCode.js'

export const test = (req, res) => {
  res.status(200).json({
    message: "Api route is working",
  });
};

// Update user
export const updateUser = async (req, res, next) => {
  if (req.user.userId !== req?.params?.id) {
    return next(
      new ErrorResponse("You can only update your own account", 401)
    );
  }
  const { name, email } = req.body;

  const errorInValidation = userManagemntValidator("updateUser", {name, email});

  if (errorInValidation !== true) {
    return next(errorInValidation);
  }

  const profileImage = req.file ? req.file.filename : null; // Handle profile image update if provided

  try {
    let user = await User.findById(req.user.userId);

    if (!user) {
      return next(new ErrorResponse("User not found", 404));
    }

    // Update fields
    user.name = name;
    user.email = email;
    user.avatar = profileImage
      ? `http://localhost:3000/uploads/${profileImage}`
      : user.avatar;


    await user.save();
    const { password: pwd, ...userData } = user._doc;

    const age = calculateAge(user.birthDate);

    res.status(200).json({
      data: {...userData, age},
      success: true,
      status: STATUS_CODE.SUCCESS,
      message: "user updated successfully",
    });
  } catch (err) {
    console.log(err.message);
    next(err);
  }
};

export const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId);
    if (req.user.userId !== req.params.id && !user.isAdmin)
      return next(
        new ErrorResponse("You can only delete your own account!", 401)
      );

    await User.findByIdAndDelete(req.params.id);
    if (req.user.userId === req.params.id) {
      res.clearCookie("token");
    }
    res.status(200).json({
      status: STATUS_CODE.SUCCESS,
      message: "user has been deleted",
    });
  } catch (error) {
    next(error);
  }
};

// export const getUserListings = async (req, res, next) => {
//   if (req.user.userId === req.params.id) {
//     try {
//       const listings = await Listing.find({ userRef: req.params.id });
//       res.status(200).json(listings);
//     } catch (error) {
//       next(error);
//     }
//   } else {
//     return next(new ErrorResponse("You can only view your own listings!", 401));
//   }
// };

export const getUser = async (req, res, next) => {
  try {

    const {userId} = req.params

    const errorInValidation = userManagemntValidator("idOnly", {userId});

  if (errorInValidation !== true) {
    return next(errorInValidation);
  }

    const user = await User.findById(userId);


    if (!user) return next(new ErrorResponse("User not found", 404));

    const { password: pass, ...rest } = user._doc;
const age = calculateAge(user.birthDate);

res.status(200).json({ data: {...rest, age,}, status: STATUS_CODE.SUCCESS,
  message: "user founded successfully", });
  } catch (error) {
    next(error);
  }
};

export const getUsers = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user.isAdmin) {
      return next(
        new ErrorResponse("You are not allowed to see all users", 403)
      );
    }

    const {startIndex, limit, sort} = req.query

    const errorInValidation = userManagemntValidator("getUsers", {startIndex, limit, sort});

  if (errorInValidation !== true) {
    return next(errorInValidation);
  }


    const safe_startIndex = parseInt(startIndex) || 0;
    const safe_limit = parseInt(limit) || 9;
    const safe_sortDirection = sort === "asc" ? 1 : -1;



    const users = await User.find()
      .sort({ createdAt: safe_sortDirection })
      .skip(safe_startIndex)
      .limit(safe_limit);

      const data = users.map((user) => {
        const { password, ...rest } = user._doc;
        const age = calculateAge(user.birthDate);
        return { ...rest, age };
      });
      

    const totalUsers = await User.countDocuments();

    const now = new Date();

    const oneMonthAgo = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      now.getDate()
    );
    const lastMonthUsers = await User.countDocuments({
      createdAt: { $gte: oneMonthAgo },
    });

    res.status(200).json({
      data,
      status: STATUS_CODE.SUCCESS,
      message: "you edit the comment successfully",
      totalUsers,
      lastMonthUsers,
    });
  } catch (error) {
    next(error);
  }
};

export const searchUser = async (req, res, next) => {
  try {
    const { search } = req.body;

    const query = new RegExp(search, "i", "g");

    const user = await User.find({
      $or: [{ name: query }, { email: query }],
    }).select("-password");

    const data = user.map((user) => {
      const userObj = user._doc;
      const age = calculateAge(user.birthDate);
      return { ...userObj, age };
    });

    return res.json({
      data,
      status: STATUS_CODE.SUCCESS,
      message: "user founded successfully",
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || error,
      error: true,
    });
  }
};

export const userDetails = async (req, res) => {
  try {

    const token = req.cookies["token"] || "";

    const user = await getUserDetailsFromToken(token);
    // console.log("token", token);
    const age = calculateAge(user.birthDate);

    return res.status(200).json({
      data: {...user, age},
      status: STATUS_CODE.SUCCESS,
      message: "user founded successfully",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      message: error.message || error,
      error: true,
    });
  }
};


// Approve user by admin
export const approveUser = async (req, res, next) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);

    if (!user) {
      return next(new ErrorResponse("User not found", 404));
    }

    // Mark user as approved
    user.approved = true;
    await user.save();

    const { password, ...data } = user._doc;

    return res.status(200).json({
      data,
      status: STATUS_CODE.SUCCESS,
      message: "User approved successfully",
    });
  } catch (error) {
    next(error);
  }
};
