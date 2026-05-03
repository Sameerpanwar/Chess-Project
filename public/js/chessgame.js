const socket = io();
const chess = new Chess();
const boardElement = document.querySelector(".chessboard");

let draggedPiece = null;
let sourceSquare = null;
let playerRole = null;

const getPieceUnicode = (piece) => {
    const pieces = {
    p: "♙",

    r: "&#9820;",

    n: "&#9822;",

    b: "&#9821;",

    q: "&#9819;",

    k: "&#9812;",

    P: "&#9817;",

    R: "&#9814;",

    N: "&#9816;",

    B: "&#9815;",

    Q: "&#9813;",

    K: "&#9812;",
    };
    const type = piece.color === 'w' ? piece.type.toUpperCase() : piece.type.toLowerCase();
    return pieces[type] || "";
};

const renderBoard = () => {
    const board = chess.board();
    boardElement.innerHTML = "";
    board.forEach((row, rowindex) => {
        row.forEach((square, squareindex) => {
            const squareElement = document.createElement("div");
            squareElement.classList.add("square", (rowindex + squareindex) % 2 === 0 ? "light" : "dark");
            squareElement.dataset.row = rowindex;
            squareElement.dataset.col = squareindex;

            if (square) {
                const pieceElement = document.createElement("div");
                pieceElement.classList.add("piece");
                
                pieceElement.style.color = square.color === "w" ? "#ffffff" : "#000000";
                
                pieceElement.innerHTML = getPieceUnicode(square);
                
                pieceElement.draggable = playerRole === square.color && chess.turn() === square.color;

                pieceElement.addEventListener("dragstart", (e) => {
                    if (pieceElement.draggable) {
                        draggedPiece = pieceElement;
                        sourceSquare = { row: rowindex, col: squareindex };
                        e.dataTransfer.setData("text/plain", ""); 
                    }
                });

                squareElement.appendChild(pieceElement);
            }

            squareElement.addEventListener("dragover", (e) => {
                e.preventDefault();
            });

            squareElement.addEventListener("drop", (e) => {
                e.preventDefault();
                if (draggedPiece) {
                    
                    const targetElement = e.target.classList.contains("square") ? e.target : e.target.closest(".square");
                    
                    const targetSquare = {
                        row: parseInt(targetElement.dataset.row),
                        col: parseInt(targetElement.dataset.col),
                    };
                    handleMove(sourceSquare, targetSquare);
                }
            });
            boardElement.appendChild(squareElement);
        });
    });

    if (playerRole === "b") boardElement.classList.add("flipped");
    else boardElement.classList.remove("flipped");
};

const handleMove = (source, target) => {
    const move = {
        from: `${String.fromCharCode(97 + source.col)}${8 - source.row}`,
        to: `${String.fromCharCode(97 + target.col)}${8 - target.row}`,
        promotion: "q",
    };
    socket.emit("move", move);
};




socket.on("playerRole", (role) => { 
    playerRole = role; 
    renderBoard(); 
});

socket.on("boardState", (fen) => { 
    chess.load(fen); 
    renderBoard(); 
});

socket.on("move", (move) => { 
    chess.move(move); 
    renderBoard(); 
});

socket.on("gameOver", (data) => {
    const overlay = document.getElementById("game-over-screen");
    const reasonText = document.getElementById("reason-text");
    const resultText = document.getElementById("game-result"); 
    
    if (resultText) resultText.innerText = data.message;

    if (overlay && reasonText) {
        reasonText.innerText = data.message;
        overlay.classList.remove("hidden");
    }
});

renderBoard();