import express, { Request, Response } from "express";
import { createUser, login } from "./controller/auth";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { 
  createProduct, 
  getCategories, 
  getProducts, 
  updateProduct,
  getProductById,
  deleteProduct
} from "./controller/product";
import { upload, uploadSingleImage } from "./controller/multer";
import {
  createCollection,
  getCollections,
  updateCollection,
  deleteCollection
} from "./controller/collection";

dotenv.config();

const app = express();
const port = 3001;

// Middleware to handle JSON requests
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// allow CORS for all routes
app.use(
  cors({
    origin: "*",
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    preflightContinue: false,
  })
);

// Serve static files from uploads directory
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

// Health check route
app.post("/health", (_, res: Response) => {
  res.status(200).json({
    message: "Server is healthy",
    timestamp: new Date().toISOString(),
  });
});

// Single image upload route
app.post("/upload/image", upload.single("image"), uploadSingleImage);

// auth route
app.post("/auth/signup", createUser);
app.post("/auth/login", login);

// product route
app.post("/product", createProduct);
app.get("/product/categories", getCategories);
app.get("/products", getProducts); // Get all products or products by category
app.get("/product/:id", getProductById);
app.put("/product/:id", updateProduct); // Add the update route
app.delete("/product/:id", deleteProduct); // Add the delete route

// collection routes
app.post("/collection", createCollection); // Create new collection
app.get("/collections", getCollections); // Get all collections
app.put("/collection/:id", updateCollection); // Update collection
app.delete("/collection/:id", deleteCollection); // Delete collection

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: Function) => {
  console.error(err.stack);
  res.status(500).json({
    message: "Something went wrong!",
    error: err.message,
  });
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
