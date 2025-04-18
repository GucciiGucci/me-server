import multer from 'multer';
import path from 'path';
import fs from 'fs';
import cloudinary from '../cloudinary';

// Configure multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, "..", "..", "uploads");
    // Create uploads directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // lowercase the filename
    const filename = file.originalname.toLowerCase().replace(/ /g, "-");
    cb(null, filename + file.fieldname);
  },
});

// Initialize multer upload
export const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept images only
    if (!file.originalname.toLowerCase().match(/\.(jpg|jpeg|png|gif)$/)) {
      return cb(new Error("Only image files are allowed!"));
    }
    cb(null, true);
  },
});

// Single image upload handler
export const uploadSingleImage = async (req: any, res: any) => {
  try {
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        message: "No file uploaded",
      });
    }

    // upload to cloudinary
    const result = await cloudinary.uploader.upload(file.path, {
      folder: "products",
      public_id: file.filename,
      resource_type: "image",
    });

    // remove all files in the uploads directory
    fs.readdir(path.join(__dirname, "..", "..", "uploads"), (err, files) => {
      if (err) {
        console.error("Error reading uploads directory:", err);
        return;
      }
      files.forEach((file) => {
        fs.unlink(path.join(__dirname, "..", "..", "uploads", file), (err) => {
          if (err) {
            console.error("Error deleting file:", err);
          } else {
            console.log(`Deleted file: ${file}`);
          }
        });
      });
    });

    return res.status(200).json({
      message: "File uploaded successfully",
      url: result.secure_url,
      public_id: result.public_id,
      format: result.format,
      width: result.width,
      height: result.height,
      size: result.bytes,
      original_filename: result.original_filename,
    });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({
      message: "Error uploading file",
      error: error.message,
    });
  }
};