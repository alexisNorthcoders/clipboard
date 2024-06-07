const multer = require("multer");
const path = require("node:path");

const storageConfig = multer.diskStorage({
  destination: path.join(__dirname, "uploads"),
  filename: (req, file, res) => {
    res(null, file.originalname);
  },
});

const upload = multer({
  storage: storageConfig,
  limits: {
    fileSize: 1024 * 1024 * 5,
  },
});

module.exports = upload;
