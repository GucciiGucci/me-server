// create a function create product

import { db } from "../firebase";
import { dbName, ResponseCode } from "../enum";
import { Product } from "../models/product";
import path from "path";
const fs = require("fs");

export const filePath = path.join(__dirname, "categories.json");

// create product
export const createProduct = async (req: any, res: any): Promise<any> => {
  const {
    name,
    category,
    price,
    stock,
    description,
    sizes,
    images,
    tags,
    newCategories,
  }: Product = req.body;
  if (!name || !category || !price || !stock || !images.length) {
    return res.status(ResponseCode.BAD_REQUEST).json({
      message: "Name, category, price, stock and images are required",
      success: false,
    });
  }

  try {
    const productRef = db.collection(dbName.PRODUCT);
    
    // Check if product with same name already exists
    const nameQuery = await productRef.where("name", "==", name).get();
    if (!nameQuery.empty) {
      return res.status(ResponseCode.CONFLICT).json({
        message: "A product with this name already exists",
        success: false,
      });
    }

    const product = {
      name,
      category,
      price,
      stock,
      description,
      sizes,
      images,
      tags,
    };

    const productDoc = await productRef.add(product);

    // update file ../constants/categories.json
    if (newCategories?.length) {
      // get file path for categories.json

      // Check if file exists
      if (fs.existsSync(filePath)) {
        // File exists - read it and update with new categories
        const data = fs.readFileSync(filePath, "utf8");
        const jsonData = JSON.parse(data);

        // Combine existing categories with new ones (avoiding duplicates)
        const uniqueCategories = [
          ...new Set([...jsonData.categories, ...newCategories]),
        ];

        // Write the updated categories back to the file
        fs.writeFileSync(
          filePath,
          JSON.stringify({ categories: uniqueCategories }, null, 2)
        );
      } else {
        // File doesn't exist - create it with just the new categories
        fs.writeFileSync(
          filePath,
          JSON.stringify({ categories: newCategories }, null, 2)
        );
        console.log("Created new categories file with initial categories");
      }
    }

    return res.status(ResponseCode.CREATED).json({
      message: "Product created successfully",
      productId: productDoc.id,
      success: true,
    });
  } catch (err: any) {
    return res.status(ResponseCode.INTERNAL_SERVER_ERROR).json({
      message: err.message || "Internal server error",
      success: false,
    });
  }
};

/**
 * Get all product categories
 * @param req - Express request object
 * @param res - Express response object
 * @returns Array of category strings
 */
export const getCategories = async (req: any, res: any): Promise<any> => {
  try {
    // Check if categories file exists
    if (!fs.existsSync(filePath)) {
      // If file doesn't exist, return empty array
      return res.status(ResponseCode.OK).json({
        categories: [],
        success: true,
      });
    }

    // Read categories from file
    const data = fs.readFileSync(filePath, "utf8");
    const jsonData = JSON.parse(data);

    return res.status(ResponseCode.OK).json({
      categories: jsonData.categories || [],
      success: true,
    });
  } catch (err: any) {
    console.error("Error reading categories:", err);
    return res.status(ResponseCode.INTERNAL_SERVER_ERROR).json({
      message: err.message || "Error reading categories",
      success: false,
    });
  }
};

/**
 * Get products by category with pagination
 * @param req - Express request object with query parameters for category, limit, and offset
 * @param res - Express response object
 * @returns Paginated array of products in the specified category
 */
export const getProductsByCategory = async (
  req: any,
  res: any
): Promise<any> => {
  try {
    const { category } = req.params;
    const limit = parseInt(req.query.limit) || 10; // Default limit to 10
    const offset = parseInt(req.query.offset) || 0; // Default offset to 0

    if (!category) {
      return res.status(ResponseCode.BAD_REQUEST).json({
        message: "Category parameter is required",
        success: false,
      });
    }

    // Query firestore for products in the category
    let query = db
      .collection(dbName.PRODUCT)
      .where("category", "==", category)
      .orderBy("name") // Order by name (could be changed to other fields)
      .limit(limit)
      .offset(offset);

    const snapshot = await query.get();

    // Check if no products found
    if (snapshot.empty) {
      return res.status(ResponseCode.OK).json({
        products: [],
        totalCount: 0,
        success: true,
      });
    }

    // Map the documents to product objects
    const products = snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Get total count of products in this category (for pagination info)
    const totalCountSnapshot = await db
      .collection(dbName.PRODUCT)
      .where("category", "==", category)
      .count()
      .get();

    const totalCount = totalCountSnapshot.data().count;

    return res.status(ResponseCode.OK).json({
      products,
      totalCount,
      nextOffset: offset + limit < totalCount ? offset + limit : null,
      success: true,
    });
  } catch (err: any) {
    console.error("Error fetching products by category:", err);
    return res.status(ResponseCode.INTERNAL_SERVER_ERROR).json({
      message: err.message || "Error fetching products",
      success: false,
    });
  }
};

/**
 * Get all products with pagination
 * @param req - Express request object with query parameters for limit and offset
 * @param res - Express response object
 * @returns Paginated array of all products
 */
