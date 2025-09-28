# File: app.py
# This file contains the complete server-side logic for the SET game.

import os
from flask import Flask, render_template, request
from flask_socketio import SocketIO, join_room, emit, leave_room
import random

# Use a global dictionary to store game states.
# The key is the room ID.
games = {}

# Card features: shape, color, number, shading
SHAPES = ["diamond", "oval", "squiggle"]
COLORS = ["red", "green", "purple"]
NUMBERS = [1, 2, 3]
SHADINGS = ["solid", "striped", "open"]

app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret!'
# Use os.environ.get('PORT') to dynamically get the port from the environment
port = int(os.environ.get('PORT', 5001))
socketio = SocketIO(app, cors_allowed_origins="*")

def generate_deck():
    """Generates a standard 81-card SET deck."""
    deck = []
    for shape in SHAPES:
        for color in COLORS:
            for number in NUMBERS:
                for shading in SHADINGS:
                    deck.append({
                        "shape": shape,
                        "color": color,
                        "number": number,
                        "shading": shading
                    })
    random.shuffle(deck)
    return deck

def is_set(cards):
    """Checks if three cards form a set."""
    if len(cards) != 3:
        return False

    features = [
        [cards[0]['shape'], cards[1]['shape'], cards[2]['shape']],
        [cards[0]['color'], cards[1]['color'], cards[2]['color']],
        [cards[0]['number'], cards[1]['number'], cards[2]['number']],
        [cards[0]['shading'], cards[1]['shading'], cards[2]['shading']]
    ]

    for feature_set in features:
        # Check if all features are the same or all are different
        if not (len(set(feature_set)) == 1 or len(set(feature_set)) == 3):
            return False
    return True

def find_set_on_board(board):
    """Finds a valid set on the board, returns a list of indices or None."""
    for i in range(len(board)):
        for j in range(i + 1, len(board)):
            for k in range(j + 1, len(board)):
                if is_set([board[i], board[j], board[k]]):
                    return [i, j, k]
    return None

def deal_initial_cards(room_id):
    """Deals the initial 12 cards to the board for a specific room."""
    games[room_id]['board'] = [games[room_id]['deck'].pop() for _ in range(12)]

    # CRITICAL UPDATE: Ensure the initial board has a set.
    # Keep adding cards until at least one set is found.
    while find_set_on_board(games[room_id]['board']) is None and len(games[room_id]['deck']) >= 3:
        new_cards = [games[room_id]['deck'].pop() for _ in range(3)]
        games[room_id]['board'].extend(new_cards)


@app.route('/')
def index():
    return render_template('index.html')

@socketio.on('connect')
def handle_connect():
    sid = request.sid
    print(f"Client connected: {sid}")

@socketio.on('join')
def on_join(data):
    # This event is for a player joining a specific room.
    player_name = data['player_name']
    room_id = data['room_id']

    if room_id not in games:
        # If the room doesn't exist, this player is the host.
        games[room_id] = {
            'deck': generate_deck(),
            'board': [],
            'players': [],
            'scores': {},
            'player_sids': {},
        }
        deal_initial_cards(room_id)
        
    games[room_id]['player_sids'][player_name] = request.sid
    if player_name not in games[room_id]['players']:
        games[room_id]['players'].append(player_name)
        games[room_id]['scores'][player_name] = 0

    join_room(room_id)
    emit('player_joined', {'player_name': player_name}, to=room_id)
    print(f"{player_name} has joined room {room_id}")

    # Immediately send the current board state to the new player
    emit('deal_cards', {'board': games[room_id]['board']}, to=request.sid)
    emit('update_score', {'scores': games[room_id]['scores']}, room=room_id)

@socketio.on('submit_set')
def submit_set(data):
    cards_data = data['cards']
    player_name = data['player_name']
    room_id = data['room_id']

    if room_id not in games:
        return # No game to submit a set to

    # Convert the received card data back into a list of card objects
    submitted_cards = [
        next(c for c in games[room_id]['board'] if 
             c['shape'] == card['shape'] and 
             c['color'] == card['color'] and 
             c['number'] == card['number'] and 
             c['shading'] == card['shading'])
        for card in cards_data
    ]

    if is_set(submitted_cards):
        games[room_id]['scores'][player_name] += 1
        
        # Remove the found set cards from the board
        new_board = [c for c in games[room_id]['board'] if c not in submitted_cards]
        
        # Deal new cards if the deck is not empty
        if len(games[room_id]['deck']) >= 3:
            new_cards = [games[room_id]['deck'].pop() for _ in range(3)]
            new_board.extend(new_cards)
        
        games[room_id]['board'] = new_board
        
        # CRITICAL UPDATE: Check if the new board has a set.
        while find_set_on_board(games[room_id]['board']) is None and len(games[room_id]['deck']) >= 3:
            new_cards_to_add = [games[room_id]['deck'].pop() for _ in range(3)]
            games[room_id]['board'].extend(new_cards_to_add)

        emit('set_found', {'player_name': player_name}, room=room_id)
        emit('deal_cards', {'board': games[room_id]['board']}, room=room_id)
        emit('update_score', {'scores': games[room_id]['scores']}, room=room_id)
    else:
        # A simple emit for a client-side alert
        emit('invalid_set', {'player_name': player_name}, to=request.sid)

@socketio.on('add_cards')
def add_cards(data):
    room_id = data['room_id']
    if room_id in games and len(games[room_id]['deck']) >= 3:
        new_cards = [games[room_id]['deck'].pop() for _ in range(3)]
        games[room_id]['board'].extend(new_cards)
        emit('deal_cards', {'board': games[room_id]['board']}, room=room_id)

@socketio.on('leave_room')
def on_leave(data):
    room_id = data['room_id']
    player_name = data['player_name']
    leave_room(room_id)
    # Remove player from the game state
    games[room_id]['players'].remove(player_name)
    del games[room_id]['scores'][player_name]
    emit('player_left', {'player_name': player_name}, room=room_id)

    # If the last player leaves, delete the game
    if not games[room_id]['players']:
        del games[room_id]

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=port)
