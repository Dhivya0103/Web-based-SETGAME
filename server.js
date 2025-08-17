const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

const rooms = {};
// Structure:
// rooms[roomId] = {
//   players: [{ id, name, score }],
//   state: { deck, table, gameStarted, timer },
//   timerInterval
// };

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // Create room
  socket.on("create_room", ({ username, duration }) => {
    const roomId = Math.random().toString(36).substr(2, 6).toUpperCase();
    rooms[roomId] = {
      players: [{ id: socket.id, name: username, score: 0 }],
      state: { deck: [], table: [], gameStarted: false, timer: duration || 300 },
      timerInterval: null
    };
    socket.join(roomId);
    socket.emit("room_created", { room_id: roomId });
    console.log(`Room ${roomId} created by ${username}`);

    // Start countdown timer for the room
    startTimer(roomId);
  });

  // Join room
  socket.on("join_room", ({ username, room }) => {
    if (!rooms[room]) return;
    rooms[room].players.push({ id: socket.id, name: username, score: 0 });
    socket.join(room);

    io.to(room).emit("player_joined", {
      username,
      players: rooms[room].players
    });

    // Send current game state + scoreboard
    socket.emit("game_state", rooms[room].state);
    io.to(room).emit("scoreboard", rooms[room].players);

    console.log(`${username} joined room ${room}`);
  });

  // Update game state
  socket.on("update_state", ({ room, deck, table, gameStarted }) => {
    if (!rooms[room]) return;
    rooms[room].state = { ...rooms[room].state, deck, table, gameStarted };
    io.to(room).emit("game_state", rooms[room].state);
  });

  // When a set is found
  socket.on("found_set", ({ room }) => {
    if (!rooms[room]) return;
    const p = rooms[room].players.find(x => x.id === socket.id);
    if (p) p.score += 1;

    io.to(room).emit("scoreboard", rooms[room].players);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
    for (const roomId in rooms) {
      const room = rooms[roomId];
      const idx = room.players.findIndex(p => p.id === socket.id);
      if (idx !== -1) {
        room.players.splice(idx, 1);
        io.to(roomId).emit("scoreboard", room.players);
      }
    }
  });
});

// Timer function
function startTimer(roomId) {
  const room = rooms[roomId];
  if (!room) return;

  if (room.timerInterval) clearInterval(room.timerInterval);

  room.timerInterval = setInterval(() => {
    if (!room.state) return;
    room.state.timer -= 1;

    // Broadcast timer
    io.to(roomId).emit("timer_update", room.state.timer);

    if (room.state.timer <= 0) {
      clearInterval(room.timerInterval);
      io.to(roomId).emit("game_over", {
        players: room.players
      });
    }
  }, 1000);
}

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