export const getAllProducts = async (req: any, res: any): Promise<any> => {
  try {
    const limit = parseInt(req.query.limit) || 10; // Default limit to 10
    const offset = parseInt(req.query.offset) || 0; // Default offset to 0

    // Query firestore for all products with pagination
    let query = db
      .collection(dbName.PRODUCT)
      .orderBy("name") // Order by name (could be changed to other fields)
      .limit(limit)
      .offset(offset);

    const snapshot = await query.get();

    // Check if no products found
    if (snapshot.empty) {
      return res.status(ResponseCode.OK).json({
        products: [],
        totalCount: 0,
        success: true,
      });
    }

    // Map the documents to product objects
    const products = snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Get total count of all products (for pagination info)
    const totalCountSnapshot = await db
      .collection(dbName.PRODUCT)
      .count()
      .get();

    const totalCount = totalCountSnapshot.data().count;

    return res.status(ResponseCode.OK).json({
      products,
      totalCount,
      nextOffset: offset + limit < totalCount ? offset + limit : null,
      success: true,
    });
  } catch (err: any) {
    console.error("Error fetching all products:", err);
    return res.status(ResponseCode.INTERNAL_SERVER_ERROR).json({
      message: err.message || "Error fetching products",
      success: false,
    });
  }
};

/**
 * Get products with filtering, search, and pagination
 * @param req - Express request object with query parameters
 * @param res - Express response object
 * @returns Filtered and paginated array of products
 */
export const getProducts = async (req: any, res: any): Promise<any> => {
  try {
    // Parse pagination parameters
    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;

    // Parse filter parameters
    const category = req.query.category;
    const search = req.query.search;
    const minPrice = req.query.minPrice
      ? parseFloat(req.query.minPrice)
      : undefined;
    const maxPrice = req.query.maxPrice
      ? parseFloat(req.query.maxPrice)
      : undefined;
    const inStock =
      req.query.inStock !== undefined
        ? req.query.inStock === "true"
        : undefined;

    // Start with a base query
    let query: any = db.collection(dbName.PRODUCT);

    // Apply filters
    if (category) {
      query = query.where("category", "==", category);
    }

    if (minPrice !== undefined) {
      query = query.where("price", ">=", minPrice);
    }

    if (maxPrice !== undefined) {
      query = query.where("price", "<=", maxPrice);
    }

    if (inStock !== undefined) {
      query = inStock
        ? query.where("stock", ">", 0)
        : query.where("stock", "==", 0);
    }

    // Note: For Firestore, we can't do a direct text search without additional indexing
    // For real text search, consider using a solution like Algolia or ElasticSearch
    // This is a simplified implementation

    // Add ordering - name is a safe default
    query = query.orderBy("name");

    // Add pagination
    query = query.limit(limit).offset(offset);

    // Execute the query
    const snapshot = await query.get();

    // Check if no products found
    if (snapshot.empty) {
      return res.status(ResponseCode.OK).json({
        products: [],
        totalCount: 0,
        success: true,
      });
    }

    // Map the documents to product objects
    let products = snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Client-side search filter (not optimal but works for small datasets)
    // Ideally this would be handled by a proper search engine
    if (search) {
      const searchLower = search.toLowerCase();
      products = products.filter(
        (product: any) =>
          product.name.toLowerCase().includes(searchLower) ||
          (product.description &&
            product.description.toLowerCase().includes(searchLower)) ||
          (product.tags &&
            product.tags.some((tag: string) =>
              tag.toLowerCase().includes(searchLower)
            ))
      );
    }

    // For a more accurate count, we should replicate the filtering without pagination
    // This is a simplified implementation - in a real app you might want to optimize this
    let countQuery: any = db.collection(dbName.PRODUCT);

    if (category) {
      countQuery = countQuery.where("category", "==", category);
    }

    if (minPrice !== undefined) {
      countQuery = countQuery.where("price", ">=", minPrice);
    }

    if (maxPrice !== undefined) {
      countQuery = countQuery.where("price", "<=", maxPrice);
    }

    if (inStock !== undefined) {
      countQuery = inStock
        ? countQuery.where("stock", ">", 0)
        : countQuery.where("stock", "==", 0);
    }

    const totalCountSnapshot = await countQuery.count().get();
    const totalCount = totalCountSnapshot.data().count;

    return res.status(ResponseCode.OK).json({
      products,
      totalCount,
      nextOffset: offset + products.length < totalCount ? offset + limit : null,
      success: true,
    });
  } catch (err: any) {
    console.error("Error fetching products:", err);
    return res.status(ResponseCode.INTERNAL_SERVER_ERROR).json({
      message: err.message || "Error fetching products",
      success: false,
    });
  }
};

/**
 * Update an existing product
 * @param req - Express request object with product data and ID parameter
 * @param res - Express response object
 * @returns Updated product data or error message
 */
