import express from "express";
import dotenv from "dotenv";
dotenv.config();

import cors from "cors";
import multer from "multer";
import bodyParser from "body-parser";
import { fileURLToPath } from "url";
import path from "path";
import cookieParser from "cookie-parser";

import connectDB from "./config/connectDB.js";

import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/user.js";
import bookRoutes from "./routes/book.js";
import commentRoutes from "./routes/comment.js";
// import aiChatRoutes from "./routes/aichat.js";
import {server, app} from './socket/index.js'
import errorHandler from "./middleware/errorHandler.js";

connectDB();
const PORT = process.env.PORT || 3000;
app.use(express.json());
app.use(cors({

  origin : 'http://localhost:5173',
  credentials : true
}))
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser())


// Set storage engine
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname); // Get the file extension
    cb(null, file.fieldname + '-' + uniqueSuffix + ext); // Append the file extension
  }
});
// Initialize upload variable
const upload = multer({ storage: storage });

// Endpoint for uploading files
app.post('/api/upload', upload.single('file'), (req, res) => {
  try {
    res.status(200).json({ url: process.env.BASE_URL + "/${req.file.filename}"});
  } catch (error) {
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

// Define __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Set static folder for profile images.
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

app.use("/api/auth/users", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/books", bookRoutes);
app.use("/api/comments", commentRoutes);
// app.use("/api/aichats", aiChatRoutes);

app.all("*", (req, res) => {
  res.status(404).json({ status: "error", message: "resource not availble" })
})

app.use(errorHandler);


server.listen(PORT, () => {
  console.log("Server is running on port 3000!");
});


export default app; // ES modules export