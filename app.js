import {
  DrawingUtils,
  FilesetResolver,
  GestureRecognizer,
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/vision_bundle.mjs";
import { createTournament, recordTournamentRound } from "./tournament.mjs";

const video = document.querySelector("#webcam");
const canvas = document.querySelector("#overlay");
const ctx = canvas.getContext("2d");
const modelState = document.querySelector("#modelState");
const confidenceEl = document.querySelector("#confidence");
const countdownEl = document.querySelector("#countdown");
const humanMoveEl = document.querySelector("#humanMove");
const machineMoveEl = document.querySelector("#machineMove");
const resultEl = document.querySelector("#result");
const roundsEl = document.querySelector("#rounds");
const machineScoreEl = document.querySelector("#machineScore");
const humanScoreEl = document.querySelector("#humanScore");
const cameraButton = document.querySelector("#cameraButton");
const playButton = document.querySelector("#playButton");
const unbeatableMode = document.querySelector("#unbeatableMode");
const predictMode = document.querySelector("#predictMode");
const datasetCountEl = document.querySelector("#datasetCount");
const gestureLabelInput = document.querySelector("#gestureLabel");
const captureButton = document.querySelector("#captureButton");
const recordButton = document.querySelector("#recordButton");
const exportButton = document.querySelector("#exportButton");
const importButton = document.querySelector("#importButton");
const importFile = document.querySelector("#importFile");
const customPredictionEl = document.querySelector("#customPrediction");
const playerCountEl = document.querySelector("#playerCount");
const humanPlayersEl = document.querySelector("#humanPlayers");
const playerScoreboardEl = document.querySelector("#playerScoreboard");
const roomCodeInput = document.querySelector("#roomCode");
const playerNameInput = document.querySelector("#playerName");
const joinRoomButton = document.querySelector("#joinRoomButton");
const roomStatusEl = document.querySelector("#roomStatus");
const demo2Button = document.querySelector("#demo2Button");
const demo3Button = document.querySelector("#demo3Button");
const demo4Button = document.querySelector("#demo4Button");
const tournamentEnabledEl = document.querySelector("#tournamentEnabled");
const tournamentBestOfEl = document.querySelector("#tournamentBestOf");
const tournamentStatusEl = document.querySelector("#tournamentStatus");
const tournamentHistoryEl = document.querySelector("#tournamentHistory");
const resetTournamentButton = document.querySelector("#resetTournamentButton");

const GESTURE_TO_MOVE = {
  Closed_Fist: "rock",
  Open_Palm: "paper",
  Victory: "scissors",
};

const LABEL_ALIASES = {
  fist: "rock",
  palm: "paper",
  peace: "scissors",
  victory: "scissors",
  scissor: "scissors",
};

const EMOJI = {
  rock: "Rock",
  paper: "Paper",
  scissors: "Scissors",
  unknown: "-",
};

const COUNTER = {
  rock: "paper",
  paper: "scissors",
  scissors: "rock",
};

const BEATS = {
  rock: "scissors",
  paper: "rock",
  scissors: "paper",
};

const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20],
  [0, 17],
];

let recognizer;
let drawingUtils;
let cameraRunning = false;
let roundRunning = false;
let roundComplete = false;
let mode = "unbeatable";
let latestMove = "unknown";
let latestScore = 0;
let latestLandmarks = null;
let heuristicMove = "unknown";
let heuristicScore = 0;
let customPrediction = null;
let lastVideoTime = -1;
let predictionSamples = [];
let roundSamples = [];
let recordingMotion = false;
let motionFrames = [];
let liveMotionFrames = [];
let lastLockedHumanMove = "unknown";
let finalHumanMove = "unknown";
let finalMachineMove = "unknown";
const score = { rounds: 0, machine: 0, human: 0 };
let tournament = createTournament();
const defaultHumanNames = ["Player 1", "Player 2", "Player 3", "Player 4"];
const humanPlayers = defaultHumanNames.map((name) => ({ name, score: 0 }));
const demoNames = ["Ava", "Ben", "Cara", "Derrick"];
const dataset = loadDataset();
const wsProtocol = location.protocol === "https:" ? "wss" : "ws";
let socket = null;
let playerId = "";
let roomCode = "DEMO";
let isHost = false;
let roomPlayers = [];
let roomStarted = false;
let localMoveSubmitted = false;
let demoMode = false;
let selectedRole = "host";
const roleButtons = Array.from(document.querySelectorAll(".role-option"));
const roomCodeBadge = document.querySelector("#roomCodeBadge");

