const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const path = require("path");
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
const { admin } = require("./middleware/admin");

setupWebsocket(io, sessionMiddleware);

app.use(express.json());
app.use(express.static("public"));
app.use(bodyParser.json({ limit: "10mb" }));

app.use(
  bodyParser.urlencoded({
    extended: true,
    limit: "10mb",
    parameterLimit: 50000,
  })
);

app.use(sessionMiddleware);

app.use("/uploads", validateToken, express.static(path.join(__dirname, "uploads")));
app.use("/webhook", bodyParser.json({ verify: verifySignature }));

app.post("/webhook", webhookController.postWebhook);
app.get("/webhook", webhookController.getWebhook);

app.get("/upload", admin, uploadController.getUploads);
app.get("/users", admin, userController.getUsers);
app.post("/upload", validateToken, upload.single("file"), (req, res) => uploadController.uploadFile(req, res, io));

app.post("/register", userController.register);
app.post("/login", userController.login);
app.post("/logout", userController.logout);

app.post("/delete", validateToken, uploadController.removeFile);

app.get("/current", validateToken, (req, res) => {
  res.send(req.user);
});

app.get("/test-session", (req, res) => {
  if (req.session.user) {
    return res.status(200).send({ sessionData: req.session.user, message: "Test successfull!" });
  } else {
    return res.status(404).send({ message: "No session found." });
  }
});

/* process.on("SIGINT", () => {
  redisClient.quit();
  console.log("Redis connection closed.");
  process.exit();
}); */

module.exports = { server };
