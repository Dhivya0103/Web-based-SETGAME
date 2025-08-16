# test_set_game.py

# Import the main set game logic from your project file
from set_game import is_set, Card

def test_is_set_function():
    """
    This function contains a series of tests for the is_set() function.
    It checks for various valid and invalid sets.
    """
    print("Running tests for is_set()...")

    # --- TEST CASES FOR VALID SETS ---

    # Case 1: All features are the same (Number, Color, Shape)
    card1 = Card(number=0, color=0, shape=0)
    card2 = Card(number=0, color=0, shape=0)
    card3 = Card(number=0, color=0, shape=0)
    assert is_set([card1, card2, card3]) == True, "Test Case 1 Failed: All same features should be a set."

    # Case 2: All features are different
    card1 = Card(number=0, color=0, shape=0)
    card2 = Card(number=1, color=1, shape=1)
    card3 = Card(number=2, color=2, shape=2)
    assert is_set([card1, card2, card3]) == True, "Test Case 2 Failed: All different features should be a set."

    # Case 3: Mixed (Number=same, Color=same, Shape=different)
    card1 = Card(number=0, color=0, shape=0)
    card2 = Card(number=0, color=0, shape=1)
    card3 = Card(number=0, color=0, shape=2)
    assert is_set([card1, card2, card3]) == True, "Test Case 3 Failed: Mixed features should be a set."

    # Case 4: Another mixed combination (Number=different, Color=different, Shape=same)
    card1 = Card(number=0, color=0, shape=0)
    card2 = Card(number=1, color=1, shape=0)
    card3 = Card(number=2, color=2, shape=0)
    assert is_set([card1, card2, card3]) == True, "Test Case 4 Failed: Another mixed combination should be a set."

    # --- TEST CASES FOR INVALID SETS ---

    # Case 5: Number feature is not all same or all different (0, 0, 1)
    card1 = Card(number=0, color=0, shape=0)
    card2 = Card(number=0, color=1, shape=1)
    card3 = Card(number=1, color=2, shape=2)
    assert is_set([card1, card2, card3]) == False, "Test Case 5 Failed: Invalid Number feature should not be a set."

    # Case 6: Color feature is not all same or all different (0, 1, 1)
    card1 = Card(number=0, color=0, shape=0)
    card2 = Card(number=1, color=1, shape=1)
    card3 = Card(number=2, color=1, shape=2)
    assert is_set([card1, card2, card3]) == False, "Test Case 6 Failed: Invalid Color feature should not be a set."

    # Case 7: Shape feature is not all same or all different (0, 1, 1)
    card1 = Card(number=0, color=0, shape=0)
    card2 = Card(number=1, color=1, shape=1)
    card3 = Card(number=2, color=2, shape=1)
    assert is_set([card1, card2, card3]) == False, "Test Case 7 Failed: Invalid Shape feature should not be a set."

    print("All tests passed!")

# Run the tests when the script is executed
if __name__ == '__main__':
    test_is_set_function()