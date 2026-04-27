const fs = require("fs");
const path = require("path");
const multer = require("multer");
const { randomUUID } = require("crypto");
const env = require("../config/env");

const uploadsDir = path.join(env.rootDir, "uploads", "media");
const allowedMimeTypes = new Set(["image/jpeg", "image/png", "video/mp4"]);
const maxUploadSizeBytes = Math.floor(1.5 * 1024 * 1024 * 1024);

fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    callback(null, uploadsDir);
  },
  filename: (_req, file, callback) => {
    const extension = path.extname(file.originalname || "").toLowerCase();
    callback(null, `${randomUUID()}${extension}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: maxUploadSizeBytes
  },
  fileFilter: (_req, file, callback) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      callback(new Error("Invalid file type."));
      return;
    }

    callback(null, true);
  }
});

async function removeStoredFile(fileUrl) {
  if (!fileUrl) {
    return;
  }

  const normalized = fileUrl.replace(/^\/+/, "");
  const absolutePath = path.join(env.rootDir, normalized);

  try {
    await fs.promises.unlink(absolutePath);
  } catch (error) {
    if (error && error.code !== "ENOENT") {
      throw error;
    }
  }
}

module.exports = {
  allowedMimeTypes,
  maxUploadSizeBytes,
  upload,
  removeStoredFile
};
