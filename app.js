require('dotenv').config();

const express = require("express");
const http = require("http");
const path = require("path");
const mysql = require("mysql2");
const { Chess } = require("chess.js");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// ================= middleware =================

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ================= view engine =================
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// ================= database =================
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT
});

db.connect(err => {
  if (err) {
        console.error("Database connection failed: " + err.stack);
        return;
    }
    console.log("Connected to Railway MySQL!");
});

// ================= chess logic =================
const chess = new Chess();
let players = {};

// ================= routes =================

app.get("/", (req, res) => res.render("login"));
app.get("/login", (req, res) => res.render("login"));

app.post("/login", (req, res) => {
  const { username, password } = req.body;

  const sql = "SELECT * FROM users WHERE username = ? AND password = ?";
  db.query(sql, [username.trim(), password.trim()], (err, result) => {
    if (err) {
        console.error(err);
        return res.status(500).send("Database Error");
    }

    if (result.length > 0) {
      res.redirect("/chess");
    } else {
      res.send("Invalid credentials. <a href='/login'>Try again</a>");
    }
  });
});


app.get("/register", (req, res) => res.render("register"));


app.post("/register", (req, res) => {
    const { username, password } = req.body;
    
    // Using the manual ID calculation since we didn't use Auto-Increment in the GUI
    const sql = "INSERT INTO users (username, password, id) VALUES (?, ?, (SELECT IFNULL(MAX(id), 0) + 1 FROM users as temp))";
    
    db.query(sql, [username, password], (err, result) => {
        if (err) {
            return res.send("Error: " + err.sqlMessage);
        }
        res.redirect("/login");
    });
});

//The Chess Board
app.get("/chess", (req, res) => res.render("index"));

// ================= socket logic =================
io.on("connection", (uniquesocket) => {
  console.log("Socket connected: " + uniquesocket.id);

  if (!players.white) {
    players.white = uniquesocket.id;
    uniquesocket.emit("playerRole", "w");
  } else if (!players.black) {
    players.black = uniquesocket.id;
    uniquesocket.emit("playerRole", "b");
  } else {
    uniquesocket.emit("spectatorRole");
  }

  uniquesocket.on("move", (move) => {
    try {
      if (chess.turn() === "w" && uniquesocket.id !== players.white) return;
      if (chess.turn() === "b" && uniquesocket.id !== players.black) return;

      const result = chess.move(move);
      if (result) {
        io.emit("move", move);
        io.emit("boardState", chess.fen());

        if (chess.isCheckmate()) {
          const winner = chess.turn() === "w" ? "Black" : "White";
          io.emit("gameOver", { message: `Checkmate! ${winner} wins.` });
        } else if (chess.isDraw() || chess.isStalemate()) {
          io.emit("gameOver", { message: "The game ended in a draw." });
        }
      } else {
        uniquesocket.emit("InvalidMove", move);
      }
    } catch (err) {
      uniquesocket.emit("InvalidMove", move);
    }
  });



  uniquesocket.on("disconnect", () => {
    if (uniquesocket.id === players.white) delete players.white;
    else if (uniquesocket.id === players.black) delete players.black;
  });
});



server.listen(process.env.PORT || 4000, () =>
  console.log("Server running on 4000"));