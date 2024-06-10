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
const bodyParser = require("body-parser");
const { exec } = require("child_process");
const crypto = require("crypto");
const secret = process.env.SECRET;
app.use(express.json());
app.use(express.static("public"));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/webhook", bodyParser.json({ verify: verifySignature }));

app.post("/webhook", (req, res) => {
  res.status(200).send("Deployment script is being executed.");

  exec("./script/deploy.sh", (error) => {
    if (error) {
      console.error(`exec error: ${error}`);
    }
  });
});
app.get("/webhook", (req, res) => {
  res.status(200).send("Making sure webhook is working correctly.");
});

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
    res.status(201).json({ fileUrl, message: "File uploaded successfully" });
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

function verifySignature(req, res, buf) {
  const signature = `sha256=${crypto
    .createHmac("sha256", secret)
    .update(buf)
    .digest("hex")}`;
  if (req.headers["x-hub-signature-256"] !== signature) {
    throw new Error("Invalid signature.");
  }
}

module.exports = { server, io };