function sendRoomMessage(payload) {
  if (!socket || socket.readyState !== WebSocket.OPEN) return;
  socket.send(JSON.stringify(payload));
}

function updateRoomStatus(text) {
  roomStatusEl.textContent = text;
}

function setSelectedRole(role) {
  selectedRole = role === "participant" ? "participant" : "host";
  roleButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.role === selectedRole);
  });

  const nameValue = playerNameInput.value.trim();
  if (!nameValue || nameValue === "You" || nameValue === "Host") {
    playerNameInput.value = selectedRole === "host" ? "Host" : "Participant";
  }

  updateRoomStatus(selectedRole === "host" ? "Host ready to start the round" : "Participant ready to join the lobby");
}

function renderLobbyPlayers() {
  const players = roomPlayers.length ? roomPlayers : humanPlayers.slice(0, Number(playerCountEl.value) || 1).map((player) => ({
    id: `${player.name}-${Math.random().toString(16).slice(2, 6)}`,
    name: player.name,
    score: player.score,
    isHost: player.name === "Host" || player.name === "You",
  }));

  const lobbyEntries = players.map((player, index) => {
    const isCurrentUser = player.name === (playerNameInput.value || "").trim() || index === 0;
    const roleLabel = player.isHost ? "Host" : "Ready";
    const statusClass = player.isHost ? "host" : "ready";
    const initials = (player.name || "P").split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase() || "P";

    return `
      <div class="lobby-player">
        <div class="lobby-player-main">
          <div class="lobby-avatar">${initials}</div>
          <div>
            <div class="lobby-player-name">${player.name}</div>
          </div>
        </div>
        <span class="status-pill ${statusClass}">${player.isHost ? "Host" : isCurrentUser ? "You" : roleLabel}</span>
      </div>
    `;
  });

  const lobbyEl = document.querySelector("#lobbyPlayers");
  lobbyEl.innerHTML = lobbyEntries.join("");
}

function setDemoMode(playerCount) {
  demoMode = true;
  const totalPlayers = Math.max(1, Math.min(4, Number(playerCount) || 1));
  playerCountEl.value = String(totalPlayers);
  humanPlayers[0].name = (playerNameInput.value || "Host").trim() || "Host";
  for (let index = 1; index < 4; index += 1) {
    humanPlayers[index] = {
      name: index < totalPlayers ? demoNames[index - 1] : defaultHumanNames[index],
      score: 0,
    };
  }
  syncHumanPlayers();
  renderLobbyPlayers();
  renderPlayerScores();
  updateRoomStatus(`Presentation demo ready: ${totalPlayers} human players total`);
}

function joinRoom() {
  const name = (playerNameInput.value || (selectedRole === "host" ? "Host" : "Participant")).trim() || (selectedRole === "host" ? "Host" : "Participant");
  const nextRoomCode = (roomCodeInput.value || "DEMO").trim().toUpperCase() || "DEMO";
  roomCode = nextRoomCode;
  playerNameInput.value = name;
  roomCodeInput.value = roomCode;

  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.close();
  }

  const wsUrl = `${wsProtocol}://${location.hostname}:${location.port || 3000}`;
  socket = new WebSocket(wsUrl);
  updateRoomStatus("Joining room...");

  socket.addEventListener("open", () => {
    sendRoomMessage({
      type: "join_room",
      roomCode,
      name,
      playerId,
    });
  });

  socket.addEventListener("message", (event) => {
    try {
      const message = JSON.parse(event.data);

      if (message.type === "joined") {
        playerId = message.playerId;
        isHost = Boolean(message.isHost) || selectedRole === "host";
        const roleText = isHost ? "Host" : "Participant";
        updateRoomStatus(`Connected to room ${roomCode} as ${roleText}`);
        roomCodeBadge.textContent = roomCode;
        renderLobbyPlayers();
        return;
      }

      if (message.type === "room_state") {
        roomPlayers = message.players || [];
        const hostLabel = roomPlayers.find((player) => player.isHost)?.name || "Host";
        roomCodeBadge.textContent = message.roomCode;
        updateRoomStatus(`Room ${message.roomCode}: ${roomPlayers.length} player(s) • Host: ${hostLabel}`);
        renderLobbyPlayers();
        return;
      }

      if (message.type === "round_started") {
        roomStarted = true;
        localMoveSubmitted = false;
        resultEl.textContent = "Round started — show your move";
        countdownEl.textContent = "GO";
        return;
      }

      if (message.type === "round_result") {
        roomStarted = false;
        const summary = message.results || [];
        const winners = message.winners || [];
        const losers = message.losers || [];
        const ties = message.ties || [];
        const botText = `Bot: ${EMOJI[message.botMove] || message.botMove}`;

        if (winners.length || losers.length || ties.length) {
          const winText = winners.length ? `${winners.join(", ")} beat the bot` : "";
          const loseText = losers.length ? `Bot beat ${losers.join(", ")}` : "";
          const tieText = ties.length ? `Tied: ${ties.join(", ")}` : "";
          resultEl.textContent = [winText, loseText, tieText, botText].filter(Boolean).join(" • ");
        } else {
          resultEl.textContent = `Bot chose ${botText}`;
        }

        const localResult = summary.find((player) => player.id === playerId);
        if (tournamentEnabledEl.checked && localResult) {
          recordTournamentRoundResult(localResult.name, localResult.outcome);
        }

        countdownEl.textContent = "READY";
      }
    } catch (error) {
      console.error(error);
    }
  });

  socket.addEventListener("close", () => {
    updateRoomStatus("Disconnected from room");
  });
}