export const updateProduct = async (req: any, res: any): Promise<any> => {
  try {
    const productId = req.params.id;

    if (!productId) {
      return res.status(ResponseCode.BAD_REQUEST).json({
        message: "Product ID is required",
        success: false,
      });
    }

    const {
      name,
      category,
      price,
      stock,
      description,
      sizes,
      images,
      tags,
      newCategories,
    }: Product = req.body;

    // Create update object with only fields that exist in request body
    const updateData: Partial<Product> = {};

    if (name !== undefined) updateData.name = name;
    if (category !== undefined) updateData.category = category;
    if (price !== undefined) updateData.price = price;
    if (stock !== undefined) updateData.stock = stock;
    if (description !== undefined) updateData.description = description;
    if (sizes !== undefined) updateData.sizes = sizes;
    if (images !== undefined) updateData.images = images;
    if (tags !== undefined) updateData.tags = tags;

    // Check if the product exists
    const productRef = db.collection(dbName.PRODUCT).doc(productId);
    const productDoc = await productRef.get();

    if (!productDoc.exists) {
      return res.status(ResponseCode.NOT_FOUND).json({
        message: `Product with ID ${productId} not found`,
        success: false,
      });
    }

    // If name is being updated, check if another product already has this name
    if (name !== undefined && name !== productDoc.data()?.name) {
      const nameQuery = await db
        .collection(dbName.PRODUCT)
        .where("name", "==", name)
        .get();
      
      // If any other product has this name, reject the update
      if (!nameQuery.empty) {
        return res.status(ResponseCode.CONFLICT).json({
          message: "A product with this name already exists",
          success: false,
        });
      }
    }

    // Update the product
    await productRef.update(updateData);

    // Handle category updates if there are new categories
    if (newCategories?.length) {
      // Check if categories file exists
      if (fs.existsSync(filePath)) {
        // File exists - read it and update with new categories
        const data = fs.readFileSync(filePath, "utf8");
        const jsonData = JSON.parse(data);

        // Combine existing categories with new ones (avoiding duplicates)
        const uniqueCategories = [
          ...new Set([...jsonData.categories, ...newCategories]),
        ];

        // Write the updated categories back to the file
        fs.writeFileSync(
          filePath,
          JSON.stringify({ categories: uniqueCategories }, null, 2)
        );
      } else {
        // File doesn't exist - create it with just the new categories
        fs.writeFileSync(
          filePath,
          JSON.stringify({ categories: newCategories }, null, 2)
        );
        console.log("Created new categories file with initial categories");
      }
    }

    // Get the updated product
    const updatedProductDoc = await productRef.get();
    const updatedProduct = {
      id: updatedProductDoc.id,
      ...updatedProductDoc.data(),
    };

    return res.status(ResponseCode.OK).json({
      message: "Product updated successfully",
      product: updatedProduct,
      success: true,
    });
  } catch (err: any) {
    console.error("Error updating product:", err);
    return res.status(ResponseCode.INTERNAL_SERVER_ERROR).json({
      message: err.message || "Error updating product",
      success: false,
    });
  }
};

/**
 * Get a single product by ID
 * @param req - Express request object with product ID parameter
 * @param res - Express response object
 * @returns Product data or error message
 */
export const getProductById = async (req: any, res: any): Promise<any> => {
  try {
    const productId = req.params.id;

    if (!productId) {
      return res.status(ResponseCode.BAD_REQUEST).json({
        message: "Product ID is required",
        success: false,
      });
    }

    const productRef = db.collection(dbName.PRODUCT).doc(productId);
    const productDoc = await productRef.get();

    if (!productDoc.exists) {
      return res.status(ResponseCode.NOT_FOUND).json({
        message: `Product with ID ${productId} not found`,
        success: false,
      });
    }

    const product = {
      id: productDoc.id,
      ...productDoc.data(),
    };

    return res.status(ResponseCode.OK).json({
      product,
      success: true,
    });
  } catch (err: any) {
    console.error("Error fetching product by ID:", err);
    return res.status(ResponseCode.INTERNAL_SERVER_ERROR).json({
      message: err.message || "Error fetching product",
      success: false,
    });
  }
};

/**
 * Delete a product by ID
 * @param req - Express request object with product ID parameter
 * @param res - Express response object
 * @returns Success message or error
 */
export const deleteProduct = async (req: any, res: any): Promise<any> => {
  try {
    const productId = req.params.id;

    if (!productId) {
      return res.status(ResponseCode.BAD_REQUEST).json({
        message: "Product ID is required",
        success: false,
      });
    }

    // Check if the product exists
    const productRef = db.collection(dbName.PRODUCT).doc(productId);
    const productDoc = await productRef.get();

    if (!productDoc.exists) {
      return res.status(ResponseCode.NOT_FOUND).json({
        message: `Product with ID ${productId} not found`,
        success: false,
      });
    }

    // Delete the product
    await productRef.delete();

    return res.status(ResponseCode.OK).json({
      message: `Product with ID ${productId} deleted successfully`,
      success: true,
    });
  } catch (err: any) {
    console.error("Error deleting product:", err);
    return res.status(ResponseCode.INTERNAL_SERVER_ERROR).json({
      message: err.message || "Error deleting product",
      success: false,
    });
  }
};
