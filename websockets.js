const sharedsession = require("express-socket.io-session");
const { userFilesMap } = require("./controllers");

function setupWebsocket(io, sessionMiddleware) {
  let currentClipboardData = "";
  io.use(
    sharedsession(sessionMiddleware, {
      autoSave: true,
    })
  );
  io.on("connection", async (socket) => {
    if (socket.handshake.session.user) {
      currentClipboardData = socket.handshake.session.clipboard || "";
      socket.emit("clipboard", currentClipboardData);
      try {
        const userId = socket.handshake.session.user.id;
        const sockets = io.sockets.sockets;

        sockets.forEach((connectedSocket) => {
          if (connectedSocket.handshake.session.user && connectedSocket.handshake.session.user.id === userId && connectedSocket.handshake.session.files) {
            socket.emit("filesUploaded", connectedSocket.handshake.session.files);
          }
        });
      } catch (err) {
        console.error("Error getting file stats:", err);
      }

      socket.on("clipboard", (data) => {
        socket.handshake.session.clipboard = data;
        socket.handshake.session.save((err) => {
          if (err) {
            console.error("Error saving session clipboard data:", err);
            return;
          }
          const currentUserId = socket.handshake.session.user;
          const sockets = io.sockets.sockets;
          sockets.forEach((connectedSocket) => {
            if (connectedSocket.handshake.session.user.id === currentUserId.id) {
              connectedSocket.emit("clipboard", data);
            }
          });
        });
      });
      socket.on("request_clipboard", () => {
        if (socket.handshake.session.user) {
          const userId = socket.handshake.session.user.id;
          const sockets = io.sockets.sockets;

          sockets.forEach((connectedSocket) => {
            if (connectedSocket.handshake.session.user && connectedSocket.handshake.session.user.id === userId && connectedSocket.handshake.session.clipboard) {
              socket.emit("clipboard", connectedSocket.handshake.session.clipboard);
            }
          });
        }
      });
      socket.on("request_filelist", () => {
        console.log("filelist requested");
        if (socket.handshake.session.user) {
          const userId = socket.handshake.session.user.id;
          const sockets = io.sockets.sockets;
          const filesList = userFilesMap.get(userId) || []

          sockets.forEach((socket) => {
            if (socket.handshake.session.user.id === userId) {
              socket.emit("filesUploaded", filesList);
            }
          });
        }
      });
      socket.on("disconnect", () => {
        console.log("A user disconnected");
      });
    } else {
      console.log("A user tried to connect without a valid session");
      socket.disconnect(true);
    }
  });
}

module.exports = { setupWebsocket };