async function bootModel() {
  try {
    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm"
    );

    recognizer = await GestureRecognizer.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath:
          "https://storage.googleapis.com/mediapipe-tasks/gesture_recognizer/gesture_recognizer.task",
        delegate: "GPU",
      },
      runningMode: "VIDEO",
      numHands: 1,
    });

    drawingUtils = new DrawingUtils(ctx);
    modelState.textContent = "AIML vision ready";
    cameraButton.disabled = false;
  } catch (error) {
    console.error(error);
    modelState.textContent = "Model failed to load";
    resultEl.textContent = "Check internet connection, then reload";
  }
}

async function startCamera() {
  cameraButton.disabled = true;
  modelState.textContent = "Opening camera...";

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        facingMode: "user",
        aspectRatio: 16 / 9,
      },
      audio: false,
    });

    video.srcObject = stream;
    await video.play();
    cameraRunning = true;
    cameraButton.textContent = "Camera On";
    playButton.disabled = false;
    captureButton.disabled = false;
    recordButton.disabled = false;
    modelState.textContent = "Show rock, paper, or scissors";
    requestAnimationFrame(detectFrame);
  } catch (error) {
    console.error(error);
    cameraButton.disabled = false;
    modelState.textContent = "Camera blocked";
    resultEl.textContent = "Allow camera access";
  }
}

function resizeCanvas() {
  const width = video.videoWidth || canvas.clientWidth;
  const height = video.videoHeight || canvas.clientHeight;
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
}

function detectFrame() {
  if (!cameraRunning || !recognizer) return;
  resizeCanvas();

  if (video.currentTime !== lastVideoTime) {
    const result = recognizer.recognizeForVideo(video, performance.now());
    processVisionResult(result);
    lastVideoTime = video.currentTime;
  }

  requestAnimationFrame(detectFrame);
}

function processVisionResult(result) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  latestLandmarks = result.landmarks?.[0] || null;

  if (result.landmarks?.length) {
    for (const landmarks of result.landmarks) {
      drawingUtils.drawConnectors(landmarks, HAND_CONNECTIONS, {
        color: "#19d3a2",
        lineWidth: 4,
      });
      drawingUtils.drawLandmarks(landmarks, {
        color: "#f6c453",
        lineWidth: 2,
        radius: 4,
      });
    }
  }

  const category = result.gestures?.[0]?.[0];
  const mapped = GESTURE_TO_MOVE[category?.categoryName] || "unknown";
  latestMove = mapped;
  latestScore = category?.score || 0;
  const heuristic = inferRpsFromLandmarks(latestLandmarks);
  heuristicMove = heuristic.move;
  heuristicScore = heuristic.confidence;

  updateCustomPrediction();
  const displayedMove = roundComplete ? finalHumanMove : resolveCurrentMove();

  humanMoveEl.textContent = EMOJI[displayedMove] || "-";
  const displayedConfidence = roundComplete ? 1 : getCurrentMoveConfidence();
  confidenceEl.textContent = `${Math.round(displayedConfidence * 100)}%`;

  if (latestLandmarks) {
    const vector = vectorizeLandmarks(latestLandmarks);
    liveMotionFrames.push(vector);
    if (liveMotionFrames.length > 24) liveMotionFrames.shift();
    if (recordingMotion) motionFrames.push(vector);
  }

  if (roundRunning && !roundComplete && displayedMove !== "unknown" && displayedConfidence > 0.55) {
    roundSamples.push(displayedMove);
    if (mode === "predict") predictionSamples.push(displayedMove);
  }

  if (socket && socket.readyState === WebSocket.OPEN && roomStarted && !localMoveSubmitted && displayedMove !== "unknown" && displayedConfidence > 0.55) {
    localMoveSubmitted = true;
    sendRoomMessage({
      type: "player_move",
      roomCode,
      playerId,
      move: displayedMove,
    });
    resultEl.textContent = "Move sent — waiting for round result";
  }
}

