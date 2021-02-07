function engineGame(options) {
    options = options || {}
    var game = new Chess();
    var board;
    var boardEl = $('#board');

    // the computer engine plays agains the human
    var computerEngine = typeof STOCKFISH === "function" ? STOCKFISH() : new Worker(options.stockfishjs || 'stockfish.js');
    var computerEvaler = typeof STOCKFISH === "function" ? STOCKFISH() : new Worker(options.stockfishjs || 'stockfish.js');
    var computerEngineStatus = {};
    var isComputerEngineRunning = false;

    // the human stockfish engine evaluates every human move, to give real-time feedback
    var humanEngine = typeof STOCKFISH === "function" ? STOCKFISH() : new Worker(options.stockfishjs || 'stockfish.js');
    var humanEvaler = typeof STOCKFISH === "function" ? STOCKFISH() : new Worker(options.stockfishjs || 'stockfish.js');
    var humanEngineStatus = {};
    var isHumanEngineRunning = false;

    var displayScore = false;
    var time = { wtime: 300000, btime: 300000, winc: 2000, binc: 2000 };
    var playerColor = 'white';
    var clockTimeoutID = null;
    var evaluation_el = document.getElementById("evaluation");
    var announced_game_over;
    var squareClass = 'square-55d63';

    setInterval(function ()
    {
        if (announced_game_over) {
            return;
        }
        
        if (game.game_over()) {
            announced_game_over = true;
            alert("Game Over");
        }
    }, 1000);

    function uciCmd(cmd, which) {
        console.log("UCI: " + cmd);
        
        (which || computerEngine).postMessage(cmd);
    }
    uciCmd('uci', computerEngine);
    uciCmd('uci', humanEngine)
    
    ///TODO: Eval starting positions. I suppose the starting positions could be different in different chess varients.

    function displayStatus() {
        var status = 'Engine: ';
        if(!computerEngineStatus.engineLoaded) {
            status += 'loading...';
        } else if(!computerEngineStatus.engineReady) {
            status += 'loaded...';
        } else {
            status += 'ready.';
        }
        
        if(computerEngineStatus.search) {
            status += '<br>' + computerEngineStatus.search;
            if(computerEngineStatus.score && displayScore) {
                status += (computerEngineStatus.score.substr(0, 4) === "Mate" ? " " : ' Score: ') + computerEngineStatus.score;
            }
        }
        $('#engineStatus').html(status);
    }

    function displayClock(color, t) {
        var isRunning = false;
        if(time.startTime > 0 && color === time.clockColor) {
            t = Math.max(0, t + time.startTime - Date.now());
            isRunning = true;
        }
        var id = color === playerColor ? '#time2' : '#time1';
        var sec = Math.ceil(t / 1000);
        var min = Math.floor(sec / 60);
        sec -= min * 60;
        var hours = Math.floor(min / 60);
        min -= hours * 60;
        var display = hours + ':' + ('0' + min).slice(-2) + ':' + ('0' + sec).slice(-2);
        if(isRunning) {
            display += sec & 1 ? ' <--' : ' <-';
        }
        $(id).text(display);
    }

    function updateClock() {
        displayClock('white', time.wtime);
        displayClock('black', time.btime);
    }

    function clockTick() {
        updateClock();
        var t = (time.clockColor === 'white' ? time.wtime : time.btime) + time.startTime - Date.now();
        var timeToNextSecond = (t % 1000) + 1;
        clockTimeoutID = setTimeout(clockTick, timeToNextSecond);
    }

    function stopClock() {
        if(clockTimeoutID !== null) {
            clearTimeout(clockTimeoutID);
            clockTimeoutID = null;
        }
        if(time.startTime > 0) {
            var elapsed = Date.now() - time.startTime;
            time.startTime = null;
            if(time.clockColor === 'white') {
                time.wtime = Math.max(0, time.wtime - elapsed);
            } else {
                time.btime = Math.max(0, time.btime - elapsed);
            }
        }
    }

    function startClock() {
        if(game.turn() === 'w') {
            time.wtime += time.winc;
            time.clockColor = 'white';
        } else {
            time.btime += time.binc;
            time.clockColor = 'black';
        }
        time.startTime = Date.now();
        clockTick();
    }
    
    function get_moves()
    {
        var moves = '';
        var history = game.history({verbose: true});
        
        for(var i = 0; i < history.length; ++i) {
            var move = history[i];
            moves += ' ' + move.from + move.to + (move.promotion ? move.promotion : '');
        }
        
        return moves;
    }

    /**
     * Prepare a move to make, by human or computer
     */
    function prepareMove() {
        console.log('Preparing move...')

        stopClock();
        $('#pgn').text(game.pgn());
        board.position(game.fen());
        updateClock();

        var turn = game.turn() === 'w' ? 'white' : 'black';
        if(!game.game_over()) {
            if(turn !== playerColor) {
                // calculate computer move
                uciCmd('position startpos moves' + get_moves());
                uciCmd('position startpos moves' + get_moves(), computerEvaler);
                evaluation_el.textContent = "";
                uciCmd("eval", computerEvaler);
                
                if (time && time.wtime) {
                    uciCmd("go " + (time.depth ? "depth " + time.depth : "") + " wtime " + time.wtime + " winc " + time.winc + " btime " + time.btime + " binc " + time.binc);
                } else {
                    uciCmd("go " + (time.depth ? "depth " + time.depth : ""));
                }
                isComputerEngineRunning = true;
            } else {
                console.log('Evaluating your move...')

                // calculate computer move
                uciCmd('position startpos moves' + get_moves());
                uciCmd('position startpos moves' + get_moves(), humanEvaler);
                uciCmd("eval", humanEvaler);

                if (time && time.wtime) {
                    uciCmd("go " + (time.depth ? "depth " + time.depth : "") + " wtime " + time.wtime + " winc " + time.winc + " btime " + time.btime + " binc " + time.binc, humanEngine);
                } else {
                    uciCmd("go " + (time.depth ? "depth " + time.depth : ""), humanEngine);
                }

                isHumanEngineRunning = true;
            }

            if(game.history().length >= 2 && !time.depth && !time.nodes) {
                startClock();
            }
        }
    }

    ///////////////////////////
    // Computer Engine moves //
    ///////////////////////////
    
    computerEvaler.onmessage = function(event) {
        console.log('Computer Evaler callback 1')
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
    }

    computerEngine.onmessage = function(event) {
        console.log('Computer Evaler callback 2')
        var line;
        
        if (event && typeof event === "object") {
            line = event.data;
        } else {
            line = event;
        }
        console.log("Reply: " + line)
        if(line === 'uciok') {
            computerEngineStatus.engineLoaded = true;
        } else if(line === 'readyok') {
            computerEngineStatus.engineReady = true;
        } else {
            var match = line.match(/^bestmove ([a-h][1-8])([a-h][1-8])([qrbn])?/);
            /// Did the AI move?
            if(match) {
                isComputerEngineRunning = false;
                console.log('Moving...')

                game.move({from: match[1], to: match[2], promotion: match[3]});
                highlightMove({from: match[1], to: match[2], promotion: match[3]})

                prepareMove();
                uciCmd("eval", computerEvaler)
                evaluation_el.textContent = "";
                //uciCmd("eval");
            /// Is it sending feedback?
            } else if(match = line.match(/^info .*\bdepth (\d+) .*\bnps (\d+)/)) {
                computerEngineStatus.search = 'Depth: ' + match[1] + ' Nps: ' + match[2];
            }
            
            /// Is it sending feed back with a score?
            if(match = line.match(/^info .*\bscore (\w+) (-?\d+)/)) {
                var score = parseInt(match[2]) * (game.turn() === 'w' ? 1 : -1);
                /// Is it measuring in centipawns?
                if(match[1] === 'cp') {
                    computerEngineStatus.score = (score / 100.0).toFixed(2);
                /// Did it find a mate?
                } else if(match[1] === 'mate') {
                    computerEngineStatus.score = 'Mate in ' + Math.abs(score);
                }
                
                /// Is the score bounded?
                if(match = line.match(/\b(upper|lower)bound\b/)) {
                    computerEngineStatus.score = ((match[1] === 'upper') === (game.turn() === 'w') ? '<= ' : '>= ') + computerEngineStatus.score
                }
            }
        }
        displayStatus();
    };

    //////////////////////////////
    // Human Engine evaluations //
    //////////////////////////////

    humanEvaler.onmessage = function(event) {
        console.log('Human Evaler callback')
        var line;

        if (event && typeof event === "object") {
            line = event.data;
        } else {
            line = event;
        }

        console.log('Reply from human evaler: ' + line);

        isHumanEngineRunning = false;
    }

    /////////////////
    // Mouse moves //
    /////////////////

    // do not pick up pieces if the game is over
    // only pick up pieces for White
    var onDragStart = function(source, piece, position, orientation) {
        var re = playerColor === 'white' ? /^b/ : /^w/;
        if (game.game_over() || piece.search(re) !== -1) {
            return false;
        }

        var possibleMoves = game.moves({square: source});
        for (var i = 0; i < possibleMoves.length; i++) {
            var possibleSquare = getSquare(possibleMoves[i])
            boardEl.find('.square-' + possibleSquare).addClass('highlight-possible-move');
        }
    };

    var getSquare = function(move) {
        var cleanedMove = move
            .replace('#', '')
            .replace('+', '')
            .replace('=', '')
            .replace('Q', '')
            .replace('x', '')

        return cleanedMove.substr(cleanedMove.length - 2, 2)
    };

    var onDrop = function(source, target) {
        // remove the highlighted possible moves
        boardEl.find('*').removeClass('highlight-possible-move');

        // see if the move is legal; if it is: make the human move
        var move = game.move({
            from: source,
            to: target,
            promotion: document.getElementById("promote").value
        });

        // illegal move
        if (move === null) return 'snapback';

        highlightMove(move);

        // TODO: show the strength of this move, and possible an improvment

        prepareMove();
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

    var cfg = {
        showErrors: true,
        draggable: true,
        position: 'start',
        onDragStart: onDragStart,
        onDrop: onDrop,
        onSnapEnd: onSnapEnd
    };

    //////////
    // MAIN //
    //////////

    board = new ChessBoard('board', cfg);

    return {
        reset: function() {
            game.reset();
            uciCmd('setoption name Contempt value 0');
            //uciCmd('setoption name Skill Level value 20');
            this.setSkillLevel(0);
            uciCmd('setoption name King Safety value 0'); /// Agressive 100 (it's now symetric)
        },
        loadPgn: function(pgn) { game.load_pgn(pgn); },
        setPlayerColor: function(color) {
            playerColor = color;
            board.orientation(playerColor);
        },
        setSkillLevel: function(skill) {
            var max_err,
                err_prob,
                difficulty_slider;
            
            if (skill < 0) {
                skill = 0;
            }
            if (skill > 20) {
                skill = 20;
            }
            
            time.level = skill;
            
            /// Change thinking depth allowance.
            if (skill < 5) {
                time.depth = "1";
            } else if (skill < 10) {
                time.depth = "2";
            } else if (skill < 15) {
                time.depth = "3";
            } else {
                /// Let the engine decide.
                time.depth = "";
            }
            
            uciCmd('setoption name Skill Level value ' + skill);
            
            ///NOTE: Stockfish level 20 does not make errors (intentially), so these numbers have no effect on level 20.
            /// Level 0 starts at 1
            err_prob = Math.round((skill * 6.35) + 1);
            /// Level 0 starts at 10
            max_err = Math.round((skill * -0.5) + 10);
            
            uciCmd('setoption name Skill Level Maximum Error value ' + max_err);
            uciCmd('setoption name Skill Level Probability value ' + err_prob);
        },
        setTime: function(baseTime, inc) {
            time = { wtime: baseTime * 1000, btime: baseTime * 1000, winc: inc * 1000, binc: inc * 1000 };
        },
        setDepth: function(depth) {
            time = { depth: depth };
        },
        setNodes: function(nodes) {
            time = { nodes: nodes };
        },
        setContempt: function(contempt) {
            uciCmd('setoption name Contempt value ' + contempt);
        },
        setAggressiveness: function(value) {
            uciCmd('setoption name Aggressiveness value ' + value);
        },
        setDisplayScore: function(flag) {
            displayScore = flag;
            displayStatus();
        },
        start: function() {
            uciCmd('ucinewgame');
            uciCmd('isready');
            computerEngineStatus.engineReady = false;
            computerEngineStatus.search = null;
            displayStatus();
            prepareMove();
            announced_game_over = false;
        },
        undo: function() {
            if(isComputerEngineRunning)
                return false;
            game.undo();
            game.undo();
            computerEngineStatus.search = null;
            displayStatus();
            prepareMove();
            return true;
        }
    };
}
