"use client";

import React from "react";
import { Bracket, IRoundProps, ISeedProps, Seed } from "@oliverlooney/react-brackets";
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
  // Los matches de bye ya están generados en la primera ronda con el orden correcto
  // Solo necesitamos ordenarlos por bracketPos
  const expandWithByeMatches = (roundIdx: number): Match[] => {
    const matches = matchesByRound[rounds[roundIdx]] || [];
    // Ordenar por bracketPos para mantener el orden correcto del bracket
    return [...matches].sort((a, b) => {
      const posA = a.bracketPos ?? 999;
      const posB = b.bracketPos ?? 999;
      return posA - posB;
    });
  };

  // Transformar nuestros datos al formato que espera react-brackets
  const bracketRounds: IRoundProps[] = rounds.map((round, roundIdx) => {
    // Para cada ronda, expandir con matches fantasma si es necesario
    const matches = expandWithByeMatches(roundIdx);

      const seeds: ISeedProps[] = matches.map((match) => {
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

      // Usar un formato especial con el ID del match para identificarlo directamente
      // Formato: [MATCH_ID]schedule|team1|team2|scores
      const separator = '|';
      const team1DisplayName = `[${match.id}]${scheduleText}${separator}${team1Name}${separator}${team2Name}${separator}${scoresText}`;

      const seed: ISeedProps = {
        id: match.id,
        teams: [
          {
            name: team1DisplayName || "—",
            id: match.team1?.id || null,
          },
          {
            name: "", // Segundo team vacío
            id: match.team2?.id || null,
          },
        ],
      };

      // Guardar metadata para estilos y lógica
      (seed as any).scheduleText = scheduleText;
      (seed as any).scoresText = scoresText;
      (seed as any).team1Name = team1Name;
      (seed as any).team2Name = team2Name;

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
        if (seed.id && typeof seed.id === 'number' && seed.id > 0 && seed.teams && seed.teams.length >= 2) {
          // teams[0] es la primera pareja, teams[1] es la segunda pareja
          const team1Name = seed.teams[0]?.name || '';
          const team2Name = seed.teams[1]?.name || '';
          if (team1Name && team2Name && team1Name !== "—" && team2Name !== "—") {
            map.set(seed.id as number, { team1Name, team2Name });
          }
        }
      });
    });
    return map;
  }, [bracketRounds]);

  const bracketRef = React.useRef<HTMLDivElement>(null);

  // Agregar estilos CSS para estructurar los matches directamente desde los datos
  React.useEffect(() => {
    const styleId = 'bracket-match-styles';
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
        /* Estructurar el contenido del match usando white-space: pre-line para preservar saltos de línea */
        [class*="seed"] [class*="seedTeam"] {
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          gap: 2px !important;
          background-color: rgba(230, 126, 29, 0.9) !important;
          border-radius: 4px !important;
          padding: 4px !important;
          width: 100% !important;
          white-space: pre-line !important;
          text-align: center !important;
        }
        /* Ocultar el segundo team (está vacío) */
        [class*="seed"] [class*="seedTeam"]:nth-child(2) {
          display: none !important;
        }
        /* Estilizar las líneas individuales usando :nth-line (si está disponible) o usar spans */
        /* Como :nth-line no está ampliamente soportado, usaremos JavaScript para estructurar */
      `;
      document.head.appendChild(style);
    }
  }, []);

  // Estructurar matches directamente desde los datos cuando se renderizan
  React.useEffect(() => {
    if (!bracketRef.current) return;

    // Crear un mapa de seed ID -> datos del seed para acceso directo
    const seedDataMap = new Map<number, any>();
    bracketRounds.forEach((round) => {
      round.seeds.forEach((seed: any) => {
        if (seed.id) {
          seedDataMap.set(seed.id, seed);
        }
      });
    });

    const structureMatch = (container: HTMLElement, seedId: number) => {
      const seed = seedDataMap.get(seedId);
      if (!seed || container.querySelector('.bracket-match-structured')) return;

      const scheduleText = seed.scheduleText || '';
      const scoresText = seed.scoresText || '';
      const team1Name = seed.team1Name || "—";
      const team2Name = seed.team2Name || "—";

      // Crear los 4 divs directamente desde los datos
      const wrapper = document.createElement('div');
      wrapper.className = 'bracket-match-structured';
      wrapper.style.cssText = `
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 2px;
        background-color: rgba(230, 126, 29, 0.9);
        border-radius: 4px;
        padding: 4px;
        width: 100%;
      `.replace(/\s+/g, ' ').trim();

      if (scheduleText) {
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
        wrapper.appendChild(scheduleDiv);
      }

      const team1Div = document.createElement('div');
      team1Div.className = 'bracket-team1-div';
      team1Div.textContent = team1Name;
      team1Div.style.cssText = 'font-size: 12px; text-align: center; padding: 4px; width: 100%; color: rgba(255, 255, 255, 1);';
      if (seed.teams?.[0]?.isWinner) {
        team1Div.style.cssText += 'background-color: rgba(255, 215, 0, 0.9); border-radius: 3px; color: rgba(0, 0, 0, 0.9);';
      }
      wrapper.appendChild(team1Div);

      const team2Div = document.createElement('div');
      team2Div.className = 'bracket-team2-div';
      team2Div.textContent = team2Name;
      team2Div.style.cssText = 'font-size: 12px; text-align: center; padding: 4px; width: 100%; color: rgba(255, 255, 255, 1);';
      if (seed.teams?.[1]?.isWinner) {
        team2Div.style.cssText += 'background-color: rgba(255, 215, 0, 0.9); border-radius: 3px; color: rgba(0, 0, 0, 0.9);';
      }
      wrapper.appendChild(team2Div);

      if (scoresText) {
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
        wrapper.appendChild(scoresDiv);
      }

      container.innerHTML = '';
      container.appendChild(wrapper);
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

    // Estructurar matches existentes usando el ID del match directamente desde el texto
    const structureExistingMatches = () => {
      bracketRounds.forEach((round) => {
        round.seeds.forEach((seed: any) => {
          if (!seed.id) return;
          // Buscar el contenedor que contiene el ID del match en el formato [ID]
          const allElements = bracketRef.current?.querySelectorAll('*');
          allElements?.forEach((el) => {
            const text = el.textContent || '';
            // Buscar el formato [ID] en el texto
            const matchIdPattern = new RegExp(`\\[${seed.id}\\]`);
            if (matchIdPattern.test(text)) {
              const htmlEl = el as HTMLElement;
              const rect = htmlEl.getBoundingClientRect();
              // Verificar que es un contenedor razonable
              if (rect.width >= 50 && rect.width <= 500 && rect.height >= 30 && rect.height <= 200 && 
                  !htmlEl.querySelector('.bracket-match-structured')) {
                structureMatch(htmlEl, seed.id);
                return;
              }
            }
          });
        });
      });
    };

    const timeout = setTimeout(() => {
      if (bracketRef.current) {
        structureExistingMatches();
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

