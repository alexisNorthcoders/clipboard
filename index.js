const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const path = require("path");
const { upload } = require("./multer");
const { verifySignature } = require("./utils");
const app = express();
const server = http.createServer(app);
const io = socketIo(server);
const bodyParser = require("body-parser");
const cors = require("cors");
const { validateToken } = require("./middleware/tokenvalidator");
require("dotenv").config();

const { sessionMiddleware } = require("./middleware/sessionmiddleware");
const { setupWebsocket } = require("./websockets");
const { webhookController, uploadController, userController } = require("./controllers");
const { admin } = require("./middleware/admin");
const { logger } = require("./middleware/logger");

setupWebsocket(io, sessionMiddleware);

app.use(express.json());
app.set('trust proxy', 1);
app.use(sessionMiddleware);
app.use(logger);
if (process.env.NODE_ENV === "development") {
  const clientPublicPath = path.resolve(__dirname, process.env.PATH_TO_PUBLIC_FOLDER);
  app.use(express.static(clientPublicPath));

}
app.use(bodyParser.json({ limit: "10mb" }));

app.use(
  bodyParser.urlencoded({
    extended: true,
    limit: "10mb",
    parameterLimit: 50000,
  })
);

const corsOptions = {
  origin: [process.env.CORS],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
};

app.use(cors(corsOptions));

//app.use("/api/uploads", validateToken, express.static(path.join(__dirname, "uploads")));

app.get("/api/uploads/:filename", validateToken, uploadController.downloadFile);

app.use("/api/webhook", bodyParser.json({ verify: verifySignature }));

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.post("/api/webhook", webhookController.postWebhook);
app.get("/api/webhook", webhookController.getWebhook);

app.get("/api/upload", admin, uploadController.getUploads);
app.get("/api/users", admin, userController.getUsers);
app.post("/api/upload", validateToken, upload.single("file"), (req, res) => uploadController.uploadFile(req, res, io));

app.post("/api/register", userController.register);
app.post("/api/login", userController.login);
app.post('/api/verify-token', userController.verifyToken);
app.post('/api/anonymous', userController.anonymousLogin);
app.post("/api/logout", userController.logout);

app.post("/api/delete", validateToken, uploadController.removeFile);

app.get("/api/current", validateToken, (req, res) => {
  res.send(req.user);
});

app.get("/api/test-session", (req, res) => {
  if (req.session.user) {
    return res.status(200).send({ sessionData: req.session.user, message: "Test successfull!" });
  } else {
    return res.status(404).send({ message: "No session found." });
  }
});

module.exports = { server };
