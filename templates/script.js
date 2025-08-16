const socket = io();

const lobby = document.getElementById("lobby");
const game = document.getElementById("game");
const createBtn = document.getElementById("createBtn");
const joinBtn = document.getElementById("joinBtn");
const hintBtn = document.getElementById("hintBtn");
const endBtn = document.getElementById("endBtn");
const playerList = document.getElementById("playerList");
const roomDisplay = document.getElementById("roomDisplay");
const cardsDiv = document.getElementById("cards");
const timerDisplay = document.getElementById("timerDisplay");

let currentRoom = "";
let selectedCards = [];
let timerInterval;

createBtn.onclick = () => {
    const name = document.getElementById("playerNameCreate").value.trim();
    if(!name) return alert("Enter your name");
    const gameId = Math.random().toString(36).substr(2,5).toUpperCase();
    currentRoom = gameId;
    socket.emit("createGame", { gameId, name });
    showGame();
};

joinBtn.onclick = () => {
    const name = document.getElementById("playerNameJoin").value.trim();
    const room = document.getElementById("roomIdJoin").value.trim();
    if(!name || !room) return alert("Enter name and room ID");
    currentRoom = room;
    socket.emit("joinGame", { gameId: room, name });
    showGame();
};

hintBtn.onclick = () => socket.emit("hintUsed", currentRoom);
endBtn.onclick = () => socket.emit("endGame", currentRoom);

function clickCard(i){
    selectedCards.push(i);
    if(selectedCards.length === 3){
        socket.emit("submitSet", { gameId: currentRoom, indices: selectedCards });
        selectedCards = [];
    }
}

socket.on("gameCreated", id => currentRoom = id);

socket.on("state", data => {
    playerList.innerHTML = "";
    Object.values(data.players).forEach(p => {
        const li = document.createElement("li");
        li.textContent = `${p.name}: ${p.score}`;
        playerList.appendChild(li);
    });

    cardsDiv.innerHTML = "";
    data.table.forEach((c,i) => {
        const btn = document.createElement("button");
        btn.textContent = `${c.number} ${c.color} ${c.shape}`;
        btn.style.backgroundColor = c.color;
        btn.onclick = () => clickCard(i);
        cardsDiv.appendChild(btn);
    });
});

socket.on("setResult", r => {
    if(r.ok) console.log("Correct SET!");
    else alert(r.reason);
});

socket.on("timerStarted", startMs => {
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        const diff = Math.max(0, Date.now() - startMs);
        const min = String(Math.floor(diff/60000)).padStart(2,'0');
        const sec = String(Math.floor((diff%60000)/1000)).padStart(2,'0');
        timerDisplay.textContent = `${min}:${sec}`;
    }, 1000);
});

socket.on("gameEnded", () => {
    alert("Game Ended!");
    clearInterval(timerInterval);
    lobby.style.display = "block";
    game.style.display = "none";
});

// Show game interface
function showGame(){
    lobby.style.display = "none";
    game.style.display = "block";
    roomDisplay.textContent = currentRoom;
}
