export const ResponseCode = {
  CREATED: 201,
  OK: 200,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
};

export enum dbName {
  USER = "user",
  PRODUCT = "product",
  ORDER = "order",
  CATEGORY = "category",
  CART = "cart",
  WISHLIST = "wishlist",
  COLLECTION = "collections",
}
