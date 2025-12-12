"use client";

import { Bracket, RoundProps, SeedProps } from "@oliverlooney/react-brackets";

type Match = {
  id: number;
  round: string;
  bracketPos: number;
  team1: { id: number; name: string } | null;
  team2: { id: number; name: string } | null;
  winner?: { id: number } | null;
  isFinished: boolean;
  scores?: string;
  sourceTeam1?: string | null;
  sourceTeam2?: string | null;
};

type BracketProps = {
  rounds: string[];
  matchesByRound: Record<string, Match[]>;
  onMatchClick?: (matchId: number) => void;
};

const getRoundLabel = (round: string): string => {
  const labels: Record<string, string> = {
    "16avos": "16avos de Final",
    "octavos": "Octavos de Final",
    "cuartos": "Cuartos de Final",
    "semifinal": "Semifinal",
    "final": "Final",
  };
  return labels[round] || round;
};

export function TournamentBracketV2({ rounds, matchesByRound, onMatchClick }: BracketProps) {
  // Crear matches fantasma para equipos con bye
  // Si un equipo tiene bye en una ronda, debe aparecer como un "match" en la ronda anterior
  // con solo ese equipo (sin oponente)
  const expandWithByeMatches = (roundIdx: number): Match[] => {
    const matches = matchesByRound[rounds[roundIdx]] || [];
    const sortedMatches = [...matches].sort((a, b) => a.bracketPos - b.bracketPos);

    // Verificar si hay byes en la siguiente ronda que necesitan matches fantasma en esta ronda
    if (roundIdx < rounds.length - 1) {
      const nextRoundMatches = matchesByRound[rounds[roundIdx + 1]] || [];
      const expandedMatches: Match[] = [...sortedMatches];
      let nextBracketPos = sortedMatches.length > 0 
        ? Math.max(...sortedMatches.map(m => m.bracketPos)) + 1
        : 1;

      // Buscar equipos con bye en la siguiente ronda
      nextRoundMatches.forEach((nextMatch) => {
        // Si sourceTeam1 es null pero team1 está asignado, es un bye
        if (!nextMatch.sourceTeam1 && nextMatch.team1) {
          const ghostMatch: Match = {
            id: -nextMatch.id, // ID negativo para identificar como fantasma
            round: rounds[roundIdx],
            bracketPos: nextBracketPos++,
            team1: nextMatch.team1,
            team2: null, // Sin oponente (bye)
            winner: nextMatch.team1, // El ganador es el mismo equipo (pasa directo)
            isFinished: true,
            scores: undefined,
            sourceTeam1: null,
            sourceTeam2: null,
          };
          expandedMatches.push(ghostMatch);
        }
        // Si sourceTeam2 es null pero team2 está asignado, es un bye
        if (!nextMatch.sourceTeam2 && nextMatch.team2) {
          const ghostMatch: Match = {
            id: -nextMatch.id - 10000, // ID negativo diferente
            round: rounds[roundIdx],
            bracketPos: nextBracketPos++,
            team1: nextMatch.team2,
            team2: null, // Sin oponente (bye)
            winner: nextMatch.team2, // El ganador es el mismo equipo (pasa directo)
            isFinished: true,
            scores: undefined,
            sourceTeam1: null,
            sourceTeam2: null,
          };
          expandedMatches.push(ghostMatch);
        }
      });

      return expandedMatches.sort((a, b) => a.bracketPos - b.bracketPos);
    }

    // Para la última ronda, solo devolver los matches ordenados
    return sortedMatches;
  };

  // Transformar nuestros datos al formato que espera react-brackets
  const bracketRounds: RoundProps[] = rounds.map((round, roundIdx) => {
    // Para cada ronda, expandir con matches fantasma si es necesario
    const matches = expandWithByeMatches(roundIdx);

    const seeds: SeedProps[] = matches.map((match) => {
      const seed: SeedProps = {
        id: match.id,
        teams: [
          match.team1
            ? {
                name: match.team1.name,
                id: match.team1.id,
              }
            : { name: "—", id: null },
          match.team2
            ? {
                name: match.team2.name,
                id: match.team2.id,
              }
            : { name: "—", id: null },
        ],
      };

      // Agregar información adicional si está disponible
      // Los scores se pueden mostrar en el componente personalizado si es necesario
      
      // Marcar ganador si existe
      if (match.winner) {
        if (match.team1?.id === match.winner.id) {
          seed.teams[0].isWinner = true;
        } else if (match.team2?.id === match.winner.id) {
          seed.teams[1].isWinner = true;
        }
      }
      
      // Agregar scores como metadata si está disponible
      if (match.scores) {
        (seed as any).scores = match.scores;
      }

      return seed;
    });

    return {
      title: getRoundLabel(round),
      seeds,
    };
  });

  return (
    <div className="w-full overflow-auto" style={{ maxHeight: "90vh" }}>
      <div className="p-6">
        <Bracket
          rounds={bracketRounds}
          onSeedClick={(seed) => {
            // No permitir click en matches fantasma (IDs negativos)
            if (onMatchClick && seed?.id && seed.id > 0) {
              onMatchClick(seed.id);
            }
          }}
        />
      </div>
    </div>
  );
}

