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
      
      // Agregar fecha y hora como metadata
      if (match.matchDate) {
        (seed as any).matchDate = match.matchDate;
      }
      if (match.startTime) {
        (seed as any).startTime = match.startTime;
      }

      return seed;
    });

    return {
      title: getRoundLabel(round),
      seeds,
    };
  });

  // Crear un mapa de nombres de equipos a match IDs y metadata para identificar clicks y mostrar info
  const teamNamesToMatchData = React.useMemo(() => {
    const map = new Map<string, { id: number; matchDate?: string | null; startTime?: string | null; scores?: string }>();
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
            map.set(key, {
              id: seed.id as number,
              matchDate: (seed as any).matchDate,
              startTime: (seed as any).startTime,
              scores: (seed as any).scores,
            });
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
      
      // No hacer click si se hace click en el horario o scores
      if (target.classList.contains('bracket-schedule') || target.classList.contains('bracket-scores')) {
        return;
      }
      
      // Buscar el elemento padre que contiene el seed completo
      let current: HTMLElement | null = target;
      
      // Buscar un elemento que contenga ambos equipos
      while (current && current !== bracketRef.current) {
        const text = current.textContent || '';
        // Buscar en el mapa por combinaciones de nombres de equipos
        for (const [key, matchData] of teamNamesToMatchData.entries()) {
          const [team1, team2] = key.split('|');
          // Verificar que el texto contenga ambos nombres de equipos
          if (text.includes(team1) && text.includes(team2)) {
            // Verificar que este elemento contiene ambos equipos (no solo uno)
            const lines = text.split('\n').filter(l => l.trim());
            const hasTeam1 = lines.some(l => l.includes(team1));
            const hasTeam2 = lines.some(l => l.includes(team2));
            
            if (hasTeam1 && hasTeam2) {
              onMatchClick?.(matchData.id);
              return;
            }
          }
        }
        current = current.parentElement;
      }
    };

    // Función para inyectar horarios y scores en los match boxes sin romper el layout
    const injectScheduleAndScores = () => {
      if (!bracketRef.current) return;

      // Remover elementos anteriores de horarios y scores
      bracketRef.current.querySelectorAll('.bracket-schedule, .bracket-scores').forEach(el => el.remove());

      // Crear un mapa de match IDs a datos para acceso rápido
      const matchIdToData = new Map<number, { matchDate?: string | null; startTime?: string | null; scores?: string }>();
      for (const matchData of teamNamesToMatchData.values()) {
        matchIdToData.set(matchData.id, {
          matchDate: matchData.matchDate,
          startTime: matchData.startTime,
          scores: matchData.scores,
        });
      }

      // Buscar cada match box usando los IDs de los seeds
      bracketRounds.forEach((round) => {
        round.seeds.forEach((seed) => {
          if (!seed.id || typeof seed.id !== 'number' || seed.id <= 0) return;
          
          const matchData = matchIdToData.get(seed.id);
          // Continuar incluso si no hay horario, para agregar highlight al ganador
          // Pero necesitamos al menos tener datos del match o scores para mostrar algo
          if (!matchData && (!seed.winner && !seed.teams?.some(t => t.isWinner))) return;

          if (!seed.teams || seed.teams.length < 2) return;
          const team1Name = seed.teams[0]?.name;
          const team2Name = seed.teams[1]?.name;
          
          if (!team1Name || team1Name === "—" || !team2Name || team2Name === "—") return;

          // Buscar el elemento que contiene ambos nombres de equipos
          // Usar una estrategia más conservadora: buscar elementos con estructura de seed
          const allElements = bracketRef.current?.querySelectorAll('*');
          if (!allElements) return;

          let bestMatch: HTMLElement | null = null;
          let bestScore = Infinity;

          allElements.forEach((el) => {
            const htmlEl = el as HTMLElement;
            const text = htmlEl.textContent || '';
            
            // Verificar que contiene ambos equipos
            if (!text.includes(team1Name) || !text.includes(team2Name)) return;

            // Verificar que es un elemento razonable (no muy grande, no muy pequeño)
            const rect = htmlEl.getBoundingClientRect();
            if (rect.width < 50 || rect.height < 30) return; // Muy pequeño, probablemente texto individual
            if (rect.width > 500 || rect.height > 200) return; // Muy grande, probablemente contenedor de ronda

            // Calcular un "score" basado en qué tan específico es el match
            // Preferir elementos más pequeños que contengan exactamente estos equipos
            const lines = text.split('\n').filter(l => l.trim());
            const team1Line = lines.findIndex(l => l.includes(team1Name));
            const team2Line = lines.findIndex(l => l.includes(team2Name));
            
            if (team1Line >= 0 && team2Line >= 0) {
              const lineDiff = Math.abs(team1Line - team2Line);
              // Preferir elementos donde los equipos están cerca (líneas consecutivas o cercanas)
              if (lineDiff <= 5) {
                const score = rect.width * rect.height + lineDiff * 10;
                if (score < bestScore) {
                  bestScore = score;
                  bestMatch = htmlEl;
                }
              }
            }
          });

          if (bestMatch) {
            // No modificar el tamaño del match box, dejarlo como está
            
            // Crear horario arriba y resultado abajo del match box
            if (matchData && (matchData.matchDate || matchData.startTime || matchData.scores)) {
              // Buscar el contenedor padre del match box para insertar los labels
              let parentContainer: HTMLElement | null = bestMatch.parentElement;
              
              // Si no hay parent o es el contenedor principal del bracket, crear un wrapper
              if (!parentContainer || parentContainer === bracketRef.current) {
                // Crear un wrapper alrededor del match box
                const wrapper = document.createElement('div');
                wrapper.style.cssText = `
                  position: relative;
                  display: flex;
                  flex-direction: column;
                  align-items: center;
                `;
                
                if (bestMatch.parentElement) {
                  bestMatch.parentElement.insertBefore(wrapper, bestMatch);
                  wrapper.appendChild(bestMatch);
                  parentContainer = wrapper;
                }
              }
              
              if (parentContainer) {
                // Crear contenedor para el horario ARRIBA del match box
                if (matchData.matchDate || matchData.startTime) {
                  const scheduleDiv = document.createElement('div');
                  scheduleDiv.className = 'bracket-schedule';
                  
                  const scheduleText: string[] = [];
                  if (matchData.matchDate) {
                    scheduleText.push(formatDate(matchData.matchDate));
                  }
                  if (matchData.startTime) {
                    scheduleText.push(formatTime(matchData.startTime));
                  }
                  
                  scheduleDiv.textContent = scheduleText.join(' • ');
                  scheduleDiv.style.cssText = `
                    font-size: 7px;
                    color: rgba(255, 255, 255, 0.85);
                    text-align: center;
                    padding: 2px 5px;
                    background: rgba(0, 0, 0, 0.7);
                    border-radius: 2px;
                    white-space: nowrap;
                    font-weight: 500;
                    line-height: 1.2;
                    margin-bottom: 4px;
                    pointer-events: none;
                  `;
                  
                  // Insertar el horario antes del match box
                  parentContainer.insertBefore(scheduleDiv, bestMatch);
                }
                
                // Crear contenedor para el resultado ABAJO del match box
                if (matchData.scores) {
                  const scoresDiv = document.createElement('div');
                  scoresDiv.className = 'bracket-scores';
                  scoresDiv.textContent = matchData.scores;
                  scoresDiv.style.cssText = `
                    font-size: 9px;
                    color: rgba(255, 255, 255, 0.9);
                    font-weight: 600;
                    padding: 2px 6px;
                    background: rgba(0, 0, 0, 0.7);
                    border-radius: 2px;
                    line-height: 1.2;
                    white-space: nowrap;
                    margin-top: 4px;
                    pointer-events: none;
                  `;
                  
                  // Insertar el resultado después del match box
                  parentContainer.insertBefore(scoresDiv, bestMatch.nextSibling);
                }
              }
            }

            // Agregar highlight al equipo ganador
            // Usar isWinner del seed si está disponible, o buscar por winner id
            let winnerName: string | undefined;
            if (seed.teams) {
              const winnerTeam = seed.teams.find(t => t.isWinner);
              if (winnerTeam) {
                winnerName = winnerTeam.name;
              } else if (seed.winner) {
                const winnerById = seed.teams.find(t => t?.id === seed.winner?.id);
                winnerName = winnerById?.name;
              }
            }
            
            if (winnerName && team1Name && team2Name) {
              // Esperar un poco para que el DOM se estabilice después de la renderización
              setTimeout(() => {
                // Buscar elementos que contengan el nombre del ganador
                const allTextElements = bestMatch.querySelectorAll('*');
                allTextElements.forEach((el) => {
                  const htmlEl = el as HTMLElement;
                  const text = htmlEl.textContent || '';
                  
                  // Verificar si este elemento contiene el nombre del ganador
                  const otherTeamName = winnerName === team1Name ? team2Name : team1Name;
                  const containsWinner = text.includes(winnerName);
                  const containsOther = text.includes(otherTeamName);
                  
                  // Si contiene el ganador pero no el otro equipo, y el texto es relativamente corto
                  // (para evitar contenedores que incluyan ambos equipos)
                  if (containsWinner && !containsOther && text.length < 100) {
                    // Verificar que no sea un contenedor muy grande
                    const rect = htmlEl.getBoundingClientRect();
                    if (rect.width < 300 && rect.height < 100 && rect.width > 0 && rect.height > 0) {
                      // Agregar highlight al fondo del elemento ganador
                      htmlEl.style.cssText += `
                        background-color: rgba(34, 197, 94, 0.25) !important;
                        border: 1px solid rgba(34, 197, 94, 0.5) !important;
                        border-radius: 3px;
                      `;
                    }
                  }
                });
              }, 100);
            }
          }
        });
      });
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

          for (const [key, matchData] of teamNamesToMatchData.entries()) {
            if (matchData.id === selectedMatchId) {
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
        injectScheduleAndScores();
        updateHighlights();
      }
    }, 150);

    return () => {
      clearTimeout(timeout);
      if (bracketRef.current) {
        bracketRef.current.removeEventListener('click', handleClick);
      }
    };
  }, [onMatchClick, teamNamesToMatchData, selectedMatchId]);

  return (
    <div className="w-full overflow-auto" style={{ maxHeight: "90vh" }}>
      <div className="p-6" ref={bracketRef}>
        <Bracket rounds={bracketRounds} />
      </div>
    </div>
  );
}

