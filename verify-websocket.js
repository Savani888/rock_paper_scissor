const WebSocket = require("ws");
const ws = new WebSocket("ws://localhost:8000");

ws.on("open", () => {
  ws.send(JSON.stringify({ type: "join_room", roomCode: "DEMO", name: "Alice" }));
});

ws.on("message", (data) => {
  console.log(String(data));
  ws.close();
});

setTimeout(() => {
  process.exit(0);
}, 2000);
