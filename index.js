const express = require("express");
const http = require("http");
const socketIo = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static("public"));

io.on("connection", (socket) => {
  console.log("A user connected");

  socket.on("clipboard", (data) => {
    console.log("Clipboard data received:", data);

    socket.broadcast.emit("clipboard", data);
  });

  socket.on("disconnect", () => {
    console.log("A user disconnected");
  });
});

const PORT = process.env.PORT || 4123;
server.listen(PORT, () => {
  console.log(`Clipboard Server is running on port ${PORT}`);
});
