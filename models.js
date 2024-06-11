class WebhookModel {
    getAccessError() {
      return { error: "You don't have access for this." };
    }
  }
  
 module.exports = {
    WebhookModel: new WebhookModel(),
   
  };