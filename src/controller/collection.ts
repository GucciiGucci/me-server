import { db } from "../firebase";
import { dbName, ResponseCode } from "../enum";
import { Collection } from "../models/collection";

/**
 * Create a new collection
 * @param req - Express request object with collection data in request body
 * @param res - Express response object
 * @returns New collection data or error message
 */
export const createCollection = async (req: any, res: any): Promise<any> => {
  try {
    const { name, description, products, images }: Collection = req.body;
    
    // Check required fields
    if (!name || !products || !Array.isArray(products) || products.length === 0) {
      return res.status(ResponseCode.BAD_REQUEST).json({
        message: "Name and at least one product ID are required",
        success: false,
      });
    }
    
    // Check name length
    if (name.length > 50) {
      return res.status(ResponseCode.BAD_REQUEST).json({
        message: "Collection name cannot exceed 50 characters",
        success: false,
      });
    }

    // Check if a collection with the same name already exists
    const nameQuery = await db.collection(dbName.COLLECTION)
      .where("name", "==", name)
      .get();
    
    if (!nameQuery.empty) {
      return res.status(ResponseCode.CONFLICT).json({
        message: "A collection with this name already exists",
        success: false,
      });
    }

    // Verify all product IDs exist
    const productPromises = products.map(productId => 
      db.collection(dbName.PRODUCT).doc(productId).get()
    );
    
    const productResults = await Promise.all(productPromises);
    const nonExistingProducts = productResults.filter(doc => !doc.exists);
    
    if (nonExistingProducts.length > 0) {
      return res.status(ResponseCode.BAD_REQUEST).json({
        message: "One or more product IDs do not exist",
        invalidProducts: products.filter((_, index) => !productResults[index].exists),
        success: false,
      });
    }

    const collectionRef = db.collection(dbName.COLLECTION);
    
    const newCollection: Collection = {
      name,
      description: description || "",
      products,
      createdAt: new Date().toISOString(),
    };

    // Add images array if it exists
    if (images && Array.isArray(images)) {
      newCollection.images = images;
    }

    const collectionDoc = await collectionRef.add(newCollection);

    return res.status(ResponseCode.CREATED).json({
      message: "Collection created successfully",
      collection: {
        id: collectionDoc.id,
        ...newCollection,
      },
      success: true,
    });
  } catch (err: any) {
    console.error("Error creating collection:", err);
    return res.status(ResponseCode.INTERNAL_SERVER_ERROR).json({
      message: err.message || "Error creating collection",
      success: false,
    });
  }
};

/**
 * Get all collections
 * @param req - Express request object
 * @param res - Express response object
 * @returns Array of collections
 */
export const getCollections = async (req: any, res: any): Promise<any> => {
  try {
    const collectionsRef = db.collection(dbName.COLLECTION);
    const snapshot = await collectionsRef.get();

    if (snapshot.empty) {
      return res.status(ResponseCode.OK).json({
        collections: [],
        success: true,
      });
    }

    const collections = snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return res.status(ResponseCode.OK).json({
      collections,
      success: true,
    });
  } catch (err: any) {
    console.error("Error fetching collections:", err);
    return res.status(ResponseCode.INTERNAL_SERVER_ERROR).json({
      message: err.message || "Error fetching collections",
      success: false,
    });
  }
};

/**
 * Get a collection by ID
 * @param req - Express request object with collection ID parameter
 * @param res - Express response object
 * @returns Collection data with full product details
 */
export const getCollectionById = async (req: any, res: any): Promise<any> => {
  try {
    const collectionId = req.params.id;

    if (!collectionId) {
      return res.status(ResponseCode.BAD_REQUEST).json({
        message: "Collection ID is required",
        success: false,
      });
    }

    const collectionRef = db.collection(dbName.COLLECTION).doc(collectionId);
    const collectionDoc = await collectionRef.get();

    if (!collectionDoc.exists) {
      return res.status(ResponseCode.NOT_FOUND).json({
        message: `Collection with ID ${collectionId} not found`,
        success: false,
      });
    }

    const collectionData = collectionDoc.data();
    const productIds = collectionData?.products || [];

    // Get the complete product data for each product in the collection
    const productPromises = productIds.map((productId: string) => 
      db.collection(dbName.PRODUCT).doc(productId).get()
    );
    
    const productResults = await Promise.all(productPromises);
    const productDetails = productResults
      .filter(doc => doc.exists)
      .map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

    return res.status(ResponseCode.OK).json({
      collection: {
        id: collectionDoc.id,
        ...collectionData,
        productDetails, // Add full product details
      },
      success: true,
    });
  } catch (err: any) {
    console.error("Error fetching collection:", err);
    return res.status(ResponseCode.INTERNAL_SERVER_ERROR).json({
      message: err.message || "Error fetching collection",
      success: false,
    });
  }
};

