const { exec } = require("child_process");
const { getFileInformation } = require("./utils");

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
}

module.exports = {
  webhookModel: new WebhookModel(),
  uploadModel: new UploadModel(),
};
