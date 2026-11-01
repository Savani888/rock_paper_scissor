const VALID_BEST_OF_VALUES = new Set([3, 5, 7]);

export function createTournament(bestOf = 5) {
  if (!VALID_BEST_OF_VALUES.has(bestOf)) {
    throw new RangeError("Best-of value must be 3, 5, or 7");
  }

  return {
    bestOf,
    winsNeeded: Math.ceil(bestOf / 2),
    roundsPlayed: 0,
    humanWins: 0,
    machineWins: 0,
    winner: null,
    history: [],
  };
}

export function recordTournamentRound(tournament, playerName, outcome) {
  if (tournament.winner) return tournament;
  if (!["human", "machine", "tie", "unknown"].includes(outcome)) {
    throw new RangeError("Outcome must be human, machine, tie, or unknown");
  }

  const humanWins = tournament.humanWins + Number(outcome === "human");
  const machineWins = tournament.machineWins + Number(outcome === "machine");
  const roundsPlayed = tournament.roundsPlayed + 1;
  const winner = humanWins >= tournament.winsNeeded
    ? playerName
    : machineWins >= tournament.winsNeeded
      ? "Machine"
      : null;

  return {
    ...tournament,
    roundsPlayed,
    humanWins,
    machineWins,
    winner,
    history: [
      ...tournament.history,
      {
        round: roundsPlayed,
        playerName,
        outcome,
        humanWins,
        machineWins,
      },
    ],
  };
}