function getCurrentRoleLabel() {
  return selectedRole === "host" || isHost ? "Host" : "Participant";
}

function setMode(nextMode) {
  mode = nextMode;
  unbeatableMode.classList.toggle("active", mode === "unbeatable");
  predictMode.classList.toggle("active", mode === "predict");
  resultEl.textContent = mode === "unbeatable" ? "Machine counters before shoot" : "Machine predicts early";
}

async function playRound() {
  if (tournamentEnabledEl.checked && tournament.winner) return;

  if (socket && socket.readyState === WebSocket.OPEN && roomCode) {
    if (isHost) {
      sendRoomMessage({
        type: "start_round",
        roomCode,
        playerId,
      });
    } else {
      resultEl.textContent = "Waiting for host to start the round";
    }
    return;
  }

  if (roundRunning || !cameraRunning) return;

  roundRunning = true;
  roundComplete = false;
  finalHumanMove = "unknown";
  finalMachineMove = "unknown";
  playButton.disabled = true;
  predictionSamples = [];
  roundSamples = [];
  machineMoveEl.textContent = "-";
  resultEl.textContent = "Rock";

  await tick("3");
  await tick("2");
  await tick("1");

  const roundPlayers = getRoundPlayers();
  const lockedMachineMove = chooseMachineMove(roundPlayers.map((player) => player.move));
  machineMoveEl.textContent = EMOJI[lockedMachineMove];

  await tick("SHOOT");

  finishRound(roundPlayers, lockedMachineMove);
}

function tick(text) {
  countdownEl.textContent = text;
  resultEl.textContent = text === "SHOOT" ? "Shoot" : "Get ready";
  return new Promise((resolve) => setTimeout(resolve, text === "SHOOT" ? 420 : 700));
}

function chooseMachineMove(humanMove) {
  const moveList = Array.isArray(humanMove) ? humanMove : [humanMove];
  const validMoves = moveList.filter(isRpsMove);
  const dominantMove = mostCommon(validMoves) || moveList[0] || "rock";

  if (mode === "unbeatable") {
    return isRpsMove(dominantMove) ? COUNTER[dominantMove] : randomMove();
  }

  const predicted = mostCommon(predictionSamples) || dominantMove;
  if (!isRpsMove(predicted)) return randomMove();
  return COUNTER[predicted];
}

function finishRound(humanPlayersForRound, machineMove) {
  const roundResults = Array.isArray(humanPlayersForRound)
    ? humanPlayersForRound.map((player) => ({
        ...player,
        outcome: getOutcome(player.move, machineMove),
      }))
    : [{
        name: "You",
        move: humanPlayersForRound,
        outcome: getOutcome(humanPlayersForRound, machineMove),
      }];

  const firstPlayerMove = roundResults[0]?.move || "unknown";
  finalHumanMove = firstPlayerMove;
  finalMachineMove = machineMove;
  if (isRpsMove(firstPlayerMove)) lastLockedHumanMove = firstPlayerMove;
  roundComplete = true;
  machineMoveEl.textContent = EMOJI[machineMove];
  humanMoveEl.textContent = EMOJI[firstPlayerMove] || "-";
  countdownEl.textContent = "READY";

  score.rounds += 1;
  let humanWins = 0;
  let machineWins = 0;

  roundResults.forEach((player, index) => {
    if (player.outcome === "machine") {
      score.machine += 1;
      machineWins += 1;
    }
    if (player.outcome === "human") {
      score.human += 1;
      humanWins += 1;
      if (humanPlayers[index]) humanPlayers[index].score += 1;
    }
  });

  roundsEl.textContent = score.rounds;
  machineScoreEl.textContent = score.machine;
  humanScoreEl.textContent = score.human;

  if (roundResults.length > 1) {
    const winners = roundResults.filter((player) => player.outcome === "human").map((player) => player.name);
    const losers = roundResults.filter((player) => player.outcome === "machine").map((player) => player.name);

    if (winners.length && !losers.length) {
      resultEl.textContent = `${winners.join(" & ")} beat the bot`;
    } else if (losers.length && !winners.length) {
      resultEl.textContent = `Bot wins against ${losers.join(" & ")}`;
    } else if (winners.length && losers.length) {
      resultEl.textContent = `${winners.join(" & ")} win; bot beats ${losers.join(" & ")}`;
    } else {
      resultEl.textContent = `Tie: everyone chose ${EMOJI[machineMove]}`;
    }
  } else {
    const outcome = roundResults[0].outcome;
    if (outcome === "machine") resultEl.textContent = `Machine wins: ${EMOJI[machineMove]} beats ${EMOJI[firstPlayerMove]}`;
    if (outcome === "tie") resultEl.textContent = `Tie: both chose ${EMOJI[firstPlayerMove]}`;
    if (outcome === "human") resultEl.textContent = `You win: ${EMOJI[firstPlayerMove]} beats ${EMOJI[machineMove]}`;
    if (outcome === "unknown") resultEl.textContent = "No clear hand";
  }

  if (tournamentEnabledEl.checked && roundResults[0]) {
    recordTournamentRoundResult(roundResults[0].name, roundResults[0].outcome);
  }

  roundResults.forEach((player) => {
    if (player.index > 0 && isRpsMove(player.move)) {
      setPlayerMoveStatus(player.index, player.move);
    }
  });

  renderPlayerScores();
  roundRunning = false;
  playButton.disabled = tournamentEnabledEl.checked && tournament.winner !== null;
}

