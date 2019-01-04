var init = function() {
  //--- start example JS ---
  var board,
    game = new Chess(),
    boardEl = $('#board'),
    statusEl = $('#status1'),
    fenEl = $('#fen'),
    pgnEl = $('#pgn'),
    squareClass = 'square-55d63',
    squareToHighlight,
    colorToHighlight;

  // do not pick up pieces if the game is over
  // only pick up pieces for the side to move
  var onDragStart = function(source, piece, position, orientation) {
    
    if (game.game_over() === true ||
        (game.turn() === 'w' && piece.search(/^b/) !== -1) ||
        (game.turn() === 'b' && piece.search(/^w/) !== -1)) {
      return false;
    }

    boardEl.find('*').removeClass('highlight-white');
    boardEl.find('*').removeClass('highlight-black');

    var possibleMoves = game.moves({square: source});
    for (var i = 0; i < possibleMoves.length; i++) {
      var possibleMove = possibleMoves[i]
        .replace('#', '')
        .replace('+', '');

      var possibleSquare = possibleMove
        .substr(possibleMove.length - 2, 2)

      boardEl.find('.square-' + possibleSquare).addClass('highlight-possible-move');
    }
  
    // see if the move is legal
    var move = game.move({
        from: source,
        to: null,
        promotion: 'q' // NOTE: always promote to a queen for example simplicity
      });

    if (move !== null) {
      // remove previous highlights of the same color
      if (move.color === 'w') {
        boardEl.find('.' + squareClass).removeClass('highlight-white');
      }
      else {
        boardEl.find('.square-55d63').removeClass('highlight-black'); 
      }
    }
  };
  
  var onDrop = function(source, target) {
    // TODO: remove all optional moves
    boardEl.find('*').removeClass('highlight-possible-move');

    // see if the move is legal
    var move = game.move({
      from: source,
      to: target,
      promotion: 'q' // NOTE: always promote to a queen for example simplicity
    });
  
    // illegal move
    if (move === null) return 'snapback';

    // highlight move
    boardEl = $('#board');
    if (move.color === 'w') {
      boardEl.find('.' + squareClass).removeClass('highlight-white');
      boardEl.find('.square-' + move.from).addClass('highlight-white');
      squareToHighlight = move.to;
      colorToHighlight = 'white';
    }
    else {
      boardEl.find('.square-55d63').removeClass('highlight-black');
      boardEl.find('.square-' + move.from).addClass('highlight-black');
      squareToHighlight = move.to;
      colorToHighlight = 'black';    
    }

    boardEl.find('.square-' + squareToHighlight)
        .addClass('highlight-' + colorToHighlight);

    updateStatus();
  };

  // update the board position after the piece snap 
  // for castling, en passant, pawn promotion
  var onSnapEnd = function() {
    board.position(game.fen());
  };
  
  var updateStatus = function() {
    var status = '';

    var moveColor = 'White';
    if (game.turn() === 'b') {
      moveColor = 'Black';
    }
  
    // checkmate?
    if (game.in_checkmate() === true) {
      status = 'Game over, ' + moveColor + ' is in checkmate.';
      alert(status);
    }
  
    // draw?
    else if (game.in_draw() === true) {
      status = 'Game over, drawn position';
      alert(status);
    }
  
    // game still on
    else {
      status = moveColor + ' to move';
  
      // check?
      if (game.in_check() === true) {
        status += ', ' + moveColor + ' is in check';
      }
    }
  
    statusEl.html(status);
    fenEl.html(game.fen());
    pgnEl.html(game.pgn());
  };
    
  var cfg = {
    draggable: true,
    position: 'start',
    onDragStart: onDragStart,
    onDrop: onDrop,
    onSnapEnd: onSnapEnd
  };

  board = ChessBoard('board', cfg);
    
  updateStatus();
}; // end init()

$(document).ready(init);

var start = function() {
  console.log('Starting new game!');
  init();
}