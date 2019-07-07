var pieceScores = {
    'p': 1, 'b': 3, 'n': 3, 'r': 5, 'q': 9, 'k': 1000,
    'P': 1, 'B': 3, 'N': 3, 'R': 5, 'Q': 9, 'K': 1000
}

var calculateScore = function(game, color) {
    console.log('__ calculateScore');

    pieces = game.fen()
        .replace(/\s.*/,'')
        .match(color == 'b' && /[prnbqk]/g || /[PRNBGQK]/g);

    var score = 0;

    for (var i = 0; i < pieces.length; i ++) {
        score = score + pieceScores[pieces[i]];
    }

    // if any piece of own color is on the E or D columns, add points

    // if any piece of own color is attacking the E or D columns, add points

    // if any piece can give check, add points

    

    console.log('Score: ' + score)
    return score;
}

var determineNextMove = function(game) {
    // depth 1: get best score
    var possibleMoves = game.moves();
    game2 = new Chess();
    
    var maxScore = -99999;
    var move = null;

    var ownColor = game.turn();
    var opponentColor = 'b';
    if (ownColor === 'b') { opponentColor = 'w'; }

    for (var i = 0; i < possibleMoves.length; i++) {
        var possibleMove = possibleMoves[i];
        game2.load(game.fen());
        game2.move(possibleMove);

        var ownScore = calculateScore(game2, ownColor);
        var opponentScore = calculateScore(game2, opponentColor);

        if (isNaN(opponentScore)) { opponentScore = 0}
        if (isNaN(ownScore)) { ownScore = 0}

        var score = ownScore - opponentScore;

        console.log('Opponent score of possible move ' + possibleMove + ' is ' + opponentScore);
        console.log('Own score of possible move ' + possibleMove + ' is ' + ownScore);
        console.log('Total score of possible move ' + possibleMove + ' is ' + score);

        if (score >= maxScore) {
            maxScore = score;
            move = possibleMove;
        }
    }

    return move;
}