const { WebhookModel } = require("./models");


class WebhookController {
  getWebhook(req, res) {
    const errorResponse = WebhookModel.getAccessError();
    res.status(400).send(errorResponse);
  }
}

module.exports = { WebhookController: new WebhookController() };
