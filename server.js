// server.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" }
});

let rooms = {};

io.on("connection", (socket) => {
  console.log("🔌 A user connected:", socket.id);

  // Create a new game room
  socket.on("create_room", ({ username }) => {
    const roomId = Math.random().toString(36).substr(2, 6).toUpperCase();
    socket.join(roomId);
    rooms[roomId] = {
      players: [{ id: socket.id, username, score: 0 }],
      deck: [],
      table: [],
      gameStarted: false
    };
    console.log(`🎉 Room created: ${roomId}`);
    socket.emit("room_created", { room_id: roomId });
  });

  // Join existing room
  socket.on("join_room", ({ username, room }) => {
    if (rooms[room]) {
      socket.join(room);
      rooms[room].players.push({ id: socket.id, username, score: 0 });
      console.log(`👥 ${username} joined room ${room}`);
      io.to(room).emit("player_joined", {
        username,
        players: rooms[room].players
      });
    } else {
      socket.emit("error", { message: "Room not found" });
    }
  });

  // Sync state
  socket.on("sync_state", (state) => {
    io.to(state.room).emit("game_state", state);
  });

  // Update state (deck/table)
  socket.on("update_state", (state) => {
    if (rooms[state.room]) {
      rooms[state.room].deck = state.deck;
      rooms[state.room].table = state.table;
      rooms[state.room].gameStarted = state.gameStarted;
      io.to(state.room).emit("game_state", state);
    }
  });

  // Update scores
  socket.on("score_update", ({ room, username }) => {
    if (rooms[room]) {
      const player = rooms[room].players.find(p => p.username === username);
      if (player) player.score += 1;
      io.to(room).emit("scoreboard", rooms[room].players);
    }
  });

  // Handle disconnect
  socket.on("disconnect", () => {
    console.log("❌ User disconnected:", socket.id);
    for (let roomId in rooms) {
      rooms[roomId].players = rooms[roomId].players.filter(p => p.id !== socket.id);
      io.to(roomId).emit("scoreboard", rooms[roomId].players);
    }
  });
});

const PORT = 4000;
server.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
