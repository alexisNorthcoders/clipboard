const multer = require("multer");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const algorithm = "aes-256-cbc";
const encryptionKey = process.env.ENCRYPTION_KEY ?
  Buffer.from(process.env.ENCRYPTION_KEY, 'hex') :
  // use random encryption key(will change everytime app restarts)
  crypto.randomBytes(32);

const uploadDir = path.join(__dirname, "uploads");
// store file in memory for encryption before saving
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 1024 * 1024 * 10 }, // 10MB
});

async function saveEncryptedFile(fileBuffer, filename) {
  return new Promise((resolve, reject) => {
    const iv = crypto.randomBytes(16); // new IV per file
    const cipher = crypto.createCipheriv(algorithm, encryptionKey, iv);

    const encrypted = Buffer.concat([cipher.update(fileBuffer), cipher.final()]);
    const finalBuffer = Buffer.concat([iv, encrypted]); // prepend IV

    const safeName = path.basename(filename);
    const destPath = path.join(uploadDir, safeName);
    fs.writeFile(destPath, finalBuffer, (err) => {
      if (err) return reject(err);
      resolve(destPath);
    });
  });
}

module.exports = { upload, saveEncryptedFile, encryptionKey, algorithm };