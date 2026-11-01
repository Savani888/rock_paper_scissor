const WebSocket = require("ws");
const roomCode = "DEMO";
const clients = [];

function createClient(name) {
  return new Promise((resolve) => {
    const ws = new WebSocket("ws://localhost:8000");
    const client = { name, ws };

    ws.on("open", () => {
      ws.send(JSON.stringify({ type: "join_room", roomCode, name }));
    });

    ws.on("message", (raw) => {
      const message = JSON.parse(raw.toString());
      client.lastMessage = message;

      if (message.type === "joined") {
        client.playerId = message.playerId;
        console.log(`${name} joined room ${roomCode} as ${message.playerId}`);
      }

      if (message.type === "room_state") {
        console.log(`${name} sees room: ${JSON.stringify(message.players.map((p) => p.name))}`);
        if (message.players.length === 2 && client.name === "Alice") {
          setTimeout(() => {
            ws.send(JSON.stringify({ type: "start_round", roomCode, playerId: message.hostId }));
          }, 200);
        }
      }

      if (message.type === "round_started") {
        const move = client.name === "Alice" ? "rock" : "paper";
        setTimeout(() => {
          ws.send(JSON.stringify({ type: "player_move", roomCode, playerId: client.playerId, move }));
          console.log(`${name} sent move ${move}`);
        }, 250);
      }

      if (message.type === "round_result") {
        console.log(`${name} received result: ${JSON.stringify(message)}`);
        ws.close();
      }
    });

    ws.on("close", () => {
      if (clients.length && clients.every((item) => item.ws.readyState === WebSocket.CLOSED)) {
        setTimeout(() => process.exit(0), 200);
      }
    });

    clients.push(client);
    resolve(client);
  });
}

(async () => {
  await createClient("Alice");
  await new Promise((resolve) => setTimeout(resolve, 300));
  await createClient("Bob");
})();
