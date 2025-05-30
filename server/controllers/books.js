import dotenv from "dotenv";
dotenv.config();

import Book from '../models/Book.js';
import ErrorResponse from '../utils/errorResponse.js';
import upload from '../config/upload.js';
import User from '../models/User.js';
import bookManagemntValidator from '../schema/bookManagementValidator.js';

import {STATUS_CODE} from "../utils/httpStatusCode.js"
import catchAsync from "../utils/catchAsync.js";




// Create Listing Endpoint with Multer Middleware
export const createBook = catchAsync(async (req, res, next) => {

    // const { name, email } = req.body;

    
    
    const errorInValidation = bookManagemntValidator("create", req.body);
    
    if (errorInValidation !== true) {
      return next(errorInValidation);
    }
    
    const imageUrls = req.files ? req.files.map(file => process.env.BASE_URL + `/uploads/${file.filename}`) : [];
    
    // Handle file upload
    upload.array('images', 6)(req, res, async (err) => {
      if (err) {
        return next(err);
      }

      
      // Collect image URLs
      

      // Create listing document
      const data = await Book.create({
        imageUrls,
        ...req.body
      }
      );

      return res.status(201).json({data, status: STATUS_CODE.SUCCESS, message: "book created successfully" });
    });

});

export const uploadImage = catchAsync((req, res) => {
  
  try {

    const data = req.files ? req.files.map(file => process.env.BASE_URL + `http/uploads/${file.filename}`) : [];
    res.json({ data, message: "book deleted successfully ", status: STATUS_CODE.SUCCESS });
  } catch (error) {
    res.status(500).json({ error: 'Image upload failed' });
  }
});


export const deleteBook = catchAsync(async (req, res, next) => {

  const {id} = req.params

    const errorInValidation = bookManagemntValidator("idOnly", {id});

  if (errorInValidation !== true) {
    return next(errorInValidation);
  }
  

  const book = await Book.findById(id);

  if (!book) {
    return next(new ErrorResponse('book not found!', 404));
  }
  const user = await User.findById(req.user.userId)

  

  const isAdmin = user?.isAdmin


  if (req.user.userId !== book.userRef && !isAdmin ) {
    return next(new ErrorResponse('You can only delete your own listings!', 401));
  }

  if(user?.isAdmin && !user?.approved) {
    return next(new ErrorResponse("You need to be approved first to delete books you haven't created!", 401));
  }

  try {
    await Book.findByIdAndDelete(req.params.id);
    res.status(200).json({message: "book deleted successfully ", status: STATUS_CODE.SUCCESS});
  } catch (error) {
    next(error);
  }
});


export const updateBook = catchAsync(async (req, res, next) => {

  const {id} = req.params

    const errorInValidation = bookManagemntValidator("idOnly", {id});

  if (errorInValidation !== true) {
    return next(errorInValidation);
  }

  const bookFounded = await Book.findById(id);
  if (!bookFounded) {
    return next(new ErrorResponse('book not found!', 404));
  }
  const user = await User.findById(req.user.userId)
  const isAdmin = user.isAdmin

  if (req.user.userId !== bookFounded.userRef && !isAdmin) {
    return next(new ErrorResponse('You can only update your own listings!', 401));
  }

  if(user?.isAdmin && !user?.approved) {
    return next(new ErrorResponse("You need to be approved first to update books you haven't created!", 401));
  }

  try {
    const data = await Book.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    res.status(200).json({data, status: STATUS_CODE.SUCCESS, message: "book updated successfully"});
  } catch (error) {
    next(error);
  }
});


export const getBook = catchAsync(async (req, res, next) => {

    const {id} = req.params

    const errorInValidation = bookManagemntValidator("idOnly", {id});

  if (errorInValidation !== true) {
    return next(errorInValidation);
  }

    const data = await Book.findById(id);
    if (!data) {
      return next(new ErrorResponse('book not found!', 404));
    }
    res.status(200).json({data, status: STATUS_CODE.SUCCESS, message: "book founded successfully"});
});


export const getBooks = catchAsync(async (req, res, next) => {
    

    const {limit, startIndex, offer, searchTerm,  sort, order} = req.query

    const errorInValidation = bookManagemntValidator("getBooks", {limit, startIndex, offer, searchTerm,  sort, order});

  if (errorInValidation !== true) {
    return next(errorInValidation);
  }

    const safe_limit = parseInt(limit) || 5;
    const safe_startIndex = parseInt(startIndex) || 0;
    let safe_offer = offer;

    if (safe_offer === undefined) {
      safe_offer = { $in: [false, true] };
    } else {
      safe_offer = safe_offer === 'true';
    }
    let safe_searchTerm = searchTerm || '';

    if (searchTerm == '' || searchTerm == "") {
      safe_searchTerm = ''
    }

    console.log(safe_searchTerm)

    const safe_sort = sort || 'createdAt';

    const safe_order = order || 'desc';

    const data = await Book.find({
      title: { $regex: safe_searchTerm, $options: 'i' },
      offer: safe_offer,
    })
      .sort({ [safe_sort]: safe_order })
      .limit(safe_limit)
      .skip(safe_startIndex);

      const totalPosts = await Book.countDocuments();

      const now = new Date();
  
      const oneMonthAgo = new Date(
        now.getFullYear(),
        now.getMonth() - 1,
        now.getDate()
      );
  
      const lastMonthPosts = await Book.countDocuments({
        createdAt: { $gte: oneMonthAgo },
      });
  
      return res.status(200).json({
        data,
        status: STATUS_CODE.SUCCESS,
        message: "books recieved successfully",
        totalPosts,
        lastMonthPosts,
      });

    // return res.status(200).json(listings);
});
