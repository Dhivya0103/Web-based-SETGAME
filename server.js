const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Keep track of rooms and players
const rooms = {};  
// Example: rooms = { roomId: { players: [ { name, score } ], deck: [], table: [] } }

io.on("connection", (socket) => {
  console.log("⚡ A user connected:", socket.id);

  // --- Create Room ---
  socket.on("create_room", (data) => {
    const roomId = Math.random().toString(36).substr(2, 5);
    rooms[roomId] = { players: [{ name: data.username, score: 0 }], deck: [], table: [] };
    socket.join(roomId);
    socket.emit("room_created", { room_id: roomId });
    console.log(`🆕 Room created ${roomId} by ${data.username}`);
  });

  // --- Join Room ---
  socket.on("join_room", (data) => {
    if (!rooms[data.room]) return;
    socket.join(data.room);
    rooms[data.room].players.push({ name: data.username, score: 0 });
    io.to(data.room).emit("player_joined", {
      username: data.username,
      players: rooms[data.room].players
    });
    console.log(`👥 ${data.username} joined room ${data.room}`);
  });

  // --- Sync State from host ---
  socket.on("sync_state", (data) => {
    if (rooms[data.room]) {
      rooms[data.room].deck = data.deck;
      rooms[data.room].table = data.table;
      rooms[data.room].gameStarted = data.gameStarted;
      io.to(data.room).emit("game_state", rooms[data.room]);
    }
  });

  // --- Update state broadcast ---
  socket.on("update_state", (data) => {
    if (rooms[data.room]) {
      rooms[data.room].deck = data.deck;
      rooms[data.room].table = data.table;
      rooms[data.room].gameStarted = data.gameStarted;
      io.to(data.room).emit("game_state", rooms[data.room]);
    }
  });

  // --- Handle scoring ---
  socket.on("score_update", (data) => {
    if (!rooms[data.room]) return;
    const players = rooms[data.room].players;
    const player = players.find(p => p.name === data.username);
    if (player) player.score = (player.score || 0) + 1;
    io.to(data.room).emit("scoreboard", players);
    console.log(`🏆 ${data.username} scored in ${data.room}:`, players);
  });

  // --- Disconnect ---
  socket.on("disconnect", () => {
    console.log("❌ User disconnected:", socket.id);
    // (optional) Remove from rooms
  });
});

const PORT = 4000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
