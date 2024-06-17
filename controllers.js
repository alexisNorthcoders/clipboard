const { webhookModel, uploadModel, userModel } = require("./models");
const path = require("path");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { removeFileFromMap } = require("./utils");
const fileDeletionQueue = require("./deletionQueue");
const { addFileToUser, getFilesForUser, deleteFileForUser, redisClient, deleteAllFilesForUser } = require("./redis.js");
const userFilesMap = new Map();

class WebhookController {
  getWebhook(req, res) {
    const errorResponse = webhookModel.getAccessError();
    res.status(400).send(errorResponse);
  }
  postWebhook(req, res) {
    console.log("New deployment pushed to GitHub. Clipboard restarting.");
    res.status(200).send("Deployment script is being executed.");

    webhookModel.executeScript((error) => {
      if (error) {
        console.error(`exec error: ${error}`);
      }
    });
  }
}
class UploadController {
  async getUploads(req, res) {
    try {
      const uploadFolderPath = path.join(__dirname, "uploads");
      const fileInfos = await uploadModel.getFileInfo(uploadFolderPath);
      res.json({ files: fileInfos });
    } catch (err) {
      res.status(500).json({ error: "Error getting file stats" });
    }
  }
  async uploadFile(req, res, io) {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    const fileUrl = uploadModel.saveFile(req.file);
    const filePath = path.join(__dirname, fileUrl);
    const size = req.file.size;
    const name = req.file.filename;
    res.status(201).json({ fileUrl, message: "File uploaded successfully" });

    try {
      const userId = req.session.user.id;
      const newFile = { name, url: fileUrl, userId, size };
      await addFileToUser(userId, newFile); // redis

      const sockets = io.sockets.sockets;

      const filesFromUserId = await getFilesForUser(userId); // redis

      req.session.save((err) => {
        if (err) {
          console.error("Error saving session file data:", err);
        }

        sockets.forEach((socket) => {
          if (socket.handshake.session.user.id === userId) {
            socket.emit("filesUploaded", filesFromUserId);
          }
        });
      });

      fileDeletionQueue.add(
        {
          filePath,
          userId,
          filename: req.file.filename,
        },
        {
          delay: 120 * 1000,
        }
      );
    } catch (err) {
      console.error("Error getting file stats:", err);
    }
  }
  async removeFile(req, res) {
    const { filename } = req.body;
    const { userId } = req.user;

    try {
      const response = await uploadModel.deleteFile(filename);
      removeFileFromMap(userId, filename);
      res.status(200).send({ message: response });
    } catch (error) {
      if (error.code === "ENOENT") {
        res.status(404).json({ error: "File not found!" });
      } else {
        res.status(500).json({ error });
      }
    }
  }
}
class UserController {
  register(req, res) {
    const { username, password } = req.body;
    const hashedPassword = bcrypt.hashSync(password, 8);

    userModel.createUser(username, hashedPassword, (err) => {
      if (err) {
        return res.status(400).send({ message: "Error registering new user." });
      }
      console.log("New user created.");
      res.status(200).send({ message: "User created successfully" });
    });
  }
  login(req, res) {
    const { username, password } = req.body;
    userModel.findByUsername(username, (err, user) => {
      if (err) {
        return res.status(500).send("Error on the server.");
      }
      if (!user) {
        return res.status(404).send({ message: "User not found." });
      }
      const passwordIsValid = bcrypt.compareSync(password, user.password);
      const userId = user.id;
      if (!passwordIsValid) {
        return res.status(401).send("Invalid password.");
      }
      const accessToken = jwt.sign({ user: { username }, userId }, process.env.DATABASE_SECRET, { expiresIn: "30m" });

      req.session.user = user;
      req.session.save((err) => {
        if (err) {
          return res.status(500).send("Failed to save session.");
        }
        console.log("Session user set:", req.session.user);

        res.status(200).send({ message: "Login successful!", accessToken });
      });
    });
  }
  logout(req, res) {
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
  }
  getUsers(req, res) {
    userModel.allUsers((err, users) => {
      if (err) {
        return res.status(400).send({ message: "Error getting list of users." });
      }
      res.status(200).send({ users });
    });
  }
}

module.exports = {
  webhookController: new WebhookController(),
  uploadController: new UploadController(),
  userController: new UserController(),
  userFilesMap,
};
