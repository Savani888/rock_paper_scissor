const http = require("http");
const fs = require("fs");
const path = require("path");
const { randomUUID } = require("crypto");
const { WebSocketServer } = require("ws");

const PORT = process.env.PORT || 8000;
const rootDir = __dirname;
const rooms = new Map();

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

function normalizeRoomCode(value) {
  return String(value || "demo").trim().toUpperCase() || "DEMO";
}

function createRoom(code) {
  if (!rooms.has(code)) {
    rooms.set(code, {
      code,
      players: new Map(),
      hostId: null,
      round: null,
    });
  }
  return rooms.get(code);
}

function sendJson(ws, payload) {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

function broadcastRoom(room, payload) {
  for (const player of room.players.values()) {
    if (player.ws && player.ws.readyState === player.ws.OPEN) {
      sendJson(player.ws, payload);
    }
  }
}

function getRoomPayload(room) {
  return {
    type: "room_state",
    roomCode: room.code,
    hostId: room.hostId,
    players: [...room.players.values()].map((player) => ({
      id: player.id,
      name: player.name,
      score: player.score,
      isHost: player.id === room.hostId,
    })),
  };
}

function evaluateRound(playerMove, botMove) {
  if (playerMove === "unknown") return "unknown";
  if (playerMove === botMove) return "tie";
  const BEATS = {
    rock: "scissors",
    paper: "rock",
    scissors: "paper",
  };
  return BEATS[botMove] === playerMove ? "machine" : "human";
}

function chooseBotMove(playerMoves) {
  const valid = playerMoves.filter((move) => move && move !== "unknown");
  if (!valid.length) return ["rock", "paper", "scissors"][Math.floor(Math.random() * 3)];

  const counts = valid.reduce((acc, move) => {
    acc[move] = (acc[move] || 0) + 1;
    return acc;
  }, {});

  const [dominantMove] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  const botChoices = {
    rock: "paper",
    paper: "scissors",
    scissors: "rock",
  };

  return botChoices[dominantMove] || valid[0];
}

function finalizeRound(room) {
  if (!room.round) return;

  const collectedMoves = [...room.round.moves.entries()];
  const botMove = chooseBotMove(collectedMoves.map(([, move]) => move));
  const results = [];

  for (const [playerId, player] of room.players.entries()) {
    const move = room.round.moves.get(playerId) || "unknown";
    const outcome = evaluateRound(move, botMove);
    if (outcome === "human") {
      player.score += 1;
    }
    results.push({
      id: player.id,
      name: player.name,
      move,
      outcome,
    });
  }

  const winners = results.filter((entry) => entry.outcome === "human").map((entry) => entry.name);
  const losers = results.filter((entry) => entry.outcome === "machine").map((entry) => entry.name);
  const ties = results.filter((entry) => entry.outcome === "tie" || entry.outcome === "unknown").map((entry) => entry.name);

  broadcastRoom(room, {
    type: "round_result",
    roomCode: room.code,
    botMove,
    winners,
    losers,
    ties,
    results,
  });

  room.round = null;
}

const server = http.createServer((req, res) => {
  const safePath = req.url === "/" ? "/index.html" : req.url.split("?")[0];
  const filePath = path.join(rootDir, safePath);

  if (!filePath.startsWith(rootDir)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      if (error.code === "ENOENT") {
        res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("Not found");
        return;
      }

      res.writeHead(500);
      res.end("Server error");
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": contentType });
    res.end(data);
  });
});

const wss = new WebSocketServer({ server });

wss.on("connection", (ws) => {
  ws.on("message", (raw) => {
    let message;
    try {
      message = JSON.parse(raw.toString());
    } catch {
      return;
    }

    if (!message || typeof message !== "object") return;

    if (message.type === "join_room") {
      const roomCode = normalizeRoomCode(message.roomCode);
      const room = createRoom(roomCode);
      const playerId = message.playerId || randomUUID();
      const name = String(message.name || "Player").trim() || "Player";
      const player = {
        id: playerId,
        name,
        score: 0,
        ws,
      };

      if (!room.players.has(playerId)) {
        room.players.set(playerId, player);
      } else {
        room.players.get(playerId).ws = ws;
        room.players.get(playerId).name = name;
      }

      room.hostId = room.hostId || playerId;
      sendJson(ws, {
        type: "joined",
        roomCode: room.code,
        playerId,
        isHost: room.hostId === playerId,
      });
      broadcastRoom(room, getRoomPayload(room));
      return;
    }

    if (message.type === "start_round") {
      const roomCode = normalizeRoomCode(message.roomCode);
      const room = rooms.get(roomCode);
      if (!room || room.hostId !== message.playerId) return;

      room.round = { moves: new Map() };
      broadcastRoom(room, {
        type: "round_started",
        roomCode: room.code,
      });
      setTimeout(() => finalizeRound(room), 3500);
      return;
    }

    if (message.type === "player_move") {
      const roomCode = normalizeRoomCode(message.roomCode);
      const room = rooms.get(roomCode);
      if (!room || !room.round) return;

      room.round.moves.set(message.playerId, message.move || "unknown");
      if (room.round.moves.size >= room.players.size) {
        finalizeRound(room);
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`RPS multiplayer server running on http://localhost:${PORT}`);
});
