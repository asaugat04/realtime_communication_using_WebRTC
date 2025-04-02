// server.js
const express = require("express");
const http = require("http");
const socket = require("socket.io");
const path = require("path");

// Create Express app
const app = express();
const server = http.createServer(app);
const io = socket(server);

// Serve static files from public directory
app.use(express.static(path.join(__dirname, "public")));
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Map of active users
const users = {};

// Socket.io connection handling
io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Handle user joining
  socket.on("register", (username) => {
    console.log(`${username} registered`);
    users[socket.id] = username;
    // Notify all clients about active users
    io.emit("active-users", getActiveUsers());
  });

  // Handle call initiation
  socket.on("call-user", (data) => {
    console.log(`Call initiated from ${users[socket.id]} to ${users[data.to]}`);
    io.to(data.to).emit("call-made", {
      offer: data.offer,
      from: socket.id,
      username: users[socket.id],
    });
  });

  // Handle call answer
  socket.on("make-answer", (data) => {
    console.log(`Call answered by ${users[socket.id]} to ${users[data.to]}`);
    io.to(data.to).emit("answer-made", {
      answer: data.answer,
      from: socket.id,
    });
  });

  // Handle ICE candidates for WebRTC
  socket.on("ice-candidate", (data) => {
    io.to(data.to).emit("ice-candidate", {
      candidate: data.candidate,
      from: socket.id,
    });
  });

  // Handle call rejection
  socket.on("reject-call", (data) => {
    io.to(data.from).emit("call-rejected", {
      from: socket.id,
    });
  });

  // Handle call ending
  socket.on("end-call", (data) => {
    io.to(data.to).emit("call-ended", {
      from: socket.id,
    });
  });

  // Handle disconnection
  socket.on("disconnect", () => {
    console.log(`User disconnected: ${users[socket.id]}`);
    delete users[socket.id];
    // Notify all clients about active users
    io.emit("active-users", getActiveUsers());
  });
});

// Helper function to get list of active users
function getActiveUsers() {
  const activeUsers = [];
  for (const [id, username] of Object.entries(users)) {
    activeUsers.push({ id, username });
  }
  return activeUsers;
}

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
