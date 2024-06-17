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
    const files = fileStrings.map((fileString) => JSON.parse(fileString));
    return files;
  } catch (err) {
    console.error("Error retrieving files for user:", err);
    throw err;
  }
}
async function deleteFileForUser(userId, filename) {
  try {
    const filesKey = `user:${userId}:files`;
    const files = await redisClient.sMembers(filesKey);
    const fileToRemove = files.find((fileString) => {
      const fileObj = JSON.parse(fileString);
      return fileObj.name === filename;
    });

    if (!fileToRemove) {
      console.log(`File ${filename} not found for user ${userId}`);
      return;
    }

    await redisClient.sRem(filesKey, fileToRemove);
    console.log(`File ${filename} removed for user ${userId}`);
  } catch (err) {
    console.error("Error removing file from user:", err);
  }
}

module.exports = { addFileToUser, getFilesForUser, deleteFileForUser, redisClient };
