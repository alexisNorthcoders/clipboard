const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const upload = require("./multer");
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const storageConfig = multer.diskStorage({
  destination: path.join(__dirname, "uploads"),
  filename: (req, file, res) => {
    res(null, Date.now() + "-" + file.originalname);
  },
});

app.use(express.json());
app.use(express.static("public"));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.get("/upload", (req, res) => {
  const uploadDir = path.join(__dirname, "uploads");

  fs.readdir(uploadDir, (err, files) => {
    if (err) {
      console.error("Error reading directory:", err);
      return res.status(500).json({ error: "Error reading directory" });
    }
    res.json({ files });
  });
});
app.post("/upload", upload.single("file"), (req, res) => {
  if (!req.file ) {
    return res.status(400).json({ error: "No file uploaded" });
  }
  res.status(201).json("Files uploaded successfully");
});

let currentClipboardData = "";

io.on("connection", (socket) => {
  console.log("A user connected");
  socket.emit("clipboard", currentClipboardData);

  socket.on("clipboard", (data) => {
    console.log("Clipboard data received:", data);
    currentClipboardData = data;

    socket.broadcast.emit("clipboard", data);
  });

  socket.on("disconnect", () => {
    console.log("A user disconnected");
  });
});

module.exports = server;
