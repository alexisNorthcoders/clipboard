const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const path = require("path");
const fs = require("fs");
const upload = require("./multer");
const { getFileInformation } = require("./utils");
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.json());
app.use(express.static("public"));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.get('/upload', async (req, res) => {
    try {
      const fileInfos = await getFileInformation(path.join(__dirname, 'uploads'));
      res.json({ files: fileInfos });
    } catch (err) {
      console.error("Error getting file stats:", err);
      res.status(500).json({ error: "Error getting file stats" });
    }
  });
app.post("/upload", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const fileUrl = `/uploads/${req.file.filename}`;

  fs.readdir("uploads", (err, files) => {
    if (err) {
      return res.status(500).send("Error reading uploads folder.");
    }

    const fileUrls = files.map((file) => `/uploads/${file}`);
    io.emit("filesUploaded", fileUrls);
    res.status(201).json({ fileUrl,message:"File uploaded successfully" });
  });
});

let currentClipboardData = "";

io.on("connection", (socket) => {
  console.log("A user connected");
  socket.emit("clipboard", currentClipboardData);
  fs.readdir("uploads", (err, files) => {
    if (err) {
      console.error("Error reading uploads folder.");
      return;
    }

    const fileUrls = files.map((file) => `/uploads/${file}`);
    socket.emit("filesUploaded", fileUrls);
  });

  socket.on("clipboard", (data) => {
    console.log("Clipboard data received:", data);
    currentClipboardData = data;

    socket.broadcast.emit("clipboard", data);
  });

  socket.on("disconnect", () => {
    console.log("A user disconnected");
  });
});

module.exports = { server, io };
