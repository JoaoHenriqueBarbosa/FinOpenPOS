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
  selectedMatchId?: number | null;
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

export function TournamentBracketV2({ rounds, matchesByRound, onMatchClick, selectedMatchId }: BracketProps) {
  // Crear matches fantasma para equipos con bye
  // Si un equipo tiene bye en una ronda, debe aparecer como un "match" en la ronda anterior
  // con solo ese equipo (sin oponente)
  // La librería espera que los matches estén en orden: match N de la siguiente ronda viene de matches 2N-1 y 2N
  const expandWithByeMatches = (roundIdx: number): Match[] => {
    const matches = matchesByRound[rounds[roundIdx]] || [];
    const sortedMatches = [...matches].sort((a, b) => a.bracketPos - b.bracketPos);

    // Verificar si hay byes en la siguiente ronda que necesitan matches fantasma en esta ronda
    if (roundIdx < rounds.length - 1) {
      const nextRoundMatches = matchesByRound[rounds[roundIdx + 1]] || [];
      const sortedNextRound = [...nextRoundMatches].sort((a, b) => a.bracketPos - b.bracketPos);
      
      // Crear un mapa de posiciones para insertar matches fantasma en el lugar correcto
      const expandedMatches: Match[] = [];
      const ghostMatches: Match[] = [];

      // Primero, identificar todos los matches fantasma necesarios
      sortedNextRound.forEach((nextMatch, nextIdx) => {
        const nextMatchNum = nextMatch.bracketPos;
        // La librería espera: match N viene de matches 2N-1 y 2N
        const expectedPos1 = (nextMatchNum - 1) * 2 + 1;
        const expectedPos2 = (nextMatchNum - 1) * 2 + 2;

        // Si sourceTeam1 es null pero team1 está asignado, es un bye
        if (!nextMatch.sourceTeam1 && nextMatch.team1) {
          const ghostMatch: Match = {
            id: -nextMatch.id, // ID negativo para identificar como fantasma
            round: rounds[roundIdx],
            bracketPos: expectedPos1, // Posición basada en el match de la siguiente ronda
            team1: nextMatch.team1,
            team2: null, // Sin oponente (bye)
            winner: nextMatch.team1, // El ganador es el mismo equipo (pasa directo)
            isFinished: true,
            scores: undefined,
            sourceTeam1: null,
            sourceTeam2: null,
          };
          ghostMatches.push(ghostMatch);
        }
        // Si sourceTeam2 es null pero team2 está asignado, es un bye
        if (!nextMatch.sourceTeam2 && nextMatch.team2) {
          const ghostMatch: Match = {
            id: -nextMatch.id - 10000, // ID negativo diferente
            round: rounds[roundIdx],
            bracketPos: expectedPos2, // Posición basada en el match de la siguiente ronda
            team1: nextMatch.team2,
            team2: null, // Sin oponente (bye)
            winner: nextMatch.team2, // El ganador es el mismo equipo (pasa directo)
            isFinished: true,
            scores: undefined,
            sourceTeam1: null,
            sourceTeam2: null,
          };
          ghostMatches.push(ghostMatch);
        }
      });

      // Combinar matches reales y fantasma, ordenados por bracketPos
      const allMatches = [...sortedMatches, ...ghostMatches];
      return allMatches.sort((a, b) => a.bracketPos - b.bracketPos);
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

  // Usar useEffect para agregar event listeners y highlight después de que el bracket se renderice
  const bracketRef = React.useRef<HTMLDivElement>(null);

  // Agregar estilos CSS para highlight naranja y cambiar azules a verdes
  React.useEffect(() => {
    const styleId = 'bracket-highlight-styles';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        .bracket-match-selected {
          background-color: rgba(249, 115, 22, 0.15) !important;
          border: 2px solid rgb(249, 115, 22) !important;
          border-radius: 4px;
          transition: all 0.2s;
        }
        /* Cambiar colores azules a verdes en los match boxes */
        [class*="seed"] {
          background-color: #2D5016 !important;
        }
        [class*="seed"] svg,
        [class*="seed"] path,
        [class*="seed"] rect {
          fill: #2D5016 !important;
        }
        /* Final en color marrón */
        [class*="seed"]:has([class*="final"]) {
          background-color: #8B4513 !important;
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  React.useEffect(() => {
    if (!bracketRef.current) return;

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      
      // Buscar el elemento padre que contiene el seed completo
      let current: HTMLElement | null = target;
      
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
              onMatchClick(matchId);
              return;
            }
          }
        }
        current = current.parentElement;
      }
    };

    // Función para actualizar highlights
    const updateHighlights = () => {
      // Remover highlights anteriores
      bracketRef.current?.querySelectorAll('.bracket-match-selected').forEach(el => {
        el.classList.remove('bracket-match-selected');
      });

      if (selectedMatchId) {
        // Buscar el elemento que corresponde al match seleccionado
        const allElements = bracketRef.current?.querySelectorAll('*');
        allElements?.forEach((el) => {
          const text = el.textContent || '';
          if (!text.trim()) return;

          for (const [key, matchId] of teamNamesToMatchId.entries()) {
            if (matchId === selectedMatchId) {
              const [team1, team2] = key.split('|');
              const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
              const hasTeam1 = lines.some(l => l.includes(team1));
              const hasTeam2 = lines.some(l => l.includes(team2));
              
              if (hasTeam1 && hasTeam2) {
                (el as HTMLElement).classList.add('bracket-match-selected');
                return;
              }
            }
          }
        });
      }
    };

    const timeout = setTimeout(() => {
      if (bracketRef.current) {
        bracketRef.current.addEventListener('click', handleClick);
        updateHighlights();
      }
    }, 150);

    return () => {
      clearTimeout(timeout);
      if (bracketRef.current) {
        bracketRef.current.removeEventListener('click', handleClick);
      }
    };
  }, [onMatchClick, teamNamesToMatchId, selectedMatchId]);

  return (
    <div className="w-full overflow-auto" style={{ maxHeight: "90vh" }}>
      <div className="p-6" ref={bracketRef}>
        <Bracket rounds={bracketRounds} />
      </div>
    </div>
  );
}

