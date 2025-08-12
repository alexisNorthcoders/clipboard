const { webhookModel, uploadModel, userModel } = require("./models");
const path = require("path");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const fileDeletionQueue = require("./deletionQueue");
const { addFileToUser, getFilesForUser, deleteFileForUser } = require("./redis.js");
const { randomId } = require("./utils.js");
const { saveEncryptedFile } = require("./multer.js");
const userFilesMap = new Map();

class WebhookController {
  getWebhook(req, res) {
    const errorResponse = webhookModel.getAccessError();
    res.status(400).send(errorResponse);
  }
  postWebhook(req, res) {
    console.log("New deployment pushed to GitHub.");
    res.status(200).send("Deployment script is being executed.");

    // Run webhook logic. No longer needed due to CI/CD.
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
    if (!req.file || !req.session?.user?.id) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    try {
      // encrypt and save file from memory buffer
      const savedPath = await saveEncryptedFile(req.file.buffer, req.file.originalname);

      const fileUrl = `/uploads/${req.file.originalname}`;
      const size = req.file.size;
      const name = req.file.originalname;
      res.status(201).json({ fileUrl, message: "File uploaded successfully" });

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

      const uniqueJobId = `${userId}-${Date.now()}`;

      fileDeletionQueue.add(
        {
          filePath: savedPath,
          userId,
          filename: req.file.originalname,
        },
        {
          jobId: uniqueJobId,
          delay: process.env.FILE_DELETION_DELAY || 120 * 1000,
        }
      );
    } catch (err) {
      console.error("Error uploading file:", err);
      res.status(500).json({ error: "Failed to upload file" });
    }
  }
  async removeFile(req, res) {
    const { filename } = req.body;
    const { userId } = req.user;

    try {
      await deleteFileForUser(userId, filename) //redis
      const response = await uploadModel.deleteFile(filename);
      const filesFromUserId = await getFilesForUser(userId); // redis

      res.status(200).send({ message: response });
    } catch (error) {
      res.status(500).json({ error });
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
      const accessToken = jwt.sign({ user: { username }, userId }, process.env.DATABASE_SECRET, { expiresIn: "1h" });

      req.session.user = user;
      req.session.save((err) => {
        if (err) {
          return res.status(500).send("Failed to save session.");
        }

        res.status(200).send({ message: "Login successful!", accessToken, userId });
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
  verifyToken(req, res) {
    const token = req.body.token || req.headers['authorization']?.split(' ')[1];

    if (!token) {
      return res.status(400).send({ message: "No token provided." });
    }

    jwt.verify(token, process.env.DATABASE_SECRET, (err, decoded) => {
      if (err) {
        return res.status(401).send({ message: "Invalid or expired token." });
      }

      return res.status(200).send({
        message: "Token is valid",
        user: decoded.user,
        userId: decoded.userId,
        expiresIn: decoded.exp,
      });
    });
  }
  anonymousLogin(req, res) {

    const anonId = randomId();
    const username = `anon-${anonId}`;

    const randomPasswordHash = bcrypt.hashSync(randomId(), 8);

    userModel.createUser(
      username, randomPasswordHash,
      (err, userId) => {
        if (err) {
          return res.status(500).send("Error creating anonymous user.");
        }

        const accessToken = jwt.sign(
          { user: { username }, userId },
          process.env.DATABASE_SECRET,
          { expiresIn: "1h" }
        );

        req.session.user = { id: userId, username, isAnonymous: true, password: randomPasswordHash };
        console.log(req.session.user)
        req.session.save((err) => {
          if (err) {
            return res.status(500).send("Failed to save session.");
          }

          // Magic link - clicking this will set JWT in another device
          const magicLink = `/anon-login?token=${accessToken}`;

          res.status(200).send({
            message: "Anonymous login successful!",
            userId,
            accessToken,
            magicLink
          });
        });
      }
    );
  }
  getUsers(req, res) {
    userModel.allUsers((err, users) => {
      if (err) {
        return res.status(400).send({ message: "Error getting list of users." });
      }
      res.status(200).send({ users });
    });
  }
  magicLinkLogin(req, res) {
    const { token } = req.query;
    if (!token) {
      return res.status(400).send("Token missing.");
    }

    try {
      const decoded = jwt.verify(token, process.env.DATABASE_SECRET);
      const { userId, user } = decoded;

      req.session.user = { id: userId, username: user.username, isAnonymous: true };
      req.session.save((err) => {
        if (err) {
          return res.status(500).send("Failed to save session.");
        }

        res.status(200).send({
          message: "Anonymous login successful!",
          accessToken: token,
          userId,
        });
      });
    } catch (err) {
      return res.status(401).send("Invalid or expired token.");
    }
  }
}

module.exports = {
  webhookController: new WebhookController(),
  uploadController: new UploadController(),
  userController: new UserController(),
  userFilesMap,
};
