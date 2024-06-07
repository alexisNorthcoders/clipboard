const fs = require("fs").promises;
const path = require("path");

const getFileInformation = async (directory) => {
  const files = await fs.readdir(directory);
  const fileInfos = await Promise.all(
    files.map(async (file) => {
      const filePath = path.join(directory, file);
      const stats = await fs.stat(filePath);
      return {
        name: file,
        url: `/uploads/${file}`,
        size: stats.size,
        created: stats.birthtime,
      };
    })
  );
  return fileInfos;
};
module.exports = {getFileInformation}