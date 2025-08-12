const Queue = require("bull");
const fs = require("fs/promises");
const { deleteFileForUser } = require("./redis");
const observer = require("./observer")

const fileDeletionQueue = new Queue("fileDeletion", {
  redis: {
    host: process.env.NODE_ENV === "development" ? "127.0.0.1" : process.env.REDIS_HOST,
    port: process.env.REDIS_PORT || 6379,
  }
});

fileDeletionQueue.process(async (job) => {
  const { filePath, userId, filename } = job.data;

  try {
    await fs.unlink(filePath);
    observer.emit('fileDeleted', { filePath });
  }
  catch (error) {
    if (error.code === "ENOENT") {
      observer.emit('fileAlreadyDeleted', { filePath });
    }
    else {
      observer.emit('fileDeletionError', { error, filePath });
    }
  }

  try {
    await deleteFileForUser(userId, filename);
    observer.emit('redisEntryDeleted', { filePath });
  }
  catch (error) {
    observer.emit('redisDeletionError', { error, filePath });
  }
});

module.exports = fileDeletionQueue;
