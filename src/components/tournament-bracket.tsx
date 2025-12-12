"use client";

import { useMemo } from "react";

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

const MATCH_WIDTH = 200;
const MATCH_HEIGHT = 80;
const ROUND_GAP = 250;
const MATCH_GAP = 120;
const PADDING = 40;

export function TournamentBracket({ rounds, matchesByRound, onMatchClick }: BracketProps) {
  const bracketData = useMemo(() => {
    const data: Array<{
      round: string;
      matches: Array<{
        match: Match;
        x: number;
        y: number;
      }>;
    }> = [];

    // Calcular altura total necesaria basada en la primera ronda (la que tiene más matches)
    const firstRoundMatches = matchesByRound[rounds[0]] || [];
    const maxMatches = firstRoundMatches.length;
    // Asegurar suficiente altura para todos los matches, incluso con byes
    const totalHeight = Math.max(
      (maxMatches - 1) * MATCH_GAP + MATCH_HEIGHT + PADDING * 2,
      PADDING * 2 + MATCH_HEIGHT // Mínimo necesario
    );

    // Primero calcular posiciones de la primera ronda
    const initialRoundMatches = matchesByRound[rounds[0]] || [];
    const firstRoundSorted = [...initialRoundMatches].sort((a, b) => a.bracketPos - b.bracketPos);
    const firstRoundHeight = (firstRoundSorted.length - 1) * MATCH_GAP;
    const firstRoundStartY = PADDING + (totalHeight - PADDING * 2 - firstRoundHeight) / 2;
    
    rounds.forEach((round, roundIdx) => {
      const matches = matchesByRound[round] || [];
      const sortedMatches = [...matches].sort((a, b) => a.bracketPos - b.bracketPos);
      
      const roundMatches = sortedMatches.map((match, matchIdx) => {
        const x = roundIdx * ROUND_GAP + PADDING;
        
        let calculatedY: number;
        
        if (roundIdx === 0) {
          // Primera ronda: distribución uniforme
          calculatedY = firstRoundStartY + matchIdx * MATCH_GAP;
        } else {
          // Rondas siguientes: calcular Y basado en la posición esperada en el bracket
          // Cada match de esta ronda corresponde a 2 matches de la ronda anterior
          // Pero también debemos considerar matches con bye
          
          // Calcular la posición esperada basada en la primera ronda
          // matchIdx 0 debería estar entre los matches 0 y 1 de la primera ronda
          // matchIdx 1 debería estar entre los matches 2 y 3 de la primera ronda
          const firstRoundMatch1Idx = matchIdx * 2;
          const firstRoundMatch2Idx = matchIdx * 2 + 1;
          
          // Si hay matches en la primera ronda en esas posiciones, usar su promedio
          if (firstRoundMatch1Idx < firstRoundSorted.length && firstRoundMatch2Idx < firstRoundSorted.length) {
            const y1 = firstRoundStartY + firstRoundMatch1Idx * MATCH_GAP;
            const y2 = firstRoundStartY + firstRoundMatch2Idx * MATCH_GAP;
            calculatedY = (y1 + y2) / 2;
          } else if (firstRoundMatch1Idx < firstRoundSorted.length) {
            // Solo existe el primer match de la pareja, usar su posición
            calculatedY = firstRoundStartY + firstRoundMatch1Idx * MATCH_GAP;
          } else {
            // No hay matches en esas posiciones, calcular basado en la posición esperada
            // Esto puede pasar cuando hay byes y algunos matches no existen
            calculatedY = firstRoundStartY + (firstRoundMatch1Idx + 0.5) * MATCH_GAP;
          }
          
          // Asegurar que el Y calculado esté dentro del área visible
          // Si es muy bajo, ajustarlo para que sea visible
          const minY = PADDING + MATCH_HEIGHT / 2;
          const maxY = totalHeight - PADDING - MATCH_HEIGHT / 2;
          calculatedY = Math.max(minY, Math.min(maxY, calculatedY));
        }

        return { match, x, y: calculatedY };
      });

      data.push({ round, matches: roundMatches });
    });

    return data;
  }, [rounds, matchesByRound]);

  const totalWidth = (rounds.length - 1) * ROUND_GAP + MATCH_WIDTH + PADDING * 2;
  
  // Calcular altura basada en la primera ronda (que tiene más matches)
  // Esto asegura que haya suficiente espacio para todos los matches
  const firstRoundMatches = matchesByRound[rounds[0]] || [];
  const maxMatchesInFirstRound = firstRoundMatches.length;
  // La altura debe ser suficiente para mostrar todos los matches de la primera ronda
  const totalHeight = (maxMatchesInFirstRound - 1) * MATCH_GAP + MATCH_HEIGHT + PADDING * 2;
  const HEADER_HEIGHT = 50;

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

  return (
    <div className="w-full overflow-auto" style={{ maxHeight: "90vh" }}>
      <div className="p-6 min-w-fit">
        <svg
          width={Math.max(totalWidth, 800)}
          height={totalHeight + HEADER_HEIGHT + PADDING * 2}
          className="mx-auto"
          viewBox={`0 0 ${Math.max(totalWidth, 800)} ${totalHeight + HEADER_HEIGHT + PADDING * 2}`}
          preserveAspectRatio="xMidYMin meet"
        >
        {/* Round headers */}
        {bracketData.map((roundData, roundIdx) => {
          const x = roundIdx * ROUND_GAP + PADDING;
          return (
            <g key={`header-${roundData.round}`}>
              <text
                x={x + MATCH_WIDTH / 2}
                y={30}
                textAnchor="middle"
                fill="currentColor"
                fontSize="14"
                fontWeight="700"
                className="fill-foreground"
              >
                {getRoundLabel(roundData.round)}
              </text>
            </g>
          );
        })}

        {/* Adjust match positions to account for header */}
        <g transform={`translate(0, ${HEADER_HEIGHT})`}>
        {/* Connection lines */}
        {bracketData.map((roundData, roundIdx) => {
          if (roundIdx === bracketData.length - 1) return null;
          
          const nextRound = bracketData[roundIdx + 1];
          
          return roundData.matches.map((matchData, matchIdx) => {
            const { x, y, match } = matchData;
            
            // Calcular qué match de la siguiente ronda corresponde
            const nextMatchIdx = Math.floor(matchIdx / 2);
            const nextMatch = nextRound.matches[nextMatchIdx];
            
            if (!nextMatch) return null;
            
            // Solo dibujar conexión si este match alimenta al match siguiente
            // Verificar si el match siguiente tiene referencia a este match en sourceTeam1 o sourceTeam2
            const nextMatchData = nextMatch.match;
            
            // Formato: "Ganador {RoundLabel}{bracketPos}" (ej: "Ganador Cuartos1", "Ganador Octavos2")
            // El backend capitaliza la primera letra: round.charAt(0).toUpperCase() + round.slice(1)
            // "16avos" -> "16avos" (primer char es número), "octavos" -> "Octavos", etc.
            const currentRoundLabel = roundData.round.charAt(0).toUpperCase() + roundData.round.slice(1);
            const sourcePattern = `Ganador ${currentRoundLabel}${match.bracketPos}`;
            
            const connectsToTeam1 = nextMatchData.sourceTeam1 === sourcePattern;
            const connectsToTeam2 = nextMatchData.sourceTeam2 === sourcePattern;
            
            // Si no hay conexión (el match siguiente tiene bye o viene de otro lado), no dibujar línea
            if (!connectsToTeam1 && !connectsToTeam2) return null;
            
            // Determinar posición de conexión
            const isTopConnection = connectsToTeam1;
            
            // Punto de salida del match actual (centro)
            const startY = y;
            
            // Punto de llegada al match siguiente (arriba o abajo)
            const endY = isTopConnection 
              ? nextMatch.y - MATCH_HEIGHT / 2
              : nextMatch.y + MATCH_HEIGHT / 2;
            
            // Punto común donde se unen las líneas verticales (mismo X para matches que van al mismo match siguiente)
            const connectionX = nextMatch.x - 20;
            
            // Punto horizontal desde el match actual (mitad del camino hacia connectionX)
            const midX = x + MATCH_WIDTH + (connectionX - (x + MATCH_WIDTH)) / 2;
            
            return (
              <g key={`line-${matchData.match.id}`}>
                {/* Horizontal line from current match */}
                <line
                  x1={x + MATCH_WIDTH}
                  y1={startY}
                  x2={midX}
                  y2={startY}
                  stroke="#8B4513"
                  strokeWidth="2"
                />
                {/* Vertical line to connection level */}
                <line
                  x1={midX}
                  y1={startY}
                  x2={midX}
                  y2={endY}
                  stroke="#8B4513"
                  strokeWidth="2"
                />
                {/* Horizontal line to common connection point */}
                <line
                  x1={midX}
                  y1={endY}
                  x2={connectionX}
                  y2={endY}
                  stroke="#8B4513"
                  strokeWidth="2"
                />
                {/* Vertical line into next match */}
                <line
                  x1={connectionX}
                  y1={endY}
                  x2={connectionX}
                  y2={nextMatch.y}
                  stroke="#8B4513"
                  strokeWidth="2"
                />
                {/* Final horizontal line into match */}
                <line
                  x1={connectionX}
                  y1={nextMatch.y}
                  x2={nextMatch.x}
                  y2={nextMatch.y}
                  stroke="#8B4513"
                  strokeWidth="2"
                />
              </g>
            );
          });
        })}

        {/* Match boxes */}
        {bracketData.map((roundData) =>
          roundData.matches.map((matchData) => {
            const { match, x, y } = matchData;
            const isWinner1 = match.winner?.id === match.team1?.id;
            const isWinner2 = match.winner?.id === match.team2?.id;
            
            return (
              <g key={match.id}>
                {/* Match box */}
                <rect
                  x={x}
                  y={y - MATCH_HEIGHT / 2}
                  width={MATCH_WIDTH}
                  height={MATCH_HEIGHT}
                  fill={match.round === "final" ? "#8B4513" : "#2D5016"}
                  rx="4"
                  className="cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => onMatchClick?.(match.id)}
                />
                
                {/* Team 1 */}
                <text
                  x={x + MATCH_WIDTH / 2}
                  y={y - 15}
                  textAnchor="middle"
                  fill="white"
                  fontSize="12"
                  fontWeight={isWinner1 ? "bold" : "normal"}
                  className="pointer-events-none"
                >
                  {match.team1?.name || "—"}
                </text>
                
                {/* Team 2 */}
                <text
                  x={x + MATCH_WIDTH / 2}
                  y={y + 5}
                  textAnchor="middle"
                  fill="white"
                  fontSize="12"
                  fontWeight={isWinner2 ? "bold" : "normal"}
                  className="pointer-events-none"
                >
                  {match.team2?.name || "—"}
                </text>
                
                {/* Scores */}
                {match.scores && (
                  <text
                    x={x + MATCH_WIDTH / 2}
                    y={y + 28}
                    textAnchor="middle"
                    fill="white"
                    fontSize="10"
                    className="pointer-events-none opacity-90"
                  >
                    {match.scores}
                  </text>
                )}
              </g>
            );
          })
        )}
        </g>
        </svg>
      </div>
    </div>
  );
}

