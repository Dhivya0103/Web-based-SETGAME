const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(cors());

let rooms = {};

io.on("connection", (socket) => {
  console.log("🔌 Client connected:", socket.id);

  socket.on("create_room", ({ username }) => {
    const roomId = Math.random().toString(36).substring(2, 7);
    rooms[roomId] = { players: [{ username, score: 0 }], deck: [], table: [], gameStarted: false };
    socket.join(roomId);
    socket.emit("room_created", { room_id: roomId });
    io.to(roomId).emit("scoreboard", rooms[roomId].players);
    console.log(`🎲 Room created: ${roomId}`);
  });

  socket.on("join_room", ({ username, room }) => {
    if (rooms[room]) {
      rooms[room].players.push({ username, score: 0 });
      socket.join(room);
      io.to(room).emit("player_joined", { username, players: rooms[room].players });
      io.to(room).emit("scoreboard", rooms[room].players);
      console.log(`👤 ${username} joined room ${room}`);
    }
  });

  socket.on("update_state", ({ room, deck, table, gameStarted }) => {
    if (rooms[room]) {
      rooms[room].deck = deck;
      rooms[room].table = table;
      rooms[room].gameStarted = gameStarted;
      io.to(room).emit("game_state", rooms[room]);
    }
  });

  socket.on("score_update", ({ room, username }) => {
    if (rooms[room]) {
      const player = rooms[room].players.find(p => p.username === username);
      if (player) player.score += 1;
      io.to(room).emit("scoreboard", rooms[room].players);

      // Check game over
      const noMoreCards = rooms[room].deck.length === 0;
      const noMoreSets = rooms[room].table.length === 0; // client does set-check
      if (noMoreCards && noMoreSets) {
        const winner = [...rooms[room].players].sort((a, b) => b.score - a.score)[0];
        io.to(room).emit("game_over", { winner });
        console.log(`🏆 Game Over in room ${room}, Winner: ${winner.username}`);
      }
    }
  });

  socket.on("disconnect", () => {
    console.log("❌ Client disconnected:", socket.id);
  });
});

const PORT = 4000;
server.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
