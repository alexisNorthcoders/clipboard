const observer = require("./observer");


function attachListenners() {
    if (process.env.ENABLE_EVENTS === 'true') {
        observer.on('fileDeleted', ({ filePath }) => {
            console.log(`File deleted successfully: ${filePath}`);
        });

        observer.on('fileAlreadyDeleted', ({ filePath }) => {
            console.warn(`File was already deleted: ${filePath}`);
        });

        observer.on('fileDeletionError', ({ error, filePath }) => {
            console.error(`Error deleting file ${filePath}:`, error);
        });

        observer.on('redisEntryDeleted', ({ filePath }) => {
            console.log(`Deleted Redis entry for path ${filePath}`);
        });

        observer.on('redisDeletionError', ({ error, filePath }) => {
            console.error(`Error deleting Redis entry for path ${filePath}:`, error);
        });
    }
}

module.exports = { attachListenners };