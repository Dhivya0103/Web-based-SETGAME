const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static(__dirname + "/public"));

const SHAPES = ["diamond","oval","squiggle"];
const COLORS = ["red","green","blue"];
const NUMBERS = [1,2,3];

const games = {}; // gameId -> { deck, table, players, hostId, timerStartMs }

function shuffle(a){ return a.sort(()=>Math.random()-0.5); }

function buildDeck(){
    const d = [];
    for(const s of SHAPES) for(const c of COLORS) for(const n of NUMBERS){
        d.push({ shape:s, color:c, number:n });
    }
    return shuffle(d);
}

function dealUpTo12(game){
    while(game.table.length<12 && game.deck.length>0) game.table.push(game.deck.shift());
}

function isSet(game,i1,i2,i3){
    const c=[game.table[i1], game.table[i2], game.table[i3]];
    if(c.some(x=>!x)) return false;
    const props=["shape","color","number"];
    return props.every(p=>{
        const vals=c.map(v=>v[p]);
        const uniq=new Set(vals);
        return uniq.size===1 || uniq.size===3;
    });
}

function broadcastState(gameId){
    const g=games[gameId];
    if(!g) return;
    io.to(gameId).emit("state", {
        table: g.table,
        players: g.players,
        timerStartMs: g.timerStartMs || null
    });
}

io.on("connection", socket=>{
    socket.on("createGame", ({ gameId, name })=>{
        games[gameId]={ deck: buildDeck(), table: [], players:{}, hostId: socket.id, timerStartMs: null };
        games[gameId].players[socket.id] = { name, score: 0 };
        dealUpTo12(games[gameId]);
        socket.join(gameId);
        socket.emit("gameCreated", gameId);
        broadcastState(gameId);
    });

    socket.on("joinGame", ({ gameId, name })=>{
        if(!games[gameId]) return socket.emit("error","Room not found");
        games[gameId].players[socket.id] = { name, score: 0 };
        socket.join(gameId);
        broadcastState(gameId);
    });

    socket.on("submitSet", ({ gameId, indices })=>{
        const g = games[gameId];
        if(!g) return;
        if(isSet(g, ...indices)){
            indices.sort((a,b)=>b-a).forEach(i=>g.table.splice(i,1));
            g.players[socket.id].score += 1;
            dealUpTo12(g);
            io.to(gameId).emit("setResult",{ ok:true });
        } else io.to(socket.id).emit("setResult",{ ok:false, reason:"Not a SET" });
        broadcastState(gameId);
    });

    socket.on("hintUsed", gameId=>{
        const g = games[gameId];
        if(!g) return;
        // Simple hint: highlight first possible set
        outer: for(let i=0;i<g.table.length;i++)
            for(let j=i+1;j<g.table.length;j++)
                for(let k=j+1;k<g.table.length;k++)
                    if(isSet(g,i,j,k)){
                        io.to(socket.id).emit("hint",{ indices:[i,j,k] });
                        break outer;
                    }
    });

    socket.on("endGame", gameId=>{
        io.to(gameId).emit("gameEnded");
        delete games[gameId];
    });

    socket.on("disconnect", ()=>{
        for(const gid in games){
            if(games[gid].players[socket.id]){
                delete games[gid].players[socket.id];
                broadcastState(gid);
            }
        }
    });
});

server.listen(3000, ()=>console.log("Server running on port 3000"));
