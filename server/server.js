import express from "express";
import cors from "cors";
import uploadRouter from "./uploadToIPFS.js";
import dotenv from "dotenv";
dotenv.config();  

const app = express();
app.use(cors());
app.use(express.json());

// API route for uploading to Pinata
app.use("/api", uploadRouter);


app.listen(5000, () => console.log("✅ Server running on http://localhost:5000"));

