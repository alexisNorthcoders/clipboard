const fs = require("fs").promises;
const path = require("path");
const crypto = require("crypto");
const secret = process.env.SECRET;

const getFileInformation = async (directory) => {
  const files = await fs.readdir(directory);
  const fileInfos = await Promise.all(
    files.map(async (file) => {
      const filePath = path.join(directory, file);
      const stats = await fs.stat(filePath);
      return {
        name: file,
        url: `/uploads/${file}`,
        size: stats.size,
        created: stats.birthtime,
      };
    })
  );
  return fileInfos;
};
function verifySignature(req, res, buf) {
  const signature = `sha256=${crypto.createHmac("sha256", secret).update(buf).digest("hex")}`;
  if (req.headers["x-hub-signature-256"] !== signature) {
    throw new Error("Invalid signature.");
  }
}

module.exports = { getFileInformation, verifySignature };
