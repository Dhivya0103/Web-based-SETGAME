from flask import Flask, send_from_directory, request
from flask_socketio import SocketIO, emit, join_room, leave_room
import uuid

app = Flask(__name__, static_folder=".", static_url_path="")
socketio = SocketIO(app, cors_allowed_origins="*")

# In-memory storage for game rooms and their states
rooms = {}

@app.route("/")
def home():
    return send_from_directory(".", "index.html")

@socketio.on("create_room")
def handle_create_room(data):
    room_id = str(uuid.uuid4())[:6]
    join_room(room_id)
    rooms[room_id] = {
        'players': [{'name': data.get("username"), 'score': 0, 'sid': request.sid}],
        'deck': [],
        'table': [],
        'gameStarted': False
    }
    emit("room_created", {"room_id": room_id}, room=request.sid)
    emit("scoreboard", rooms[room_id]['players'], room=room_id)

@socketio.on("join_room")
def handle_join(data):
    username = data.get("username")
    room_id = data.get("room")

    if room_id not in rooms:
        emit("error", {"message": "Room not found"}, room=request.sid)
        return

    join_room(room_id)
    # Add new player to the room's player list
    rooms[room_id]['players'].append({'name': username, 'score': 0, 'sid': request.sid})

    # Send the current game state to the new player only
    emit("game_state", rooms[room_id], room=request.sid)

    # Broadcast the updated scoreboard to all players in the room
    emit("scoreboard", rooms[room_id]['players'], room=room_id)

@socketio.on("start_game")
def handle_start_game(data):
    room_id = data.get("room")
    game_data = data.get("game_data")
    if room_id in rooms:
        rooms[room_id]['deck'] = game_data['deck']
        rooms[room_id]['table'] = game_data['table']
        rooms[room_id]['gameStarted'] = True
        emit("game_state", rooms[room_id], room=room_id)

@socketio.on("submit_set")
def handle_submit_set(data):
    room_id = data.get("room")
    username = data.get("username")
    new_deck = data.get("newDeck")
    new_table = data.get("newTable")

    if room_id in rooms and username:
        # Update the server's state
        rooms[room_id]['deck'] = new_deck
        rooms[room_id]['table'] = new_table

        # Update the score
        for p in rooms[room_id]['players']:
            if p['name'] == username:
                p['score'] += 1
                break

        # Broadcast the updated state and scoreboard to all players
        emit("game_state", rooms[room_id], room=room_id)
        emit("scoreboard", rooms[room_id]['players'], room=room_id)

@socketio.on("deal_three")
def handle_deal_three(data):
    room_id = data.get("room")
    new_deck = data.get("newDeck")
    new_table = data.get("newTable")
    if room_id in rooms:
        rooms[room_id]['deck'] = new_deck
        rooms[room_id]['table'] = new_table
        emit("game_state", rooms[room_id], room=room_id)

if __name__ == "__main__":
    socketio.run(app, host="0.0.0.0", port=1024, debug=True)