function recordTournamentRoundResult(playerName, outcome) {
  tournament = recordTournamentRound(tournament, playerName, outcome);
  renderTournamentScoreboard();

  if (tournament.winner) {
    resultEl.textContent = `${tournament.winner} wins the tournament trophy!`;
    playButton.disabled = true;
  }
}

function renderTournamentScoreboard() {
  if (!tournamentEnabledEl.checked) {
    tournamentStatusEl.textContent = "Tournament mode is off";
    tournamentHistoryEl.replaceChildren();
    return;
  }

  tournamentStatusEl.textContent = tournament.winner
    ? `${tournament.winner} takes the trophy · final ${tournament.humanWins}–${tournament.machineWins}`
    : `First to ${tournament.winsNeeded} · ${tournament.humanWins}–${tournament.machineWins} · Round ${tournament.roundsPlayed + 1}`;

  const rows = tournament.history.map((entry) => {
    const outcomeText = entry.outcome === "human"
      ? `${entry.playerName} wins`
      : entry.outcome === "machine"
        ? "Machine wins"
        : entry.outcome === "tie"
          ? "Tie"
          : "No clear hand";
    const row = document.createElement("li");
    const roundLabel = document.createElement("span");
    const outcomeLabel = document.createElement("span");
    const scoreLabel = document.createElement("strong");
    roundLabel.textContent = `Round ${entry.round}`;
    outcomeLabel.textContent = outcomeText;
    scoreLabel.textContent = `${entry.humanWins}–${entry.machineWins}`;
    row.append(roundLabel, outcomeLabel, scoreLabel);
    return row;
  });
  tournamentHistoryEl.replaceChildren(...rows);
}

function startNewTournament() {
  tournament = createTournament(Number(tournamentBestOfEl.value));
  renderTournamentScoreboard();
  playButton.disabled = !cameraRunning;
  resultEl.textContent = "New tournament ready";
}

function getRoundPlayers() {
  const humanCount = Math.max(1, Math.min(4, Number(playerCountEl.value) || 1));
  const players = [];

  for (let index = 0; index < humanCount; index += 1) {
    const player = humanPlayers[index] || { name: defaultHumanNames[index], score: 0 };
    const value = index === 0 ? getFinalHumanMove() : getManualPlayerMove(index);
    const trimmedName = (player.name || defaultHumanNames[index] || `Player ${index + 1}`).trim();
    players.push({
      index,
      name: trimmedName || defaultHumanNames[index] || `Player ${index + 1}`,
      move: value,
    });
  }

  return players;
}

function getManualPlayerMove(index) {
  if (demoMode && index > 0) {
    return randomMove();
  }

  const selector = humanPlayersEl.querySelector(`.player-move[data-index="${index}"]`);
  if (!selector) return "unknown";
  const move = selector.dataset.move;
  return isRpsMove(move) ? move : "unknown";
}

function setPlayerMoveStatus(index, move) {
  const statusEl = humanPlayersEl.querySelector(`.player-move[data-index="${index}"]`);
  if (!statusEl) return;

  if (index === 0) {
    statusEl.dataset.move = "camera";
    statusEl.textContent = "Camera";
    return;
  }

  const normalized = isRpsMove(move) ? move : "waiting";
  statusEl.dataset.move = normalized;
  statusEl.textContent = normalized === "waiting" ? "Waiting" : capitalizeMove(normalized);
}

