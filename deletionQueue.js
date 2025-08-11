const Queue = require("bull");
const fs = require("fs/promises");
const { deleteFileForUser } = require("./redis");

const fileDeletionQueue = new Queue("fileDeletion", {
  redis: {
    host: process.env.NODE_ENV === "development" ? "127.0.0.1" : process.env.REDIS_HOST,
    port: process.env.REDIS_PORT || 6379,
  },
  defaultJobOptions: {
    removeOnComplete: true,
    removeOnFail: true
  }
});

fileDeletionQueue.process(async (job) => {
  const { filePath, userId, filename } = job.data;

  try {
    await fs.unlink(filePath);
    console.log(`File ${filePath} deleted successfully after 120 seconds.`);
  }
  catch (err) {
    if (err.code === "ENOENT") {
      console.warn(`File ${filePath} already deleted, skipping unlink.`);
    }
    else {
      console.error(`Error deleting file ${filePath}:`, err);
    }
  }

  try {
    await deleteFileForUser(userId, filename);
  }
  catch (redisErr) {
    console.error(`Error deleting Redis entry for ${filename}:`, redisErr);
  }

  return true;
});

module.exports = fileDeletionQueue;
