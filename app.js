import {
  DrawingUtils,
  FilesetResolver,
  GestureRecognizer,
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/vision_bundle.mjs";

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
let finalHumanMove = "unknown";
let finalMachineMove = "unknown";
const score = { rounds: 0, machine: 0, human: 0 };
const dataset = loadDataset();

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
}

function setMode(nextMode) {
  mode = nextMode;
  unbeatableMode.classList.toggle("active", mode === "unbeatable");
  predictMode.classList.toggle("active", mode === "predict");
  resultEl.textContent = mode === "unbeatable" ? "Machine counters before shoot" : "Machine predicts early";
}

async function playRound() {
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

  const currentMove = resolveCurrentMove();
  const lockedMachineMove = chooseMachineMove(currentMove);
  machineMoveEl.textContent = EMOJI[lockedMachineMove];

  await tick("SHOOT");

  const humanMove = getFinalHumanMove();
  finishRound(humanMove, lockedMachineMove);
}

function tick(text) {
  countdownEl.textContent = text;
  resultEl.textContent = text === "SHOOT" ? "Shoot" : "Get ready";
  return new Promise((resolve) => setTimeout(resolve, text === "SHOOT" ? 420 : 700));
}

function chooseMachineMove(humanMove) {
  if (mode === "unbeatable") {
    return humanMove === "unknown" ? randomMove() : COUNTER[humanMove];
  }

  const predicted = mostCommon(predictionSamples) || humanMove;
  if (!isRpsMove(predicted)) return randomMove();
  return COUNTER[predicted];
}

function finishRound(humanMove, machineMove) {
  const outcome = getOutcome(humanMove, machineMove);
  finalHumanMove = humanMove;
  finalMachineMove = machineMove;
  roundComplete = true;
  machineMoveEl.textContent = EMOJI[machineMove];
  humanMoveEl.textContent = EMOJI[humanMove];
  countdownEl.textContent = "READY";

  score.rounds += 1;
  if (outcome === "machine") score.machine += 1;
  if (outcome === "human") score.human += 1;

  roundsEl.textContent = score.rounds;
  machineScoreEl.textContent = score.machine;
  humanScoreEl.textContent = score.human;

  if (outcome === "machine") resultEl.textContent = `Machine wins: ${EMOJI[machineMove]} beats ${EMOJI[humanMove]}`;
  if (outcome === "tie") resultEl.textContent = `Tie: both chose ${EMOJI[humanMove]}`;
  if (outcome === "human") resultEl.textContent = `You win: ${EMOJI[humanMove]} beats ${EMOJI[machineMove]}`;
  if (outcome === "unknown") resultEl.textContent = "No clear hand";

  roundRunning = false;
  playButton.disabled = false;
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
unbeatableMode.addEventListener("click", () => setMode("unbeatable"));
predictMode.addEventListener("click", () => setMode("predict"));
captureButton.addEventListener("click", capturePose);
recordButton.addEventListener("click", toggleMotionRecording);
exportButton.addEventListener("click", exportDataset);
importButton.addEventListener("click", () => importFile.click());
importFile.addEventListener("change", importDataset);

cameraButton.disabled = true;
updateDatasetCount();
bootModel();
