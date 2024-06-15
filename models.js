const { exec } = require("child_process");
const { getFileInformation } = require("./utils");
const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("./DB/database.sqlite");
const fs = require("fs").promises;
const path = require("path");
const { userFilesMap } = require("./controllers");

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
      
      throw err;
    }
    userFilesMap
  }
}
class UserModel {
  createUser(username, hashedPassword, callback) {
    db.run("INSERT INTO users (username, password) VALUES (?, ?)", [username, hashedPassword], callback);
  }
  findByUsername(username, callback) {
    db.get("SELECT * FROM users WHERE username = ?", [username], callback);
  }
  allUsers(callback) {
    db.all("SELECT id, username FROM users", [], callback);
  }
}

module.exports = {
  webhookModel: new WebhookModel(),
  uploadModel: new UploadModel(),
  userModel: new UserModel(),
};
