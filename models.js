const { exec } = require("child_process");
const { getFileInformation } = require("./utils");
const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("./DB/database.sqlite");
const fs = require("fs").promises;
const path = require("path");

class WebhookModel {
  getAccessError() {
    return { error: "You don't have access for this." };
  }
  executeScript(callback) {
    exec("./script/deploy.sh", callback);
  }
}
class UploadModel {
  async getFileInfo(uploadFolderPath) {
    try {
      const fileInfos = await getFileInformation(uploadFolderPath);
      return fileInfos;
    } catch (err) {
      throw err;
    }
  }
  saveFile(file) {
    return `/uploads/${file.filename}`;
  }
  async deleteFile(filename) {
    const filePath = path.join(__dirname, "uploads", filename);
    try {
      await fs.access(filePath);
      await fs.unlink(filePath);

      return `Successfully removed the file: ${filename}`;
    } catch (err) {
      if (err.code === "ENOENT") {
        return 'File removed already.'
      }
      throw err;
    }
  }
}
class UserModel {
  createUser(username, hashedPassword, callback) {
    db.run(
      "INSERT INTO users (username, password) VALUES (?, ?)",
      [username, hashedPassword],
      function (err) {
        if (err) {
          callback(err);
        } else {
          callback(null, this.lastID);
        }
      }
    );
  }
  findByUsername(username, callback) {
    db.get("SELECT * FROM users WHERE username = ?", [username], callback);
  }
  allUsers(callback) {
    db.all("SELECT id, username FROM users", [], callback);
  }
}
class UserFilesModel {
  addFileToUser(userId, filePath, callback) {
    db.run("INSERT INTO UserFiles (userId, filePath) VALUES (?, ?)", [userId, filePath], callback);
  }
  getFilesForUser(userId, callback) {
    db.all("SELECT filePath FROM UserFiles WHERE userId = ?", [userId], callback);
  }
}

module.exports = {
  webhookModel: new WebhookModel(),
  uploadModel: new UploadModel(),
  userModel: new UserModel(),
  userFilesModel: new UserFilesModel()
};
