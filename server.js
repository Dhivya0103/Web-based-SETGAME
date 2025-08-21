const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 4000;

// store games { roomId: { players: [ {id, name, score} ], deck, table, started } }
const games = {};

app.get("/", (req, res) => {
  res.send("SET Game Server is running ✅");
});

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // Create a room
  socket.on("create_room", ({ username }) => {
    const roomId = Math.random().toString(36).substring(2, 6).toUpperCase();
    games[roomId] = {
      players: [{ id: socket.id, name: username, score: 0 }],
      deck: [],
      table: [],
      started: false,
    };
    socket.join(roomId);
    socket.emit("room_created", { room_id: roomId });
    console.log(`Room created: ${roomId}`);
  });

  // Join room
  socket.on("join_room", ({ username, room }) => {
    if (!games[room]) {
      socket.emit("error_message", { error: "Room not found" });
      return;
    }
    games[room].players.push({ id: socket.id, name: username, score: 0 });
    socket.join(room);

    // notify everyone
    io.to(room).emit("player_joined", {
      username,
      players: games[room].players,
    });
  });

  // Sync state from host
  socket.on("update_state", ({ room, deck, table, gameStarted }) => {
    if (games[room]) {
      games[room].deck = deck;
      games[room].table = table;
      games[room].started = gameStarted;
      socket.to(room).emit("game_state", { deck, table, gameStarted });
    }
  });

  // Handle scoring
  socket.on("score_update", ({ room, username }) => {
    if (!games[room]) return;
    const player = games[room].players.find((p) => p.name === username);
    if (player) {
      player.score += 1;
      console.log(`${username} scored! -> ${player.score}`);
    }
    // ✅ broadcast updated scoreboard to ALL clients in room
    io.to(room).emit("scoreboard", games[room].players);
  });

  // Handle sync request
  socket.on("sync_state", ({ room, deck, table, gameStarted }) => {
    if (games[room]) {
      games[room].deck = deck;
      games[room].table = table;
      games[room].started = gameStarted;
      io.to(room).emit("game_state", { deck, table, gameStarted });
    }
  });

  // Disconnect cleanup
  socket.on("disconnect", () => {
    for (const room in games) {
      games[room].players = games[room].players.filter(
        (p) => p.id !== socket.id
      );
      io.to(room).emit("scoreboard", games[room].players);
    }
    console.log("User disconnected:", socket.id);
  });
});

server.listen(PORT, () =>
  console.log(`✅ Server running on http://localhost:${PORT}`)
);
