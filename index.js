const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const path = require("path");
const fs = require("fs");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static("public"));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.post("/upload", (req, res) => {
  if (!req.files || !req.files.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const file = req.files.file;
  const fileName = file.name;
  const filePath = path.join(__dirname, "uploads", fileName);

  const writeStream = fs.createWriteStream(filePath);
  file.data.pipe(writeStream);

  const fileUrl = `/uploads/${fileName}`;
  io.emit("file", fileUrl);

  res.status(200).json({ fileUrl });
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

const PORT = process.env.PORT || 4123;
server.listen(PORT, () => {
  console.log(`Clipboard Server is running on port ${PORT}`);
});
