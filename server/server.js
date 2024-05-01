const https = require("https"); // Import 'https' instead of 'http'
const fs = require("fs");
const express = require("express");
const socketIo = require("socket.io");
const path = require("path");
const cors = require("cors");

const options = {
  key: fs.readFileSync("localhost+2-key.pem"),
  cert: fs.readFileSync("localhost+2.pem"),
};
console.log(options);
const app = express();
const server = https.createServer(options, app); // Create an HTTPS server
app.use(cors());

const io = socketIo(server); // Attach socket.io to the server

const PORT = process.env.PORT || 8000;

// Create a users map to keep track of users
const users = new Map();

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);
  users.set(socket.id, socket.id);

  // Emit that a new user has joined as soon as someone joins
  socket.broadcast.emit("users:joined", socket.id);
  socket.emit("hello", { id: socket.id });

  socket.on("outgoing:call", (data) => {
    const { fromOffer, to } = data;
    socket.to(to).emit("incoming:call", { from: socket.id, offer: fromOffer });
  });

  socket.on("call:accepted", (data) => {
    const { answer, to } = data;
    socket.to(to).emit("incoming:answer", { from: socket.id, offer: answer });
  });

  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`);
    users.delete(socket.id);
    socket.broadcast.emit("user:disconnect", socket.id);
  });
});

app.use(express.static(path.resolve("./../client"))); // Check your directory path

app.get("/users", (req, res) => {
  return res.json(Array.from(users.keys())); // Ensure it returns an array of user IDs
});

app.get("/", (req, res) => {
  // res.sendFile("./../client/index.html");
  res.send("hello");
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Listening on *:${PORT}`);
});
