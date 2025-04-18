// generate hash func
import crypto from "crypto";
import jwt, { Secret } from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "local";

// Hash password function
export const hashPassword = (password: string): string => {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto
    .pbkdf2Sync(password, salt, 1000, 64, "sha512")
    .toString("hex");
  return `${salt}:${hash}`;
};

// generate token function using jwt
export function generateToken(
  payload: object,
  expiresIn: string = "24h"
): string {
  return jwt.sign(payload, JWT_SECRET as any, { expiresIn } as any);
}

// compare password function
export const comparePassword = (
  password: string,
  hashedPassword: string
): boolean => {
  const [salt, key] = hashedPassword.split(":");
  const hash = crypto
    .pbkdf2Sync(password, salt, 1000, 64, "sha512")
    .toString("hex");
  return hash === key;
}
