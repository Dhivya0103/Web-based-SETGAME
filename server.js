const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Store rooms { roomId: { players: [], deck: [], table: [], gameStarted: false } }
const rooms = {};

// --- Utility to find a valid set ---
const isSet = (a, b, c) => {
  const check = (key) => {
    const vals = [a[key], b[key], c[key]];
    return new Set(vals).size !== 2; // either all same or all different
  };
  return check("color") && check("shape") && check("number") && check("shading");
};

const findSet = (cards) => {
  for (let i = 0; i < cards.length - 2; i++) {
    for (let j = i + 1; j < cards.length - 1; j++) {
      for (let k = j + 1; k < cards.length; k++) {
        if (isSet(cards[i], cards[j], cards[k])) return true;
      }
    }
  }
  return false;
};

// --- Socket.io Events ---
io.on("connection", (socket) => {
  console.log("🔌 New client connected:", socket.id);

  // Create Room
  socket.on("create_room", ({ username }) => {
    const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    rooms[roomId] = {
      players: [{ name: username, score: 0 }],
      deck: [],
      table: [],
      gameStarted: false
    };
    socket.join(roomId);
    socket.emit("room_created", { room_id: roomId });
    console.log(`📦 Room ${roomId} created by ${username}`);
  });

  // Join Room
  socket.on("join_room", ({ username, room }) => {
    if (!rooms[room]) {
      socket.emit("error_message", { message: "Room not found" });
      return;
    }
    rooms[room].players.push({ name: username, score: 0 });
    socket.join(room);
    io.to(room).emit("player_joined", {
      username,
      players: rooms[room].players
    });
    console.log(`👥 ${username} joined room ${room}`);
  });

  // Sync state (from host)
  socket.on("sync_state", ({ room, deck, table, gameStarted }) => {
    if (!rooms[room]) return;
    rooms[room].deck = deck;
    rooms[room].table = table;
    rooms[room].gameStarted = gameStarted;
    io.to(room).emit("game_state", { deck, table, gameStarted });
  });

  // Update state (broadcast)
  socket.on("update_state", ({ room, deck, table, gameStarted }) => {
    if (!rooms[room]) return;
    rooms[room].deck = deck;
    rooms[room].table = table;
    rooms[room].gameStarted = gameStarted;
    io.to(room).emit("game_state", { deck, table, gameStarted });
  });

  // Score update
  socket.on("score_update", ({ room, username }) => {
    if (!rooms[room]) return;
    const players = rooms[room].players;
    const player = players.find((p) => p.name === username);
    if (player) player.score++;

    io.to(room).emit("scoreboard", players);

    // Check game over condition
    const { deck, table } = rooms[room];
    const noMoreCards = deck.length === 0;
    const noMoreSets = !findSet(table);

    if (noMoreCards && noMoreSets) {
      const winner =
        [...players].sort((a, b) => (b.score || 0) - (a.score || 0))[0] || {
          name: "Nobody",
          score: 0
        };
      io.to(room).emit("game_over", { winner });
      console.log(`🏆 Game Over in room ${room}. Winner: ${winner.name}`);
    }
  });

  socket.on("disconnect", () => {
    console.log("❌ Client disconnected:", socket.id);
  });
});

// --- Express endpoint ---
app.get("/", (req, res) => {
  res.send("SET Game Server is running ✅");
});

// --- Start server ---
const PORT = 4000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
