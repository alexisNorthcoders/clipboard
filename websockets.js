const { getFileInformation } = require("./utils");
const path = require('path');
const sharedsession = require("express-socket.io-session");

function setupWebsocket(io,sessionMiddleware){
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
            const fileInfos = await getFileInformation(path.join(__dirname, "uploads"));
            socket.emit("filesUploaded", fileInfos);
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
          socket.on("disconnect", () => {
            console.log("A user disconnected");
          });
        } else {
          console.log("A user tried to connect without a valid session");
          socket.disconnect(true);
        }
      }); 
}

module.exports={setupWebsocket}