import eventlet
eventlet.monkey_patch()

from flask import Flask, render_template
from flask_socketio import SocketIO, join_room, emit
import random
import string

# --- Flask + Socket.IO setup ---
app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*")

# --- In-memory storage for rooms ---
rooms = {}  # room_id -> { 'players': [], 'scores': {} }

# --- Routes ---
@app.route("/")
def index():
    # Serve index.html (make sure it's inside a "templates" folder)
    return render_template("index.html")

# --- Socket.IO Events ---
@socketio.on("create_room")
def create_room():
    """Create a new multiplayer room"""
    room_id = "".join(random.choices(string.ascii_uppercase + string.digits, k=5))
    rooms[room_id] = {"players": [], "scores": {}}
    emit("room_created", {"room_id": room_id})


@socketio.on("join_room")
def on_join(data):
    """Join an existing room"""
    username = data.get("username")
    room_id = data.get("room")

    if room_id in rooms:
        join_room(room_id)
        rooms[room_id]["players"].append(username)
        rooms[room_id]["scores"][username] = 0
        emit("player_joined", {"players": rooms[room_id]["players"]}, to=room_id)
    else:
        emit("error", {"message": "Room does not exist"})


# --- Entry Point ---
if __name__ == "__main__":
    # For local development
    print("🚀 Running SET Game locally at http://127.0.0.1:1024")
    socketio.run(app, host="0.0.0.0", port=1024, debug=True)
