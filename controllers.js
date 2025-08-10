const { webhookModel, uploadModel, userModel } = require("./models");
const path = require("path");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const zlib = require("node:zlib");
const fs = require("fs");
const fileDeletionQueue = require("./deletionQueue");
const { addFileToUser, getFilesForUser, deleteFileForUser } = require("./redis.js");
const { randomId } = require("./utils.js");
const { saveEncryptedFile, encryptionKey, algorithm  } = require("./multer.js");
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

      fileDeletionQueue.add(
        {
          filePath: savedPath,
          userId,
          filename: req.file.filename,
        },
        {
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
  async downloadFile(req, res) {
    const filePath = path.join(__dirname, "uploads", req.params.filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).send("File not found");
    }

    const fileStream = fs.createReadStream(filePath);

    let iv;
    // read first 16 bytes for IV
    let ivBuffer = Buffer.alloc(16);
    let bytesRead = 0;

    let decipher;

    const initDecipherStream = () => {
      return new require('stream').Transform({
        transform(chunk, encoding, callback) {
          if (bytesRead < 16) {
            // Fill ivBuffer with first 16 bytes
            const remaining = 16 - bytesRead;
            if (chunk.length < remaining) {
              chunk.copy(ivBuffer, bytesRead, 0);
              bytesRead += chunk.length;
              return callback(); // wait for more data
            } else {
              chunk.copy(ivBuffer, bytesRead, 0, remaining);
              bytesRead += remaining;
              iv = ivBuffer;

              // create decipher after iv is ready
              decipher = crypto.createDecipheriv(algorithm, encryptionKey, iv);

              // pass remaining chunk bytes through decipher
              const remainingChunk = chunk.slice(remaining);
              const decrypted = decipher.update(remainingChunk);

              this.push(decrypted);
              callback();
            }
          } else {
            // after iv read, just decrypt
            const decrypted = decipher.update(chunk);
            this.push(decrypted);
            callback();
          }
        },
        flush(callback) {
          if (decipher) {
            this.push(decipher.final());
          }
          callback();
        }
      });
    };

    const ivDecipherStream = initDecipherStream();

    // Create gzip stream for compression
    const gzip = zlib.createGzip();

    // Set headers for download
    res.setHeader("Content-Disposition", `attachment; filename="${req.params.filename}"`);
    res.setHeader("Content-Encoding", "gzip");
    res.setHeader("Content-Type", "application/octet-stream");

    // Pipe: Encrypted file -> Extract IV & decrypt -> Gzip -> Response
    fileStream.pipe(ivDecipherStream).pipe(gzip).pipe(res);

    fileStream.on("error", () => res.status(500).send("Error reading file"));
    ivDecipherStream.on("error", () => res.status(500).send("Decryption failed"));
    gzip.on("error", () => res.status(500).send("Compression failed"));
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

          res.status(200).send({
            message: "Anonymous login successful!",
            userId,
            accessToken
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
}

module.exports = {
  webhookController: new WebhookController(),
  uploadController: new UploadController(),
  userController: new UserController(),
  userFilesMap,
};
