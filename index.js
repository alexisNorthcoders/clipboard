const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const path = require("path");
const fs = require("fs");
const upload = require("./multer");
const { verifySignature } = require("./utils");
const app = express();
const server = http.createServer(app);
const io = socketIo(server);
const bodyParser = require("body-parser");
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

app.post("/webhook", webhookController.postWebhook);
app.get("/webhook", webhookController.getWebhook);

app.get("/upload", uploadController.getUploads);
app.post("/upload", upload.single("file"), (req, res) => uploadController.uploadFile(req, res, io));

app.post("/register", userController.register);
app.post("/login",userController.login);
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
