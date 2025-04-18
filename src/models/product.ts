// Update the Product type to include collection and tags
export type Product = {
  id: number;
  name: string;
  category: string;
  price: number;
  stock: number;
  description?: string;
  sizes?: string;
  color?: string;
  images: any[];
  collection?: string;
  tags?: string;
  newCategories?: string[];
};

export type ProductImage = {
  name: string;
  url: string;
};
