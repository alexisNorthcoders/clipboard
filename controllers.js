const { webhookModel, uploadModel } = require("./models");
const path = require("path");

class WebhookController {
  getWebhook(req, res) {
    const errorResponse = webhookModel.getAccessError();
    res.status(400).send(errorResponse);
  }
  postWebhook(req, res) {
    console.log("New deployment pushed to GitHub. Clipboard restarting.");
    res.status(200).send("Deployment script is being executed.");

    WebhookModel.executeDeploymentScript((error) => {
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
}

module.exports = {
  webhookController: new WebhookController(),
  uploadController: new UploadController(),
};
