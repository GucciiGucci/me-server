// create a new user
import { Request, Response } from "express";
import { comparePassword, generateToken, hashPassword } from "../utils/auth";
import { db } from "../firebase";
import { dbName, ResponseCode } from "../enum";
import { encryptString } from "../utils/aes";

// create user
export const createUser = async (req: Request, res: Response): Promise<any> => {
  const { username, password, email, confirmPassword, role, provider } =
    req.body;
  if (!username || !password) {
    return res
      .status(ResponseCode.BAD_REQUEST)
      .json({ message: "Username and password are required" });
  }

  if (password !== confirmPassword) {
    return res
      .status(ResponseCode.BAD_REQUEST)
      .json({ message: "Passwords do not match" });
  }

  try {
    const hashedEmail = encryptString(email);

    // Check if user already exists
    const collectionRef = db.collection(dbName.USER);

    const userSnapshot = await collectionRef
      .where("email", "==", hashedEmail)
      .get();

    if (!userSnapshot.empty) {
      return res
        .status(ResponseCode.BAD_REQUEST)
        .json({ message: "User already exists", success: false });
    }

    const hashedPassword = hashPassword(password);

    const docRef = await collectionRef.add({
      email: hashedEmail,
      username,
      password: hashedPassword,
      provider: provider || "local",
      role: role || "user",
      createdAt: new Date(),
    });
    const token = generateToken({ userId: docRef.id });
    return res.status(ResponseCode.CREATED).json({
      token,
      userData: { username, email, role },
      success: true,
    });
  } catch (err: any) {
    return res.status(ResponseCode.INTERNAL_SERVER_ERROR).json({
      message: err.message || "Internal server error",
      success: false,
    });
  }
};

// login user
export const login = async (req: Request, res: Response): Promise<any> => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res
      .status(ResponseCode.BAD_REQUEST)
      .json({ message: "Email and password are required" });
  }

  try {
    const hashedEmail = encryptString(email);

    // Check if user exists
    const collectionRef = db.collection(dbName.USER);
    const userSnapshot = await collectionRef
      .where("email", "==", hashedEmail)
      .get();

    if (userSnapshot.empty) {
      return res
        .status(ResponseCode.BAD_REQUEST)
        .json({ message: "User does not exist", success: false });
    }

    const userData = userSnapshot.docs[0].data();
    const isPasswordValid = comparePassword(
      password,
      userData.password
    );

    if (!isPasswordValid) {
      return res
        .status(ResponseCode.BAD_REQUEST)
        .json({ message: "Invalid password", success: false });
    }

    const token = generateToken({ userId: userSnapshot.docs[0].id });
    return res.status(ResponseCode.OK).json({
      token,
      userData: { ...userData, id: userSnapshot.docs[0].id },
      success: true,
    });
  } catch (err: any) {
    return res.status(ResponseCode.INTERNAL_SERVER_ERROR).json({
      message: err.message || "Internal server error",
      success: false,
    });
  }
}


