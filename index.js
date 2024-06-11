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
const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("./DB/database.sqlite");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { validateToken } = require("./middleware/tokenvalidator");
require("dotenv").config();

const { sessionMiddleware } = require("./middleware/sessionmiddleware");
const { setupWebsocket } = require("./websockets");
const { webhookController, uploadController, userController } = require("./controllers");

setupWebsocket(io, sessionMiddleware);

app.use(express.json());
app.use(express.static("public"));

app.use(sessionMiddleware);

app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/webhook", bodyParser.json({ verify: verifySignature }));

app.post("/webhook",webhookController.postWebhook);
app.get("/webhook", webhookController.getWebhook);

app.get("/upload", uploadController.getUploads);
app.post("/upload", upload.single("file"),(req,res)=> uploadController.uploadFile(req,res,io));

app.post("/register",userController.register);
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

module.exports = { server };