/**
 * Update a collection by ID
 * @param req - Express request object with collection ID parameter and updated data
 * @param res - Express response object
 * @returns Updated collection data
 */
export const updateCollection = async (req: any, res: any): Promise<any> => {
  try {
    const collectionId = req.params.id;

    if (!collectionId) {
      return res.status(ResponseCode.BAD_REQUEST).json({
        message: "Collection ID is required",
        success: false,
      });
    }

    const { name, description, products, images } = req.body;
    const updateData: Partial<Collection> = {};

    // Check name length if name is being updated
    if (name !== undefined) {
      if (name.length > 50) {
        return res.status(ResponseCode.BAD_REQUEST).json({
          message: "Collection name cannot exceed 50 characters",
          success: false,
        });
      }
      
      // Check if a collection with this name already exists (excluding current collection)
      const nameQuery = await db.collection(dbName.COLLECTION)
        .where("name", "==", name)
        .get();
      
      const duplicates = nameQuery.docs.filter((doc: any) => doc.id !== collectionId);
      if (duplicates.length > 0) {
        return res.status(ResponseCode.CONFLICT).json({
          message: "A collection with this name already exists",
          success: false,
        });
      }
      
      updateData.name = name;
    }

    if (description !== undefined) updateData.description = description;
    if (images !== undefined) updateData.images = images;
    
    if (products !== undefined) {
      if (!Array.isArray(products) || products.length === 0) {
        return res.status(ResponseCode.BAD_REQUEST).json({
          message: "Products must be an array with at least one product ID",
          success: false,
        });
      }
      
      // Verify all product IDs exist
      const productPromises = products.map(productId => 
        db.collection(dbName.PRODUCT).doc(productId).get()
      );
      
      const productResults = await Promise.all(productPromises);
      const nonExistingProducts = productResults.filter(doc => !doc.exists);
      
      if (nonExistingProducts.length > 0) {
        return res.status(ResponseCode.BAD_REQUEST).json({
          message: "One or more product IDs do not exist",
          invalidProducts: products.filter((_, index) => !productResults[index].exists),
          success: false,
        });
      }
      
      updateData.products = products;
    }

    // Check if collection exists
    const collectionRef = db.collection(dbName.COLLECTION).doc(collectionId);
    const collectionDoc = await collectionRef.get();

    if (!collectionDoc.exists) {
      return res.status(ResponseCode.NOT_FOUND).json({
        message: `Collection with ID ${collectionId} not found`,
        success: false,
      });
    }

    await collectionRef.update(updateData);

    // Get the updated collection
    const updatedCollectionDoc = await collectionRef.get();
    const updatedCollection = {
      id: updatedCollectionDoc.id,
      ...updatedCollectionDoc.data(),
    };

    return res.status(ResponseCode.OK).json({
      message: "Collection updated successfully",
      collection: updatedCollection,
      success: true,
    });
  } catch (err: any) {
    console.error("Error updating collection:", err);
    return res.status(ResponseCode.INTERNAL_SERVER_ERROR).json({
      message: err.message || "Error updating collection",
      success: false,
    });
  }
};

/**
 * Delete a collection by ID
 * @param req - Express request object with collection ID parameter
 * @param res - Express response object
 * @returns Success message or error
 */
export const deleteCollection = async (req: any, res: any): Promise<any> => {
  try {
    const collectionId = req.params.id;

    if (!collectionId) {
      return res.status(ResponseCode.BAD_REQUEST).json({
        message: "Collection ID is required",
        success: false,
      });
    }

    // Check if collection exists
    const collectionRef = db.collection(dbName.COLLECTION).doc(collectionId);
    const collectionDoc = await collectionRef.get();

    if (!collectionDoc.exists) {
      return res.status(ResponseCode.NOT_FOUND).json({
        message: `Collection with ID ${collectionId} not found`,
        success: false,
      });
    }

    // Delete the collection
    await collectionRef.delete();

    return res.status(ResponseCode.OK).json({
      message: `Collection with ID ${collectionId} deleted successfully`,
      success: true,
    });
  } catch (err: any) {
    console.error("Error deleting collection:", err);
    return res.status(ResponseCode.INTERNAL_SERVER_ERROR).json({
      message: err.message || "Error deleting collection",
      success: false,
    });
  }
};