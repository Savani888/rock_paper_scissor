import assert from "node:assert/strict";

const BEATS = {
  rock: "scissors",
  paper: "rock",
  scissors: "paper",
};

function getOutcome(humanMove, machineMove) {
  if (humanMove === "unknown") return "unknown";
  if (humanMove === machineMove) return "tie";
  return BEATS[machineMove] === humanMove ? "machine" : "human";
}

assert.equal(getOutcome("rock", "scissors"), "human");
assert.equal(getOutcome("paper", "rock"), "human");
assert.equal(getOutcome("scissors", "paper"), "human");
assert.equal(getOutcome("scissors", "rock"), "machine");
assert.equal(getOutcome("rock", "paper"), "machine");
assert.equal(getOutcome("paper", "scissors"), "machine");
assert.equal(getOutcome("rock", "rock"), "tie");
assert.equal(getOutcome("unknown", "paper"), "unknown");

console.log("game logic tests passed");
