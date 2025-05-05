import User from "../models/User.js";
import ErrorResponse from "../utils/errorResponse.js";
import getUserDetailsFromToken from "../utils/getUserDetailsFromToken.js";
import userManagemntValidator from "../schema/userManagementValidator.js";
import calculateAge from "../utils/calculateAge.js";

import {STATUS_CODE} from '../utils/httpStatusCode.js'


import dotenv from "dotenv";
import catchAsync from "../utils/catchAsync.js";
dotenv.config();


// Approve user by admin
export const approveUser = catchAsync(async (req, res, next) => {
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

});
