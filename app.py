import eventlet
eventlet.monkey_patch()

from flask import Flask, render_template
from flask_socketio import SocketIO, join_room, emit
import random, string

app = Flask(__name__, template_folder="templates")
socketio = SocketIO(app, cors_allowed_origins="*")

rooms = {}

@app.route("/")
def index():
    return render_template("index.html")  # ✅ serves your game

@socketio.on("create_room")
def create_room():
    room_id = ''.join(random.choices(string.ascii_uppercase + string.digits, k=5))
    rooms[room_id] = {"players": [], "scores": {}}
    emit("room_created", {"room_id": room_id})

@socketio.on("join_room")
def on_join(data):
    username = data["username"]
    room_id = data["room"]
    if room_id in rooms:
        join_room(room_id)
        rooms[room_id]["players"].append(username)
        rooms[room_id]["scores"][username] = 0
        emit("player_joined", {"players": rooms[room_id]["players"]}, to=room_id)
    else:
        emit("error", {"message": "Room does not exist"})

if __name__ == "__main__":
    socketio.run(app, host="0.0.0.0", port=5000)
