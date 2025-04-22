import express from 'express';
import verifyToken  from '../utils/verifyUser.js';
import upload from '../config/upload.js';
import { createBook, deleteBook, getBook, getBooks, updateBook, uploadImage } from '../controllers/books.js';

const router = express.Router();
router.post("/upload",  upload.array('images', 6), uploadImage)
router.post('/create', upload.array('images', 6), verifyToken, createBook);
router.delete('/delete/:id', verifyToken, deleteBook);
router.post('/update/:id', verifyToken, updateBook);
router.get('/get', getBooks);
router.get('/get/:id', getBook);


export default router;
