// global variables
var board,
  game,
  boardEl = $('#board'),
  statusEl = $('#status1'),
  fenEl = $('#fen'),
  pgnEl = $('#pgn'),
  squareClass = 'square-55d63',
  squareToHighlight,
  colorToHighlight,
  playerColor,
  computerColor,
  orientation,
  stockfish = new Worker('stockfish/src/stockfish.js');

var init = function() {
  console.log('__ init');

  // TODO: make engine depth configurable
  stockfish.postMessage('go depth 15');

  stockfish.onmessage = function(event) {
    console.log(event.data);
    var line;

    if (event && typeof event === "object") {
      line = event.data;
    } else {
      line = event;
    }

    // console.log("evaler: " + line);

    /// Ignore some output.
    if (line === "uciok" || line === "readyok" || line.substr(0, 11) === "option name") {
      return;
    }

    if (evaluation_el.textContent) {
      evaluation_el.textContent += "\n";
    }
    evaluation_el.textContent += line;
  };

  stockfish.onmessage = function(event) {
    var line;

    if (event && typeof event === "object") {
      line = event.data;
    } else {
      line = event;
    }
    console.log("Reply: " + line)
    if(line == 'uciok') {
      engineStatus.engineLoaded = true;
    } else if(line == 'readyok') {
      engineStatus.engineReady = true;
    } else {
      var match = line.match(/^bestmove ([a-h][1-8])([a-h][1-8])([qrbn])?/);
      /// Did the AI move?
      if(match) {
        isEngineRunning = false;
        game.move({from: match[1], to: match[2], promotion: match[3]});
        prepareMove();
        uciCmd("eval", evaler)
        evaluation_el.textContent = "";
        //uciCmd("eval");
        /// Is it sending feedback?
      } else if(match = line.match(/^info .*\bdepth (\d+) .*\bnps (\d+)/)) {
        engineStatus.search = 'Depth: ' + match[1] + ' Nps: ' + match[2];
      }

      /// Is it sending feed back with a score?
      if(match = line.match(/^info .*\bscore (\w+) (-?\d+)/)) {
        var score = parseInt(match[2]) * (game.turn() == 'w' ? 1 : -1);
        /// Is it measuring in centipawns?
        if(match[1] == 'cp') {
          engineStatus.score = (score / 100.0).toFixed(2);
          /// Did it find a mate?
        } else if(match[1] == 'mate') {
          engineStatus.score = 'Mate in ' + Math.abs(score);
        }

        /// Is the score bounded?
        if(match = line.match(/\b(upper|lower)bound\b/)) {
          engineStatus.score = ((match[1] == 'upper') == (game.turn() == 'w') ? '<= ' : '>= ') + engineStatus.score
        }
      }
    }
    displayStatus();
  };

  // determine whether user has black or white
  // if playtype === 'human_vs_computer'
  playerColor = 'w';
  computerColor = 'b';
  orientation = 'white';
  if (Math.random() < 0.5) {
    playerColor = 'b';
    computerColor = 'w';
    orientation = 'black';
  }

  console.log('Player is ' + orientation);

  var cfg = {
    draggable: true,
    position: 'start',
    onDragStart: onDragStart,
    onDrop: onDrop,
    onSnapEnd: onSnapEnd,
    orientation: orientation
  };

  status = 'Starting new game!';
  game = new Chess();
  board = ChessBoard('board', cfg);
  
  if (playerColor === 'b') {
    // computer makes first move
    computerMove();
    board.position(game.fen());
  }
};

var computerMove = function() {
  console.log('__ computerMove');

  var move = determineNextMove(game);

  this.console.log('Computer move: ' + move);
  game.move(move);

  var to = getSquare(move);
  var m = {to: to, color: computerColor};
  
  highlightMove(m);
  updateStatus();
}

// do not pick up pieces if the game is over
// only pick up pieces for the side to move
var onDragStart = function(source, piece, position, orientation) {
  console.log('__ onDragStart');
  
  if (game.game_over() === true ||
      (game.turn() === 'w' && piece.search(/^b/) !== -1) ||
      (game.turn() === 'b' && piece.search(/^w/) !== -1)) {
    return false;
  }

  boardEl.find('*').removeClass('highlight-white');
  boardEl.find('*').removeClass('highlight-black');

  var possibleMoves = game.moves({square: source});
  for (var i = 0; i < possibleMoves.length; i++) {
    var possibleSquare = getSquare(possibleMoves[i])
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
  console.log('__ onDrop');

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

  highlightMove(move);
  updateStatus();

  computerMove();
};

// update the board position after the piece snap 
// for castling, en passant, pawn promotion
var onSnapEnd = function() {
  board.position(game.fen());
};

var highlightMove = function(move) {
  console.log('__ highlightMove ' + move.to);

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
}

var getSquare = function(move) {
  var cleanedMove = move
    .replace('#', '')
    .replace('+', '')
    .replace('=', '')
    .replace('Q', '')
    .replace('x', '')

  return cleanedMove.substr(cleanedMove.length - 2, 2)
}

var updateStatus = function() {
  console.log('__ updateStatus');

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

$(document).ready(init);

var start = function() {
  console.log('Starting new game!');
  init();
}
