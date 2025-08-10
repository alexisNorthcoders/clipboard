const sharedsession = require("express-socket.io-session");
const jwt = require("jsonwebtoken");
const { getFilesForUser } = require("./redis");

function setupWebsocket(io, sessionMiddleware) {
  let currentClipboardData = "";

  // Custom middleware for JWT verification - for magiclink login
  io.use(
    sharedsession(sessionMiddleware, { autoSave: true })
  );

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;

    if (token) {
      jwt.verify(token, process.env.DATABASE_SECRET, (err, decoded) => {
        if (err) {
          return next(new Error("Authentication error: invalid token"));
        }

        socket.handshake.session.user = {
          id: decoded.userId,
          username: decoded.user.username,
          isAnonymous: decoded.user.isAnonymous || false,
        };

        next();
      });
    } else {
      next();
    }
  });

  io.use(
    sharedsession(sessionMiddleware, {
      autoSave: true,
    })
  );

  io.on("connection", async (socket) => {
    if (!socket.handshake.session?.user) {
      return socket.disconnect(true);
    }

    currentClipboardData = socket.handshake.session.clipboard || "";
    socket.emit("clipboard", currentClipboardData);
    const { username } = socket.handshake.session.user
    socket.emit("username", username);
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
          if (connectedSocket.handshake.session.user?.id === currentUserId.id) {
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
          if (
            connectedSocket.handshake.session.user &&
            connectedSocket.handshake.session.user.id === userId &&
            connectedSocket.handshake.session.clipboard
          ) {
            socket.emit("clipboard", connectedSocket.handshake.session.clipboard);
          }
        });
      }
    });

    socket.on("request_filelist", async () => {
      if (socket.handshake.session.user) {
        const userId = socket.handshake.session.user.id;
        const sockets = io.sockets.sockets;
        const filesFromUserId = await getFilesForUser(userId);

        sockets.forEach((socket) => {
          if (socket.handshake.session.user.id === userId) {
            socket.emit("filesUploaded", filesFromUserId);
          }
        });
      }
    });

    socket.on("disconnect", () => { });
  });
}

module.exports = { setupWebsocket };