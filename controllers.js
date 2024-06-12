const { webhookModel, uploadModel, userModel } = require("./models");
const path = require("path");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

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
      console.error("Error getting file stats:", err);
      res.status(500).json({ error: "Error getting file stats" });
    }
  }
  async uploadFile(req, res, io) {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    const fileUrl = uploadModel.saveFile(req.file);

    try {
      const uploadFolderPath = path.join(__dirname, "uploads");
      const fileInfos = await uploadModel.getFileInfo(uploadFolderPath);
      if (!req.session.files) {
        req.session.files = [];
      }
      req.session.files.push({ name: req.file.originalname, url: fileUrl });
      req.session.save((err) => {
        if (err) {
          console.error("Error saving session file data:", err);
          return res.status(500).send("Error saving session data.");
        }
        const userId = req.session.user.id;
        const sockets = io.sockets.sockets;
        sockets.forEach((socket) => {
          if (socket.handshake.session.user.id === userId) {
            socket.emit("filesUploaded", req.session.files);
            console.log("emitted these files: ",req.session.files)
          }
        });

        res.status(201).json({ fileUrl, message: "File uploaded successfully" });
      });
    } catch (err) {
      console.error("Error getting file stats:", err);
      res.status(500).send("Error getting file stats.");
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
      if (!passwordIsValid) {
        return res.status(401).send("Invalid password.");
      }
      const accessToken = jwt.sign({ user: { username } }, process.env.DATABASE_SECRET, { expiresIn: "30m" });

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
        console.log(err);
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
};