function capitalizeMove(move) {
  if (!move) return "Waiting";
  return move.charAt(0).toUpperCase() + move.slice(1);
}

function renderPlayerScores() {
  const names = [...humanPlayers].slice(0, Number(playerCountEl.value) || 1).map((player) => ({
    name: player.name || "Player",
    score: player.score,
  }));

  const rows = [{ name: "Bot", score: score.machine }, ...names];
  playerScoreboardEl.innerHTML = rows
    .map((entry) => `<div class="player-score"><span>${entry.name}</span><strong>${entry.score}</strong></div>`)
    .join("");

  renderLobbyPlayers();
}

function syncHumanPlayers() {
  const humanCount = Math.max(1, Math.min(4, Number(playerCountEl.value) || 1));
  const rows = humanPlayersEl.querySelectorAll(".human-player");

  rows.forEach((row) => {
    const rowIndex = Number(row.dataset.index);
    const input = row.querySelector(".player-name");
    const shouldShow = rowIndex < humanCount;
    row.hidden = !shouldShow;
    if (shouldShow) {
      const value = "Player";
      input.value = value;
      humanPlayers[rowIndex] = {
        ...(humanPlayers[rowIndex] || { score: 0 }),
        name: value,
      };
      setPlayerMoveStatus(rowIndex, rowIndex === 0 ? "camera" : "waiting");
    }
  });

  renderPlayerScores();
}

function getOutcome(humanMove, machineMove) {
  if (humanMove === "unknown") return "unknown";
  if (humanMove === machineMove) return "tie";
  return BEATS[machineMove] === humanMove ? "machine" : "human";
}

function getFinalHumanMove() {
  const recentSamples = roundSamples.slice(-14);
  const votedMove = mostCommon(recentSamples);
  if (isRpsMove(votedMove)) return votedMove;
  if (getCurrentMoveConfidence() > 0.52) return resolveCurrentMove();
  if (isRpsMove(lastLockedHumanMove)) return lastLockedHumanMove;
  return "unknown";
}

