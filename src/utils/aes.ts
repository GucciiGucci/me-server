import crypto from "crypto";

export function encryptString(text: string) {
  if (!text) {
    return text;
  }

  if (typeof text !== "string") {
    throw new Error("text must be a string");
  }

  if (text.length === 0) {
    throw new Error("text must not be empty");
  }

  try {
    if (
      !process.env.AES_PASSWORD ||
      !process.env.AES_SALT ||
      !process.env.AES_COUNTER
    ) {
      throw new Error("Missing required environment variables for encryption");
    }
    const key_256 = crypto.pbkdf2Sync(
      process.env.AES_PASSWORD,
      process.env.AES_SALT,
      1,
      256 / 8,
      "sha512"
    );
    const counter = Buffer.alloc(16);
    counter.writeUInt32BE(Number(process.env.AES_COUNTER), 12);
    const cipher = crypto.createCipheriv("aes-256-ctr", key_256, counter);
    const encryptedData = Buffer.concat([
      cipher.update(text, "utf8"),
      cipher.final(),
    ]);

    return encryptedData.toString("hex");
  } catch (error) {
    console.error({ message: "Encrypt Error", error });
    return text;
  }
}

export function decryptString(encryptedHex: string) {
  if (!encryptedHex || typeof encryptedHex !== "string") {
    return encryptedHex;
  }

  try {
    if (
      !process.env.AES_PASSWORD ||
      !process.env.AES_SALT ||
      !process.env.AES_COUNTER
    ) {
      throw new Error("Missing required environment variables for decryption");
    }
    const key_256 = crypto.pbkdf2Sync(
      process.env.AES_PASSWORD,
      process.env.AES_SALT,
      1,
      256 / 8,
      "sha512"
    );
    const counter = Buffer.alloc(16);
    counter.writeUInt32BE(Number(process.env.AES_COUNTER), 12);
    const decipher = crypto.createDecipheriv("aes-256-ctr", key_256, counter);
    const decryptedData = Buffer.concat([
      decipher.update(encryptedHex, "hex"),
      decipher.final(),
    ]);
    const decryptedText = decryptedData.toString("utf8");

    return decryptedText === "undefined" ? "" : decryptedText;
  } catch (error) {
    console.log({ message: "Decrypt Error", error });

    return encryptedHex;
  }
}
