import random
from itertools import combinations

# The features for a beginner's SET game (27 cards)
FEATURES = {
    'number': [1, 2, 3],
    'color': ['red', 'green', 'purple'],
    'shape': ['diamond', 'squiggle', 'oval'],
}

class Card:
    """Represents a single card in the game."""
    def __init__(self, number, color, shape):
        self.number = number
        self.color = color
        self.shape = shape

    def __repr__(self):
        return f"Card({self.number}, '{self.color}', '{self.shape}')"

    def to_dict(self):
        """Converts the card object to a dictionary for JSON serialization."""
        return {'number': self.number, 'color': self.color, 'shape': self.shape}

def generate_all_cards():
    """Generates a deck of all possible cards (27 cards for the beginner version)."""
    deck = []
    for number in FEATURES['number']:
        for color in FEATURES['color']:
            for shape in FEATURES['shape']:
                deck.append(Card(number, color, shape))
    random.shuffle(deck)
    return deck

def is_set(cards):
    """Checks if three cards form a valid set."""
    if len(cards) != 3:
        return False

    def is_feature_set(card_list, feature_name):
        values = {getattr(c, feature_name) for c in card_list}
        return len(values) == 1 or len(values) == 3

    return (
        is_feature_set(cards, 'number') and
        is_feature_set(cards, 'color') and
        is_feature_set(cards, 'shape')
    )

def find_all_sets(cards):
    """Finds all possible sets in a given list of cards."""
    sets = []
    for combo in combinations(cards, 3):
        if is_set(combo):
            sets.append(list(combo))
    return sets

def serialize_cards(cards):
    """Converts a list of Card objects to dictionaries."""
    return [c.to_dict() for c in cards]
