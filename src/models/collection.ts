/**
 * Interface for Collection model
 */
export interface Collection {
  name: string;
  description: string;
  products: string[];
  images?: string[];
  createdAt?: string;
}