function mostCommon(items) {
  if (!items.length) return null;
  const counts = items.reduce((acc, item) => {
    acc[item] = (acc[item] || 0) + 1;
    return acc;
  }, {});
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

function randomMove() {
  const moves = ["rock", "paper", "scissors"];
  return moves[Math.floor(Math.random() * moves.length)];
}

function capturePose() {
  const label = cleanLabel();
  if (!label || !latestLandmarks) {
    resultEl.textContent = !label ? "Add a label first" : "Show a hand first";
    return;
  }

  dataset.samples.push({
    id: crypto.randomUUID(),
    type: "pose",
    label,
    vector: vectorizeLandmarks(latestLandmarks),
    createdAt: new Date().toISOString(),
  });

  saveDataset();
  resultEl.textContent = `Captured ${label}`;
}

function toggleMotionRecording() {
  const label = cleanLabel();
  if (!label) {
    resultEl.textContent = "Add a label first";
    return;
  }

  if (!recordingMotion) {
    recordingMotion = true;
    motionFrames = [];
    recordButton.textContent = "Stop Motion";
    resultEl.textContent = `Recording ${label}`;
    return;
  }

  recordingMotion = false;
  recordButton.textContent = "Record Motion";

  if (motionFrames.length < 8) {
    resultEl.textContent = "Motion too short";
    motionFrames = [];
    return;
  }

  dataset.samples.push({
    id: crypto.randomUUID(),
    type: "motion",
    label,
    vector: summarizeMotion(motionFrames),
    frameCount: motionFrames.length,
    createdAt: new Date().toISOString(),
  });

  motionFrames = [];
  saveDataset();
  resultEl.textContent = `Learned motion ${label}`;
}

function vectorizeLandmarks(landmarks) {
  const wrist = landmarks[0];
  const middleBase = landmarks[9];
  const scale = Math.hypot(middleBase.x - wrist.x, middleBase.y - wrist.y, middleBase.z - wrist.z) || 1;
  return landmarks.flatMap((point) => [
    round((point.x - wrist.x) / scale),
    round((point.y - wrist.y) / scale),
    round((point.z - wrist.z) / scale),
  ]);
}

function summarizeMotion(frames) {
  const first = frames[0];
  const middle = frames[Math.floor(frames.length / 2)];
  const last = frames[frames.length - 1];
  const delta = last.map((value, index) => round(value - first[index]));
  return [...first, ...middle, ...last, ...delta];
}

function updateCustomPrediction() {
  if (!latestLandmarks || dataset.samples.length < 3) {
    customPrediction = null;
    customPredictionEl.textContent = dataset.samples.length ? "Need more samples" : "Need samples";
    return;
  }

  const poseVector = vectorizeLandmarks(latestLandmarks);
  const posePrediction = classifyVector(poseVector, "pose");
  const motionVector = liveMotionFrames.length >= 8 ? summarizeMotion(liveMotionFrames) : null;
  const motionPrediction = motionVector ? classifyVector(motionVector, "motion") : null;
  customPrediction = chooseBestPrediction(posePrediction, motionPrediction);

  if (!customPrediction) {
    customPredictionEl.textContent = "No match";
    return;
  }

  customPredictionEl.textContent = `${customPrediction.label} ${Math.round(customPrediction.confidence * 100)}%`;
}

function resolveCurrentMove() {
  return getCurrentDetection().move;
}

function getCurrentMoveConfidence() {
  return getCurrentDetection().confidence;
}

function getCurrentDetection() {
  const candidates = [];

  if (isRpsMove(latestMove) && latestScore > 0.52) {
    candidates.push({ move: latestMove, confidence: latestScore, priority: 2 });
  }

  if (isRpsMove(heuristicMove) && heuristicScore > 0.7) {
    candidates.push({ move: heuristicMove, confidence: heuristicScore, priority: 3 });
  }

  const customMove = canonicalLabel(customPrediction?.label);
  if (isRpsMove(customMove) && customPrediction?.confidence > 0.62) {
    candidates.push({ move: customMove, confidence: customPrediction.confidence, priority: 1 });
  }

  if (!candidates.length) return { move: "unknown", confidence: 0 };

  return candidates.sort((a, b) => {
    const confidenceDelta = b.confidence - a.confidence;
    if (Math.abs(confidenceDelta) > 0.08) return confidenceDelta;
    return b.priority - a.priority;
  })[0];
}

function inferRpsFromLandmarks(landmarks) {
  if (!landmarks?.length) return { move: "unknown", confidence: 0 };

  const fingers = {
    index: isFingerExtended(landmarks, 8, 6),
    middle: isFingerExtended(landmarks, 12, 10),
    ring: isFingerExtended(landmarks, 16, 14),
    pinky: isFingerExtended(landmarks, 20, 18),
  };

  const extendedCount = Object.values(fingers).filter(Boolean).length;

  if (fingers.index && fingers.middle && !fingers.ring && !fingers.pinky) {
    return { move: "scissors", confidence: 0.92 };
  }

  if (extendedCount >= 3) {
    return { move: "paper", confidence: extendedCount === 4 ? 0.9 : 0.74 };
  }

  if (extendedCount <= 1) {
    return { move: "rock", confidence: extendedCount === 0 ? 0.88 : 0.72 };
  }

  return { move: "unknown", confidence: 0 };
}

function isFingerExtended(landmarks, tipIndex, pipIndex) {
  const tip = landmarks[tipIndex];
  const pip = landmarks[pipIndex];
  const wrist = landmarks[0];
  const palmScale = Math.abs(landmarks[9].y - wrist.y) || 0.08;
  return tip.y < pip.y - palmScale * 0.12;
}

function chooseBestPrediction(posePrediction, motionPrediction) {
  if (!posePrediction) return motionPrediction;
  if (!motionPrediction) return posePrediction;
  return motionPrediction.confidence > posePrediction.confidence + 0.12 ? motionPrediction : posePrediction;
}

function classifyVector(vector, type) {
  const candidates = dataset.samples.filter((sample) => sample.type === type && sample.vector.length === vector.length);
  if (!candidates.length) return null;

  const nearest = candidates
    .map((sample) => ({
      label: sample.label,
      distance: euclideanDistance(vector, sample.vector),
    }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 5);

  const votes = nearest.reduce((acc, item) => {
    acc[item.label] = (acc[item.label] || 0) + 1 / Math.max(item.distance, 0.0001);
    return acc;
  }, {});

  const [label, weight] = Object.entries(votes).sort((a, b) => b[1] - a[1])[0];
  const total = Object.values(votes).reduce((sum, value) => sum + value, 0);
  return { label, confidence: weight / total };
}

function euclideanDistance(a, b) {
  let sum = 0;
  for (let i = 0; i < a.length; i += 1) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum / a.length);
}

function cleanLabel() {
  return canonicalLabel(gestureLabelInput.value);
}

function canonicalLabel(label) {
  const cleaned = String(label || "").trim().toLowerCase().replace(/\s+/g, "_");
  return LABEL_ALIASES[cleaned] || cleaned;
}

function isRpsMove(label) {
  return label === "rock" || label === "paper" || label === "scissors";
}

function round(value) {
  return Number(value.toFixed(5));
}

function saveDataset() {
  localStorage.setItem("aiml-rps-dataset", JSON.stringify(dataset));
  updateDatasetCount();
}

function loadDataset() {
  const empty = { version: 1, samples: [] };
  try {
    const stored = JSON.parse(localStorage.getItem("aiml-rps-dataset"));
    if (!stored?.samples) return empty;
    stored.samples = stored.samples.map(normalizeSample);
    localStorage.setItem("aiml-rps-dataset", JSON.stringify(stored));
    return stored;
  } catch {
    return empty;
  }
}

function updateDatasetCount() {
  const poses = dataset.samples.filter((sample) => sample.type === "pose").length;
  const motions = dataset.samples.filter((sample) => sample.type === "motion").length;
  datasetCountEl.textContent = `${poses} poses, ${motions} motions`;
}

function exportDataset() {
  const blob = new Blob([JSON.stringify(dataset, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `hand-gesture-dataset-${Date.now()}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

async function importDataset() {
  const [file] = importFile.files;
  if (!file) return;

  try {
    const imported = JSON.parse(await file.text());
    if (!Array.isArray(imported.samples)) throw new Error("Invalid dataset");
    const existingIds = new Set(dataset.samples.map((sample) => sample.id));
    const newSamples = imported.samples
      .map(normalizeSample)
      .filter((sample) => !existingIds.has(sample.id));
    dataset.samples = [...dataset.samples, ...newSamples];
    saveDataset();
    resultEl.textContent = `Imported ${newSamples.length} samples`;
  } catch (error) {
    console.error(error);
    resultEl.textContent = "Import failed";
  } finally {
    importFile.value = "";
  }
}

function normalizeSample(sample) {
  return {
    ...sample,
    label: canonicalLabel(sample.label),
  };
}

cameraButton.addEventListener("click", startCamera);
playButton.addEventListener("click", playRound);
joinRoomButton.addEventListener("click", joinRoom);
demo2Button.addEventListener("click", () => setDemoMode(2));
demo3Button.addEventListener("click", () => setDemoMode(3));
demo4Button.addEventListener("click", () => setDemoMode(4));
roleButtons.forEach((button) => {
  button.addEventListener("click", () => setSelectedRole(button.dataset.role));
});
unbeatableMode.addEventListener("click", () => setMode("unbeatable"));
predictMode.addEventListener("click", () => setMode("predict"));
captureButton.addEventListener("click", capturePose);
recordButton.addEventListener("click", toggleMotionRecording);
exportButton.addEventListener("click", exportDataset);
importButton.addEventListener("click", () => importFile.click());
importFile.addEventListener("change", importDataset);
playerCountEl.addEventListener("change", () => {
  demoMode = false;
  const totalPlayers = Math.max(1, Math.min(4, Number(playerCountEl.value) || 1));
  for (let index = 0; index < 4; index += 1) {
    humanPlayers[index] = {
      name: index < totalPlayers ? `Player ${index + 1}` : defaultHumanNames[index],
      score: humanPlayers[index]?.score || 0,
    };
  }
  syncHumanPlayers();
});
tournamentEnabledEl.addEventListener("change", () => {
  tournamentBestOfEl.disabled = tournamentEnabledEl.checked;
  resetTournamentButton.hidden = !tournamentEnabledEl.checked;
  tournament = createTournament(Number(tournamentBestOfEl.value));
  renderTournamentScoreboard();
  playButton.disabled = !cameraRunning;
  if (tournamentEnabledEl.checked) resultEl.textContent = "Tournament ready";
});
resetTournamentButton.addEventListener("click", startNewTournament);
humanPlayersEl.addEventListener("input", (event) => {
  const target = event.target;
  if (!target.matches(".player-name")) return;

  const index = Number(target.dataset.index);
  if (Number.isNaN(index)) return;
  humanPlayers[index].name = target.value.trim() || defaultHumanNames[index] || `Player ${index + 1}`;
  renderPlayerScores();
});

cameraButton.disabled = true;
updateDatasetCount();
syncHumanPlayers();
renderPlayerScores();
renderLobbyPlayers();
renderTournamentScoreboard();
roomCodeBadge.textContent = roomCode;
bootModel();
