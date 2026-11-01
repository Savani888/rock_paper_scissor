import assert from "node:assert/strict";
import { createTournament, recordTournamentRound } from "../tournament.mjs";

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

function getMultiPlayerRoundSummary(humanMoves, botMove) {
  if (!Array.isArray(humanMoves)) return { winners: [], losers: [] };

  const winners = [];
  const losers = [];

  humanMoves.forEach((player) => {
    const outcome = getOutcome(player.move, botMove);
    if (outcome === "human") winners.push(player.name);
    if (outcome === "machine") losers.push(player.name);
  });

  return { winners, losers };
}

assert.equal(getOutcome("rock", "scissors"), "human");
assert.equal(getOutcome("paper", "rock"), "human");
assert.equal(getOutcome("scissors", "paper"), "human");
assert.equal(getOutcome("scissors", "rock"), "machine");
assert.equal(getOutcome("rock", "paper"), "machine");
assert.equal(getOutcome("paper", "scissors"), "machine");
assert.equal(getOutcome("rock", "rock"), "tie");
assert.equal(getOutcome("unknown", "paper"), "unknown");

assert.deepEqual(getMultiPlayerRoundSummary([
  { name: "Alice", move: "rock" },
  { name: "Bob", move: "scissors" },
  { name: "Cara", move: "paper" },
], "paper"), {
  winners: ["Bob"],
  losers: ["Alice"],
});

assert.deepEqual(getMultiPlayerRoundSummary([
  { name: "Ada", move: "rock" },
  { name: "Ben", move: "rock" },
], "rock"), {
  winners: [],
  losers: [],
});

assert.throws(() => createTournament(4), RangeError);

let tournament = createTournament(5);
tournament = recordTournamentRound(tournament, "Alice", "human");
assert.deepEqual(
  [tournament.roundsPlayed, tournament.humanWins, tournament.machineWins, tournament.winner],
  [1, 1, 0, null],
);
tournament = recordTournamentRound(tournament, "Alice", "tie");
tournament = recordTournamentRound(tournament, "Alice", "machine");
tournament = recordTournamentRound(tournament, "Alice", "human");
tournament = recordTournamentRound(tournament, "Alice", "human");
assert.deepEqual(
  [tournament.roundsPlayed, tournament.humanWins, tournament.machineWins, tournament.winner],
  [5, 3, 1, "Alice"],
);
assert.equal(recordTournamentRound(tournament, "Alice", "machine"), tournament);

tournament = createTournament(3);
tournament = recordTournamentRound(tournament, "Bob", "machine");
tournament = recordTournamentRound(tournament, "Bob", "machine");
assert.equal(tournament.winner, "Machine");

console.log("game logic tests passed");
