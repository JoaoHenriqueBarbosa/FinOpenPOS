"use client";

import React from "react";
import { Bracket, RoundProps, SeedProps, Seed } from "@oliverlooney/react-brackets";
import { formatDate, formatTime } from "@/lib/date-utils";

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
  matchDate?: string | null;
  startTime?: string | null;
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
      // Construir información de horario
      const scheduleParts: string[] = [];
      if (match.matchDate) {
        scheduleParts.push(formatDate(match.matchDate));
      }
      if (match.startTime) {
        scheduleParts.push(formatTime(match.startTime));
      }
      const scheduleText = scheduleParts.length > 0 ? scheduleParts.join(' • ') : '';
      
      // Nombres de las parejas
      const team1Name = match.team1 ? match.team1.name : "—";
      const team2Name = match.team2 ? match.team2.name : "—";
      const scoresText = match.scores || "";

      // Guardar información adicional en el seed para usarla después
      const seed: SeedProps = {
        id: match.id,
        teams: [
          match.team1
            ? {
                name: team1Name,
                id: match.team1.id,
              }
            : { name: team1Name, id: null },
          match.team2
            ? {
                name: team2Name,
                id: match.team2.id,
              }
            : { name: team2Name, id: null },
        ],
      };

      // Agregar metadata para estructurar en 4 divs
      (seed as any).scheduleText = scheduleText;
      (seed as any).scoresText = scoresText;

      // Marcar ganador si existe
      if (match.winner) {
        if (match.team1?.id === match.winner.id) {
          seed.teams[0].isWinner = true;
        } else if (match.team2?.id === match.winner.id) {
          seed.teams[1].isWinner = true;
        }
      }

      return seed;
    });

    return {
      title: getRoundLabel(round),
      seeds,
    };
  });

  // Crear un mapa de match IDs para identificar clicks
  const matchIdMap = React.useMemo(() => {
    const map = new Map<number, { team1Name: string; team2Name: string }>();
    bracketRounds.forEach(round => {
      round.seeds.forEach((seed: any) => {
        if (seed.id && typeof seed.id === 'number' && seed.id > 0 && seed.teams && seed.teams.length >= 3) {
          // teams[1] es la primera pareja, teams[2] es la segunda pareja
          const team1Name = seed.teams[1]?.name || '';
          const team2Name = seed.teams[2]?.name || '';
          if (team1Name && team2Name && team1Name !== "—" && team2Name !== "—") {
            map.set(seed.id as number, { team1Name, team2Name });
          }
        }
      });
    });
    return map;
  }, [bracketRounds]);

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

  // Estructurar cada match en 4 divs después del render
  React.useEffect(() => {
    if (!bracketRef.current) return;

    const structureMatches = () => {
      bracketRounds.forEach((round) => {
        round.seeds.forEach((seed: any) => {
          if (!seed.id || typeof seed.id !== 'number' || seed.id <= 0) return;
          
          const scheduleText = seed.scheduleText || '';
          const scoresText = seed.scoresText || '';
          const team1Name = seed.teams?.[0]?.name || "—";
          const team2Name = seed.teams?.[1]?.name || "—";

          // Buscar el contenedor del seed por el contenido de los equipos
          const allElements = bracketRef.current?.querySelectorAll('*');
          if (!allElements) return;

          let seedContainer: HTMLElement | null = null;
          allElements.forEach((el) => {
            const htmlEl = el as HTMLElement;
            const text = htmlEl.textContent || '';
            const rect = htmlEl.getBoundingClientRect();
            
            // Verificar que es un contenedor razonable
            if (rect.width < 50 || rect.height < 30) return;
            if (rect.width > 500 || rect.height > 200) return;
            
            // Verificar que contiene ambos equipos
            if (text.includes(team1Name) && text.includes(team2Name) && team1Name !== "—" && team2Name !== "—") {
              // Verificar que no es un contenedor muy grande
              const childCount = htmlEl.children.length;
              if (childCount < 50) {
                seedContainer = htmlEl;
              }
            }
          });

          if (!seedContainer) return;
          
          // Asegurar que es un HTMLElement
          const container = seedContainer as HTMLElement;

          // Verificar si ya está estructurado
          if (container.querySelector('.bracket-schedule-div')) return;

          // Crear los 4 divs
          const scheduleDiv = document.createElement('div');
          scheduleDiv.className = 'bracket-schedule-div';
          scheduleDiv.textContent = scheduleText;
          scheduleDiv.style.cssText = `
            font-size: 10px;
            color: rgba(255, 255, 255, 0.85);
            text-align: center;
            padding: 2px 5px;
            background: rgba(3, 48, 16, 0.7);
            border-radius: 2px;
            white-space: nowrap;
            font-weight: 500;
            line-height: 1.2;
            margin-bottom: 2px;
          `.replace(/\s+/g, ' ').trim();

          const team1Div = document.createElement('div');
          team1Div.className = 'bracket-team1-div';
          team1Div.textContent = team1Name;
          team1Div.style.cssText = 'font-size: 12px; text-align: center; padding: 4px;';
          if (seed.teams?.[0]?.isWinner) {
            team1Div.style.cssText += 'background-color: rgba(253, 102, 2, 0.93); border-radius: 3px;';
          }

          const team2Div = document.createElement('div');
          team2Div.className = 'bracket-team2-div';
          team2Div.textContent = team2Name;
          team2Div.style.cssText = 'font-size: 12px; text-align: center; padding: 4px;';
          if (seed.teams?.[1]?.isWinner) {
            team2Div.style.cssText += 'background-color: rgba(253, 102, 2, 0.93); border-radius: 3px;';
          }

          const scoresDiv = document.createElement('div');
          scoresDiv.className = 'bracket-scores-div';
          scoresDiv.textContent = scoresText;
          scoresDiv.style.cssText = `
            font-size: 10px;
            color: rgba(255, 255, 255, 0.9);
            font-weight: 600;
            padding: 2px 6px;
            background: rgba(3, 48, 16, 0.7);
            border-radius: 2px;
            line-height: 1.2;
            white-space: nowrap;
            margin-top: 2px;
          `.replace(/\s+/g, ' ').trim();

          // Limpiar el contenido original y agregar los 4 divs
          container.innerHTML = '';
          container.style.cssText = `
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 2px;
            background-color: rgba(230, 126, 29, 0.9);
            border-radius: 4px;
            padding: 4px;
          `.replace(/\s+/g, ' ').trim();
          container.appendChild(scheduleDiv);
          container.appendChild(team1Div);
          container.appendChild(team2Div);
          container.appendChild(scoresDiv);
        });
      });
    };

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      let current: HTMLElement | null = target;
      
      while (current && current !== bracketRef.current) {
        const text = current.textContent || '';
        for (const [matchId, { team1Name, team2Name }] of Array.from(matchIdMap.entries())) {
          if (text.includes(team1Name) && text.includes(team2Name)) {
            const lines = text.split('\n').filter(l => l.trim());
            const hasTeam1 = lines.some(l => l.includes(team1Name));
            const hasTeam2 = lines.some(l => l.includes(team2Name));
            if (hasTeam1 && hasTeam2) {
              onMatchClick?.(matchId);
              return;
            }
          }
        }
        current = current.parentElement;
      }
    };

    const updateHighlights = () => {
      bracketRef.current?.querySelectorAll('.bracket-match-selected').forEach(el => {
        el.classList.remove('bracket-match-selected');
      });

      if (selectedMatchId) {
        const matchData = matchIdMap.get(selectedMatchId);
        if (matchData) {
          const allElements = bracketRef.current?.querySelectorAll('*');
          allElements?.forEach((el) => {
            const text = el.textContent || '';
            if (!text.trim()) return;
            const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
            const hasTeam1 = lines.some(l => l.includes(matchData.team1Name));
            const hasTeam2 = lines.some(l => l.includes(matchData.team2Name));
            if (hasTeam1 && hasTeam2) {
              (el as HTMLElement).classList.add('bracket-match-selected');
            }
          });
        }
      }
    };

    const timeout = setTimeout(() => {
      if (bracketRef.current) {
        structureMatches();
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
  }, [bracketRounds, onMatchClick, matchIdMap, selectedMatchId]);

  return (
    <div className="w-full overflow-auto" style={{ maxHeight: "90vh" }}>
      <div className="p-6" ref={bracketRef}>
        <Bracket rounds={bracketRounds} />
      </div>
    </div>
  );
}

