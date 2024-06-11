const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const path = require("path");
const fs = require("fs");
const upload = require("./multer");
const { getFileInformation, verifySignature } = require("./utils");
const app = express();
const server = http.createServer(app);
const io = socketIo(server);
const bodyParser = require("body-parser");
const { exec } = require("child_process");
const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("./DB/database.sqlite");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const session = require("express-session");
const { validateToken } = require("./middleware/tokenvalidator");
require("dotenv").config();
const sharedsession = require("express-socket.io-session");
const { sessionMiddleware } = require("./middleware/sessionmiddleware");

app.use(express.json());
app.use(express.static("public"));

app.use(sessionMiddleware);
io.use(
  sharedsession(sessionMiddleware, {
    autoSave: true,
  })
);
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/webhook", bodyParser.json({ verify: verifySignature }));

app.post("/webhook", (req, res) => {
  console.log("New deployment pushed to github. Clipboard restarting.");
  res.status(200).send("Deployment script is being executed.");

  exec("./script/deploy.sh", (error) => {
    if (error) {
      console.error(`exec error: ${error}`);
    }
  });
});
app.get("/webhook", (req, res) => {
  res.status(400).send({ error: "You don't have access for this." });
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
app.post("/register", (req, res) => {
  const { username, password } = req.body;
  const hashedPassword = bcrypt.hashSync(password, 8);
  db.run("INSERT INTO users (username, password) VALUES (?, ?)", [username, hashedPassword], (err) => {
    if (err) {
      return res.status(400).send({ message: "Error registering new user." });
    }
    console.log("New user created.");
    res.status(200).send({ message: "User created successfully" });
  });
});
app.post("/login", (req, res) => {
  const { username, password } = req.body;

  db.get("SELECT * FROM users WHERE username = ?", [username], (err, user) => {
    if (err) {
      return res.status(500).send("Error on the server.");
    }
    if (!user) {
      return res.status(404).send({ message: "User not found." });
    }

    const passwordIsValid = bcrypt.compareSync(password, user.password);
    if (!passwordIsValid) {
      return res.status(401).send("Invalid password.");
    }
    const accessToken = jwt.sign(
      {
        user: {
          username,
        },
      },
      process.env.DATABASE_SECRET,
      { expiresIn: "30m" }
    );
    req.session.user = user;
    req.session.save((err) => {
      if (err) {
        return res.status(500).send("Failed to save session.");
      }
      console.log("Session user set:", req.session.user);
      res.status(200).send({ message: "Login successful!", accessToken });
    });
  });
});
app.get("/current", validateToken, (req, res) => {
  res.send(req.user);
});
app.post("/logout", (req, res) => {
  console.log(req.session.user, "req.session.user");
  if (req.session.user) {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).send("Error in logging out.");
      }

      res.status(200).send({ message: "Logout successful!" });
    });
  } else {
    res.status(200).send({ message: "No user session to terminate." });
  }
});
app.get("/test-session", (req, res) => {
  if (req.session.user) {
    return res.status(200).send({ sessionData: req.session.user, message: "Test successfull!" });
  } else {
    return res.status(404).send({ message: "No session found." });
  }
});
let currentClipboardData = "";

io.on("connection", async (socket) => {
  if (socket.handshake.session.user) {
    console.log("A user connected with a valid session:", socket.handshake.session.user.username);
    currentClipboardData = socket.handshake.session.clipboard || "";
    socket.emit("clipboard", currentClipboardData);
    try {
      const fileInfos = await getFileInformation(path.join(__dirname, "uploads"));
      socket.emit("filesUploaded", fileInfos);
    } catch (err) {
      console.error("Error getting file stats:", err);
    }

    socket.on("clipboard", (data) => {
      socket.handshake.session.clipboard = data;
      socket.handshake.session.save((err) => {
        if (err) {
          console.error("Error saving session clipboard data:", err);
        }
      });
      socket.broadcast.emit("clipboard", data);
    });

    socket.on("disconnect", () => {
      console.log("A user disconnected");
    });
  } else {
    console.log("A user tried to connect without a valid session");
    socket.disconnect(true);
  }
});

module.exports = { server, io };
