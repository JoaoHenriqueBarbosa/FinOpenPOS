"use client";

import React from "react";
import { Bracket, RoundProps, SeedProps, Seed } from "@oliverlooney/react-brackets";

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

  // Crear un mapa de nombres de equipos a match IDs para identificar clicks
  const teamNamesToMatchId = React.useMemo(() => {
    const map = new Map<string, number>();
    bracketRounds.forEach(round => {
      round.seeds.forEach(seed => {
        if (seed.id && typeof seed.id === 'number' && seed.id > 0 && seed.teams) {
          const hasBothTeams = seed.teams.length >= 2 &&
            seed.teams[0]?.name && 
            seed.teams[0].name !== "—" &&
            seed.teams[1]?.name && 
            seed.teams[1].name !== "—";
          
          if (hasBothTeams) {
            // Crear una clave única con ambos nombres de equipos
            const key = `${seed.teams[0].name}|${seed.teams[1].name}`;
            map.set(key, seed.id as number);
          }
        }
      });
    });
    return map;
  }, [bracketRounds]);

  // Usar useEffect para agregar event listeners después de que el bracket se renderice
  const bracketRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!bracketRef.current || !onMatchClick) return;

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      
      // Buscar el elemento padre que contiene el seed completo
      let current: HTMLElement | null = target;
      let seedElement: HTMLElement | null = null;
      
      // Buscar un elemento que contenga ambos equipos
      while (current && current !== bracketRef.current) {
        const text = current.textContent || '';
        // Buscar en el mapa por combinaciones de nombres de equipos
        for (const [key, matchId] of teamNamesToMatchId.entries()) {
          const [team1, team2] = key.split('|');
          // Verificar que el texto contenga ambos nombres de equipos
          if (text.includes(team1) && text.includes(team2)) {
            // Verificar que este elemento contiene ambos equipos (no solo uno)
            const lines = text.split('\n').filter(l => l.trim());
            const hasTeam1 = lines.some(l => l.includes(team1));
            const hasTeam2 = lines.some(l => l.includes(team2));
            
            if (hasTeam1 && hasTeam2) {
              console.log("Seed clicked - Match ID:", matchId, "Teams:", team1, "vs", team2);
              onMatchClick(matchId);
              return;
            }
          }
        }
        current = current.parentElement;
      }
    };

    const timeout = setTimeout(() => {
      if (bracketRef.current) {
        bracketRef.current.addEventListener('click', handleClick);
      }
    }, 100);

    return () => {
      clearTimeout(timeout);
      if (bracketRef.current) {
        bracketRef.current.removeEventListener('click', handleClick);
      }
    };
  }, [onMatchClick, teamNamesToMatchId]);

  return (
    <div className="w-full overflow-auto" style={{ maxHeight: "90vh" }}>
      <div className="p-6" ref={bracketRef}>
        <Bracket rounds={bracketRounds} />
      </div>
    </div>
  );
}

