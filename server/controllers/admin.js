import User from "../models/User.js";
import ErrorResponse from "../utils/errorResponse.js";
import getUserDetailsFromToken from "../utils/getUserDetailsFromToken.js";
import userManagemntValidator from "../schema/userManagementValidator.js";
import calculateAge from "../utils/calculateAge.js";

import {STATUS_CODE} from '../utils/httpStatusCode.js'


import dotenv from "dotenv";
import catchAsync from "../utils/catchAsync.js";
dotenv.config();


export const getUnapprovedUsers = catchAsync(async (req, res, next) => {
  // Find all users who are doctors or admins and not yet approved
  const users = await User.find({
    approved: false,
    $or: [{ isDoctor: true }, { isAdmin: true }]
  }).select("-password");

  if (!users || users.length === 0) {
    return next(new ErrorResponse("No unapproved users found", STATUS_CODE.NOT_FOUND));
  }

  return res.status(200).json({
    data: users,
    status: STATUS_CODE.SUCCESS,
    message: "Unapproved users retrieved successfully"
  });
});

export const toggleApprove = catchAsync(async (req, res, next) => {
  const { userId } = req.params;

  const user = await User.findById(userId);

  if (!user) {
    return next(new ErrorResponse("User not found", 404));
  }

  // Toggle the approval status
  user.approved = !user.approved;
  await user.save({validateBeforeSave: false});

  const { password, ...data } = user._doc;

  return res.status(200).json({
    data,
    status: STATUS_CODE.SUCCESS,
    message: user.approved
      ? "User approved successfully"
      : "User disapproved successfully",
  });
});
