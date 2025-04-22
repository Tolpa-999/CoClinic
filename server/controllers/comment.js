import ErrorResponse from "../utils/errorResponse.js";
import Comment from "../models/Comment.js";
import User from "../models/User.js";

import commentManagementValidator from "../schema/commentManagmentValidator.js";

import {STATUS_CODE} from "../utils/httpStatusCode.js"


export const createComment = async (req, res, next) => {
  try {
    const { content, postId, userId } = req.body;

        const errorInValidation = commentManagementValidator("create", req.body);
    
      if (errorInValidation !== true) {
        return next(errorInValidation);
      }


      console.log("user Id and req.user.userId ======> ", userId, " ---------- ", req.user.userId)

    if (userId !== req.user.userId) {
      return next(
        new ErrorResponse("You are not allowed to create this comment", 403)
      );
    }

    const data = new Comment({
      content,
      postId,
      userId,
    });
    await data.save();

    res.status(200).json({data, 
      status: STATUS_CODE.SUCCESS,
      message: "comment created successfully",});
  } catch (error) {
    next(error);
  }
};

export const getPostComments = async (req, res, next) => {
  try {

    const {startIndex, limit} = req.query

    const errorInValidation = commentManagementValidator("getPostComments", {startIndex, limit});
    
      if (errorInValidation !== true) {
        return next(errorInValidation);
      }
    
    const safe_startIndex = parseInt(req.query.startIndex) || 0;

    const safe_limit = parseInt(req.query.limit) || 2;

    const data = await Comment.find({ postId: req.params.postId })
      .sort({ createdAt: -1 })
      .skip(safe_startIndex)
      .limit(safe_limit);

    return res.status(200).json({data, status: STATUS_CODE.SUCCESS,
      message: "all comments on this post",});
  } catch (error) {
    next(error);
  }
};

export const likeComment = async (req, res, next) => {
  try {
    const data = await Comment.findById(req.params.id);
    if (!data) {
      return next(new ErrorResponse("Comment not found", 404));
    }
    const userIndex = data.likes.indexOf(req.user.userId);
    if (userIndex === -1) {
      data.numberOfLikes += 1;
      data.likes.push(req.user.userId);
    } else {
      data.numberOfLikes -= 1;
      data.likes.splice(userIndex, 1);
    }
    await data.save();
    res.status(200).json({
      data,
      status: STATUS_CODE.SUCCESS,
      message: "the comment has been liked successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const editComment = async (req, res, next) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) {
      return next(new ErrorResponse("Comment not found", 404));
    }
    const userIn = await User.findById(req.user.userId)

    if (comment.userId !== req.user.userId && !userIn.isAdmin) {
      return next(
        new ErrorResponse("You are not allowed to edit this comment", 403)
      );
    }

    const editedComment = await Comment.findByIdAndUpdate(
      req.params.id,
      {
        content: req.body.content,
      },
      { new: true }
    );
    res.status(200).json({
      editedComment,
      status: STATUS_CODE.SUCCESS,
        message: "the comment edit successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const deleteComment = async (req, res, next) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) {
      return next(new ErrorResponse("Comment not found", 404));
    }
    const userIn = await User.findById(req.user.userId)
    if (comment.userId !== req.user.userId && !userIn.isAdmin) {
      return next(
        new ErrorResponse("You are not allowed to delete this comment", 403)
      );
    }
    await Comment.findByIdAndDelete(req.params.id);
    res.status(200).json({
      status: STATUS_CODE.SUCCESS,
        message: "the comment deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const getcomments = async (req, res, next) => {
  try {
    if (!req.user.userId)
      return next(
        new ErrorResponse("You are not allowed to get all comments", 403)
      );
    const user = await User.findById(req.user.userId);
    if (!user.isAdmin) {
      return next(
        new ErrorResponse("You are not allowed to get all comments", 403)
      );
    }

    const startIndex = parseInt(req.query.startIndex) || 0;
    const limit = parseInt(req.query.limit) || 9;
    const sortDirection = req.query.sort === "desc" ? -1 : 1;
    const data = await Comment.find()
      .sort({ createdAt: sortDirection })
      .skip(startIndex)
      .limit(limit);
    const totalComments = await Comment.countDocuments();
    const now = new Date();
    const oneMonthAgo = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      now.getDate()
    );
    const lastMonthComments = await Comment.countDocuments({
      createdAt: { $gte: oneMonthAgo },
    });
    res.status(200).json({ data, totalComments, lastMonthComments, status: STATUS_CODE.SUCCESS,
      message: "all comments", });
  } catch (error) {
    next(error);
  }
};
