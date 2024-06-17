const Queue = require("bull");
const fs = require("fs");


const fileDeletionQueue = new Queue("fileDeletion", {
  redis: {
    host: "127.0.0.1",
    port: 6379,
  },
});

fileDeletionQueue.process(async (job) => {
  const { filePath, userId, filename } = job.data;
  fs.unlink(filePath, async (err) => {
    if (err) {
      console.error(`Error deleting file ${filePath}:`, err);
    } else {
      console.log(`File ${filePath} deleted successfully after 120 seconds.`);

      await deleteFileForUser(userId, filename)
    }
  });
});

module.exports = fileDeletionQueue;
