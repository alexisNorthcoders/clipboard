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

app.get("/upload", async (req, res) => {
  try {
    const fileInfos = await getFileInformation(path.join(__dirname, "uploads"));
    res.json({ files: fileInfos });
  } catch (err) {
    console.error("Error getting file stats:", err);
    res.status(500).json({ error: "Error getting file stats" });
  }
});
app.post("/upload", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const fileUrl = `/uploads/${req.file.filename}`;

  try {
    const fileInfos = await getFileInformation(path.join(__dirname, "uploads"));
    io.emit("filesUploaded", fileInfos);
    res.json({ fileUrl });
  } catch (err) {
    console.error("Error getting file stats:", err);
    res.status(500).send("Error getting file stats.");
  }
});

let currentClipboardData = "";

io.on("connection", async (socket) => {
  console.log("A user connected");
  socket.emit("clipboard", currentClipboardData);
  try {
    const fileInfos = await getFileInformation(path.join(__dirname, "uploads"));
    socket.emit("filesUploaded", fileInfos);
  } catch (err) {
    console.error("Error getting file stats:", err);
  }

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
