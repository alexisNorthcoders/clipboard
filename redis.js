const redis = require("redis");
const redisClient = redis.createClient({
  host: "127.0.0.1",
  port: 6379,
});

redisClient.connect();

redisClient.on("connect", () => {
  console.log("Connected to Redis");
});
redisClient.on("error", (err) => {
  console.error("Redis error:", err);
});

async function addFileToUser(userId, newFile) {
  try {
    const newFileString = JSON.stringify(newFile);
    await redisClient.sAdd(`user:${userId}:files`, newFileString);
    console.log(`File ${newFile.name} added for user ${userId}`);
  } catch (err) {
    console.error("Error adding file to user:", err);
  }
}
async function getFilesForUser(userId) {
    try {
      const fileStrings = await redisClient.sMembers(`user:${userId}:files`);
      const files = fileStrings.map(fileString => JSON.parse(fileString));
      return files;
    } catch (err) {
      console.error("Error retrieving files for user:", err);
      throw err;
    }
  }



async function deleteFileForUser(userId, fileName) {
  try {
    const fileId = `${userId}:${fileName}`;
    await redisClient.sRem(`user:${userId}:files`, fileId);
    await redisClient.del(`file:${fileId}`);
    console.log(`File ${fileName} deleted for user ${userId}`);
  } catch (err) {
    console.error("Error deleting file for user:", err);
  }
}

async function deleteAllFilesForUser(userId) {
  try {
    const fileIds = await redisClient.sMembers(`user:${userId}:files`);

    const deleteFilePromises = fileIds.map((fileId) => redisClient.del(`file:${fileId}`));
    await Promise.all(deleteFilePromises);

    await redisClient.del(`user:${userId}:files`);
    console.log(`All files deleted for user ${userId}`);
  } catch (err) {
    console.error("Error deleting all files for user:", err);
  }
}

module.exports = { addFileToUser, getFilesForUser, deleteFileForUser, redisClient, deleteAllFilesForUser };
