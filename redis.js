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

async function addFileToUser(redisClient, userId, newFile) {
  try {
    const fileId = `${userId}:${newFile.name}`;
    await redisClient.hSet(`file:${fileId}`, newFile);
    await redisClient.sAdd(`user:${userId}:files`, fileId);
    console.log(`File ${newFile.name} added for user ${userId}`);
  } catch (err) {
    console.error("Error adding file to user:", err);
  }
}

async function getFilesForUser(userId, callback) {
  try {
    const fileIds = await redisClient.sMembers(`user:${userId}:files`);
    const files = [];
    
    for (const fileId of fileIds) {
      const fileData = await redisClient.hGetAll(`file:${fileId}`);
      files.push(fileData);
    }
    
    callback(null, files);
  } catch (err) {
    console.error("Error retrieving files for user:", err);
    callback(err, []);
  }
}

async function deleteFileForUser(redisClient, userId, fileName) {
  try {
    const fileId = `${userId}:${fileName}`;
    await redisClient.sRem(`user:${userId}:files`, fileId);
    await redisClient.del(`file:${fileId}`);
    console.log(`File ${fileName} deleted for user ${userId}`);
  } catch (err) {
    console.error("Error deleting file for user:", err);
  }
}

module.exports = { addFileToUser, getFilesForUser, deleteFileForUser, redisClient };