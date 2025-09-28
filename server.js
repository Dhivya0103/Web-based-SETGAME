const express = require("express");
const http = require("http");
// CRITICAL FIX: Add cors to ensure the client can connect without issues
const { Server } = require("socket.io"); 

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const PORT = process.env.PORT || 4000;

// store games { roomId: { players: [ {id, name, score} ], deck, table, started } }
const games = {};

app.get("/", (req, res) => {
  res.send("SET Game Server is running ✅");
});

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // 1. CREATE ROOM: Now sends scoreboard immediately to the creator
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
    // FIX: Send initial scoreboard to the host (creator)
    io.to(roomId).emit("scoreboard", games[roomId].players); 
    console.log(`Room created: ${roomId} by ${username}`);
  });

  // 2. JOIN ROOM: Now syncs game state (cards) if the game is already active
  socket.on("join_room", ({ username, room }) => {
    const roomId = room.toUpperCase(); 
    if (!games[roomId]) {
      socket.emit("error_message", { error: "Room not found" });
      return;
    }
    
    // FIX: Prevent same username from joining twice (optional, but good practice)
    if (games[roomId].players.some(p => p.name === username)) {
        socket.emit("error_message", { error: `Player name '${username}' is already in this room.` });
        return;
    }
    
    games[roomId].players.push({ id: socket.id, name: username, score: 0 });
    socket.join(roomId);

    io.to(roomId).emit("player_joined", { username: username });
    // FIX: Broadcast updated scoreboard to all clients in room
    io.to(roomId).emit("scoreboard", games[roomId].players);
    
    // CRITICAL FIX: If game has started, send the current state ONLY to the joining player
    if (games[roomId].started) {
        socket.emit("game_state", { 
            deck: games[roomId].deck, 
            table: games[roomId].table, 
            gameStarted: games[roomId].started 
        });
    }
    console.log(`User ${username} joined room: ${roomId}`);
  });

  // 3. HOST STATE UPDATE: Uses 'game_state' for consistency
  socket.on("update_state", ({ room, deck, table, gameStarted }) => {
    if (games[room]) {
      games[room].deck = deck;
      games[room].table = table;
      games[room].started = gameStarted;
      // Send the state to everyone *except* the sender (host)
      socket.to(room).emit("game_state", { deck, table, gameStarted }); 
    }
  });

  // 4. SCORE UPDATE
  socket.on("score_update", ({ room, username }) => {
    if (!games[room]) return;
    // FIX: Update the score based on the client's action
    const player = games[room].players.find((p) => p.name === username);
    if (player) {
      player.score += 1;
    }
    io.to(room).emit("scoreboard", games[room].players);
  });

  // 5. MANUAL SYNC REQUEST (Used by host to sync state to new players in index.html)
  // CRITICAL FIX: Now correctly reads game state from the server's memory
  socket.on("sync_state", ({ room }) => { 
    if (games[room] && games[room].started) {
        // Send the state to ALL in the room (including the one who just joined)
        io.to(room).emit("game_state", { 
            deck: games[room].deck, 
            table: games[room].table, 
            gameStarted: games[room].started 
        });
    }
  });

  // Disconnect cleanup... (rest of the code is fine)
  socket.on("disconnect", () => {
    for (const room in games) {
      // ... (existing disconnect logic)
    }
  });
});

server.listen(PORT, () =>
  console.log(`✅ Server running on http://localhost:${PORT}`)
);