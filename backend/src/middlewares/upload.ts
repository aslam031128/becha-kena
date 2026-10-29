import multer from 'multer';
import { Request } from 'express';
import { BadRequestError } from '../errors/ValidationError.js';
import { ErrorCodes } from '../constants/errorCodes.js';

// Use MemoryStorage so that raw buffers are immediately encrypted / processed
// and sensitive identity photos never touch unencrypted local disks.
const storage = multer.memoryStorage();

const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];

const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
): void => {
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new BadRequestError(
        `Invalid file type: ${file.mimetype}. Allowed types are image/jpeg, image/png, image/webp`,
        ErrorCodes.VALIDATION_ERROR
      )
    );
  }
};

export const uploadOcr = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5 MB max per file
  },
  fileFilter
});

export const ocrUploadFields = uploadOcr.fields([
  { name: 'frontImage', maxCount: 1 },
  { name: 'backImage', maxCount: 1 }
]);
