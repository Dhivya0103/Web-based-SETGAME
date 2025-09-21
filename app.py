from flask import Flask, send_from_directory
from flask_socketio import SocketIO, emit, join_room
import uuid

app = Flask(__name__, static_folder="templates", static_url_path="")
socketio = SocketIO(app, cors_allowed_origins="*")

@app.route("/")
def home():
    return send_from_directory("templates", "index.html")

# multiplayer events
@socketio.on("create_room")
def handle_create_room(data):
    room_id = str(uuid.uuid4())[:6]
    join_room(room_id)
    emit("room_created", {"room_id": room_id})

@socketio.on("join_room")
def handle_join(data):
    username = data.get("username")
    room = data.get("room")
    if not room:
        emit("error", {"message": "Room code required"})
        return
    join_room(room)
    emit("player_joined", {"players": [username]}, room=room)

if __name__ == "__main__":
    socketio.run(app, host="0.0.0.0", port=1024, debug=True)
