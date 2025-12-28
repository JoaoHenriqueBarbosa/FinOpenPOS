/**
 * Lógica para generar playoffs de torneos
 * 
 * Reglas:
 * - Zonas de 3: clasifican 2 (1° y 2°)
 * - Zonas de 4: clasifican 3 (1°, 2° y 3°)
 * - Ranking global fijo: 1A, 1B, 1C, 1D, 1E, 2E, 2D, 2C, 2B, 2A, 3A, 3B, ...
 * - Byes van a los mejores rankeados
 * - Cruces: mejor vs peor disponible (determinístico basado en seed)
 */

export type QualifiedTeam = {
  team_id: number;
  from_group_id: number;
  pos: number; // 1, 2, o 3
  group_order: number; // Orden de la zona (1=A, 2=B, etc.)
};

export type PlayoffMatch = {
  round: string;
  bracket_pos: number;
  team1_id: number | null;
  team2_id: number | null;
  source_team1: string | null;
  source_team2: string | null;
};

/**
 * Construye el ranking global de clasificados según las reglas del torneo.
 * 
 * Ranking fijo:
 * 1. 1A, 1B, 1C, 1D, 1E, ... (todos los 1ros en orden normal)
 * 2. 2E, 2D, 2C, 2B, 2A, ... (todos los 2dos en orden inverso)
 * 3. 3A, 3B, 3C, 3D, 3E, ... (todos los 3ros en orden normal)
 * 
 * @param qualifiedTeams Equipos clasificados con su posición y grupo
 * @returns Equipos ordenados según el ranking global
 */
export function buildGlobalRanking(qualifiedTeams: QualifiedTeam[]): QualifiedTeam[] {
  // Separar por posición
  const firsts = qualifiedTeams.filter(t => t.pos === 1);
  const seconds = qualifiedTeams.filter(t => t.pos === 2);
  const thirds = qualifiedTeams.filter(t => t.pos === 3);

  // Ordenar:
  // - 1ros: orden normal por group_order (A, B, C, ...)
  firsts.sort((a, b) => a.group_order - b.group_order);
  
  // - 2dos: orden inverso por group_order (E, D, C, B, A)
  seconds.sort((a, b) => b.group_order - a.group_order);
  
  // - 3ros: orden normal por group_order (A, B, C, ...)
  thirds.sort((a, b) => a.group_order - b.group_order);

  // Concatenar: 1ros, luego 2dos, luego 3ros
  return [...firsts, ...seconds, ...thirds];
}

/**
 * Calcula cuántos equipos deben jugar en la primera ronda y cuántos tienen bye.
 * 
 * Estrategia: queremos que la siguiente ronda tenga una potencia de 2.
 * - Si totalTeams es potencia de 2: todos juegan, siguiente ronda = totalTeams/2
 * - Si no: algunos tienen bye para que la siguiente ronda sea la potencia de 2 más cercana
 * 
 * @param totalTeams Total de equipos clasificados
 * @returns Información sobre la primera ronda
 */
export function calculateFirstRound(totalTeams: number): {
  firstRoundName: string;
  teamsPlaying: number;
  teamsWithBye: number;
  nextRoundSize: number;
} {
  if (totalTeams <= 2) {
    return { 
      firstRoundName: "final", 
      teamsPlaying: totalTeams, 
      teamsWithBye: 0, 
      nextRoundSize: 2 
    };
  }

  // Encontrar la potencia de 2 más cercana que sea >= totalTeams/2
  // Esta será el tamaño objetivo de la siguiente ronda
  // Ejemplo: con 10 equipos, queremos que la siguiente ronda tenga 8 (cuartos)
  const targetNextRound = Math.ceil(totalTeams / 2);
  let nextRoundSize = 1;
  while (nextRoundSize < targetNextRound) {
    nextRoundSize *= 2;
  }
  // Si targetNextRound es potencia de 2, nextRoundSize ya es correcto
  // Si no, nextRoundSize es la potencia de 2 más cercana por encima

  // Calcular cuántos equipos deben jugar para que la siguiente ronda tenga nextRoundSize equipos
  // Queremos: teamsPlaying/2 + teamsWithBye = nextRoundSize
  // Donde: teamsWithBye = totalTeams - teamsPlaying
  // Resolviendo: teamsPlaying = 2 * (totalTeams - nextRoundSize)
  let teamsPlaying = 2 * (totalTeams - nextRoundSize);
  let teamsWithBye = totalTeams - teamsPlaying;

  // Validar que teamsPlaying sea par y positivo
  if (teamsPlaying <= 0 || teamsPlaying % 2 !== 0) {
    // Si la fórmula no funciona, ajustar
    // Esto puede pasar si nextRoundSize es muy grande
    // En ese caso, hacer que todos jueguen
    teamsPlaying = totalTeams % 2 === 0 ? totalTeams : totalTeams - 1;
    teamsWithBye = totalTeams - teamsPlaying;
    const calculatedNextRoundSize = Math.floor(teamsPlaying / 2);
    
    // Asegurar que nextRoundSize sea una potencia de 2
    // Encontrar la potencia de 2 más cercana (redondear hacia arriba)
    let adjustedNextRoundSize = 1;
    while (adjustedNextRoundSize < calculatedNextRoundSize) {
      adjustedNextRoundSize *= 2;
    }
    nextRoundSize = adjustedNextRoundSize;
  }

  // Determinar el nombre de la primera ronda basado en cuántos equipos hay en la siguiente ronda
  // El nombre de la ronda indica cuántos equipos participan en esa ronda
  // Si hay partidos, la siguiente ronda tiene: teamsPlaying/2 + teamsWithBye = nextRoundSize
  // Si no hay partidos, todos van directo a la siguiente ronda
  let firstRoundName = "cuartos";
  if (teamsPlaying > 0) {
    // Hay partidos: el nombre se basa en cuántos equipos hay en la siguiente ronda
    // nextRoundSize es el número de equipos que habrá en la siguiente ronda
    if (nextRoundSize >= 16) firstRoundName = "16avos";
    else if (nextRoundSize >= 8) firstRoundName = "octavos";
    else if (nextRoundSize >= 4) firstRoundName = "cuartos";
    else if (nextRoundSize >= 2) firstRoundName = "semifinal";
    else firstRoundName = "final";
  } else {
    // Todos tienen bye, el nombre depende de nextRoundSize
    if (nextRoundSize >= 16) firstRoundName = "16avos";
    else if (nextRoundSize >= 8) firstRoundName = "octavos";
    else if (nextRoundSize >= 4) firstRoundName = "cuartos";
    else if (nextRoundSize >= 2) firstRoundName = "semifinal";
    else firstRoundName = "final";
  }

  return { firstRoundName, teamsPlaying, teamsWithBye, nextRoundSize };
}

/**
 * Distribuye equipos con byes en posiciones del bracket usando seeding estándar.
 * Esto asegura que los mejores seeds estén en posiciones opuestas del bracket.
 * 
 * @param teams Lista de equipos ordenados por calidad (mejor primero)
 * @param numPositions Número de posiciones en el bracket
 * @returns Array de equipos distribuidos en las posiciones del bracket (null para posiciones sin equipo)
 */
function seedByeTeams(teams: QualifiedTeam[], numPositions: number): (QualifiedTeam | null)[] {
  const seeded: (QualifiedTeam | null)[] = new Array(numPositions).fill(null);
  
  if (teams.length === 0) return seeded;
  
  // Algoritmo de seeding estándar para brackets de eliminación
  // Patrón estándar: [1, 8, 4, 5, 2, 7, 3, 6] para 8 posiciones
  // Esto asegura que los mejores no se enfrenten hasta las rondas finales
  
  function getStandardSeedOrder(size: number): number[] {
    // Validar entrada
    if (!Number.isInteger(size) || size < 1) {
      return Array.from({ length: Math.max(1, Math.floor(size)) }, (_, i) => i + 1);
    }
    
    // Casos base
    if (size === 1) return [1];
    if (size === 2) return [1, 2];
    
    // Validar que size sea una potencia de 2
    if (size % 2 !== 0 || size < 2) {
      // Si no es potencia de 2, usar un orden secuencial simple
      return Array.from({ length: size }, (_, i) => i + 1);
    }
    
    // Para tamaños mayores, construir recursivamente usando el patrón estándar
    const half = size / 2;
    
    // Validar que half sea un entero y una potencia de 2
    if (!Number.isInteger(half) || half < 1) {
      return Array.from({ length: size }, (_, i) => i + 1);
    }
    
    // Protección contra recursión infinita: limitar profundidad
    if (size > 1024) {
      return Array.from({ length: size }, (_, i) => i + 1);
    }
    
    const firstHalf = getStandardSeedOrder(half);
    
    // Validar que firstHalf tenga el tamaño correcto
    if (firstHalf.length !== half) {
      return Array.from({ length: size }, (_, i) => i + 1);
    }
    
    const result: number[] = [];
    // Algoritmo correcto: usar el patrón estándar de brackets
    for (let i = 0; i < half; i++) {
      result.push(firstHalf[i]);
      result.push(size - firstHalf[i] + 1);
    }
    return result;
  }
  
  // Obtener el orden estándar de seeds
  const seedOrder = getStandardSeedOrder(numPositions);
  
  // Mapear los equipos a las posiciones según el orden de seeds
  // Los equipos están ordenados por calidad (índice 0 = mejor, índice 1 = segundo mejor, etc.)
  for (let i = 0; i < numPositions; i++) {
    const seed = seedOrder[i]; // seed es 1-based (1, 2, 3, ...)
    const teamIndex = seed - 1; // Convertir a índice 0-based
    if (teamIndex < teams.length) {
      seeded[i] = teams[teamIndex];
    }
  }
  
  return seeded;
}

/**
 * Genera los cruces de la primera ronda emparejando mejor seed vs peor seed disponible.
 * 
 * @param teamsPlaying Lista de equipos que juegan (ordenados por seed, mejor primero)
 * @returns Array de matches con los cruces
 */
function generateFirstRoundMatches(
  teamsPlaying: QualifiedTeam[],
  roundName: string
): PlayoffMatch[] {
  const matches: PlayoffMatch[] = [];
  const numMatches = Math.floor(teamsPlaying.length / 2);
  
  // Emparejar: mejor vs peor, segundo mejor vs segundo peor, etc.
  for (let i = 0; i < numMatches; i++) {
    const team1Index = i; // Mejor seed disponible
    const team2Index = teamsPlaying.length - 1 - i; // Peor seed disponible
    
    matches.push({
      round: roundName,
      bracket_pos: i + 1,
      team1_id: teamsPlaying[team1Index].team_id,
      team2_id: teamsPlaying[team2Index].team_id,
      source_team1: null,
      source_team2: null,
    });
  }
  
  return matches;
}

/**
 * Calcula la "fuerza del ganador esperado" de un match basándose en los seeds de los equipos.
 * Usa el mejor seed (más fuerte) de los dos equipos, ya que ese será el ganador esperado.
 * 
 * @param match Match de la primera ronda
 * @param rankedTeams Lista completa de equipos ordenados por seed (mejor primero)
 * @returns Un número que representa la fuerza (menor = mejor seed = más fuerte)
 */
function calculateMatchStrength(
  match: PlayoffMatch,
  rankedTeams: QualifiedTeam[]
): number {
  if (!match.team1_id || !match.team2_id) {
    return Infinity; // Matches de bye no se consideran
  }
  
  // Encontrar los índices (seeds) de los equipos en el ranking global
  const team1Index = rankedTeams.findIndex(t => t.team_id === match.team1_id);
  const team2Index = rankedTeams.findIndex(t => t.team_id === match.team2_id);
  
  // Si no encontramos los equipos, retornar un valor alto (débil)
  if (team1Index === -1 || team2Index === -1) {
    return Infinity;
  }
  
  // La "fuerza del ganador esperado" se basa en el MEJOR seed del match
  // Un match con un mejor seed produce un ganador más fuerte
  // Usamos el mínimo de los dos seeds (menor índice = mejor seed = más fuerte)
  return Math.min(team1Index, team2Index);
}

/**
 * Asigna cada seed fuerte al ganador del cruce más débil posible en la siguiente ronda.
 * 
 * @param teamsWithBye Equipos con bye (ordenados por seed, mejor primero)
 * @param firstRoundMatches Matches de la primera ronda (solo matches reales, con ambos equipos)
 * @param rankedTeams Lista completa de equipos ordenados por seed (para calcular fuerza)
 * @param roundName Nombre de la ronda
 * @param nextRoundSize Tamaño de la siguiente ronda
 * @returns Array de matches de la siguiente ronda
 */
function generateNextRoundWithByes(
  teamsWithBye: QualifiedTeam[],
  firstRoundMatches: PlayoffMatch[],
  rankedTeams: QualifiedTeam[],
  roundName: string,
  nextRoundSize: number
): PlayoffMatch[] {
  const matches: PlayoffMatch[] = [];
  const numMatches = Math.floor(nextRoundSize / 2);
  
  // Distribuir los byes en posiciones del bracket usando seeding estándar
  // Esto asegura que los mejores seeds estén en posiciones opuestas
  const seededByes = seedByeTeams(teamsWithBye, nextRoundSize);
  
  // Ordenar los matches de la primera ronda por "fuerza del ganador esperado"
  // El match con el mejor seed más débil produce el ganador más débil
  // Ordenamos de más débil a más fuerte (menor fuerza = más débil)
  const sortedMatches = [...firstRoundMatches].sort((a, b) => {
    const strengthA = calculateMatchStrength(a, rankedTeams);
    const strengthB = calculateMatchStrength(b, rankedTeams);
    return strengthA - strengthB; // Menor fuerza primero (más débil primero)
  });
  
  // Identificar qué posiciones tienen bye y cuáles necesitan ganadores
  const positionsNeedingWinners: number[] = [];
  const positionToByeSeed = new Map<number, number>();
  
  for (let i = 0; i < nextRoundSize; i++) {
    if (!seededByes[i]) {
      positionsNeedingWinners.push(i);
    } else {
      // Guardar el seed del bye en esta posición
      const byeTeam = seededByes[i]!;
      const byeSeed = rankedTeams.findIndex(t => t.team_id === byeTeam.team_id);
      positionToByeSeed.set(i, byeSeed);
    }
  }
  
  // Crear un mapa de posición a "seed del oponente" (el bye en la posición opuesta del par)
  // Las posiciones se emparejan: 0-1, 2-3, 4-5, etc.
  // En cada par, necesitamos saber el seed del bye para asignar el match más débil al mejor seed
  const positionToOpponentSeed = new Map<number, number>();
  for (let i = 0; i < nextRoundSize; i++) {
    if (!seededByes[i]) {
      // Esta posición necesita un ganador, encontrar el seed de su oponente (bye)
      const pairIndex = Math.floor(i / 2);
      const isFirstInPair = i % 2 === 0;
      const opponentPos = isFirstInPair ? i + 1 : i - 1;
      
      if (seededByes[opponentPos]) {
        // El oponente es un bye, encontrar su seed global
        const opponentSeed = positionToByeSeed.get(opponentPos);
        if (opponentSeed !== undefined) {
          positionToOpponentSeed.set(i, opponentSeed);
        }
      }
    }
  }
  
  // Ordenar las posiciones que necesitan ganadores por el seed de su oponente (mejor oponente primero)
  // Esto asegura que los matches más débiles se asignen a las posiciones con mejores oponentes
  positionsNeedingWinners.sort((a, b) => {
    const seedA = positionToOpponentSeed.get(a) ?? Infinity;
    const seedB = positionToOpponentSeed.get(b) ?? Infinity;
    return seedA - seedB; // Menor seed (mejor) primero
  });
  
  // Crear un mapa de posición del bracket a match de primera ronda
  // Asignamos los matches más débiles a las posiciones con mejores oponentes
  // Pero en orden inverso: el match más débil va a la posición con el mejor oponente
  const positionToMatch: Map<number, number> = new Map();
  for (let i = 0; i < positionsNeedingWinners.length; i++) {
    const position = positionsNeedingWinners[i];
    // Asignar en orden inverso: el match más débil (índice 0) va a la posición con el mejor oponente (última en la lista ordenada)
    const matchIndex = positionsNeedingWinners.length - 1 - i;
    if (matchIndex < sortedMatches.length) {
      positionToMatch.set(position, sortedMatches[matchIndex].bracket_pos);
    }
  }
  
  // Generar los matches de la siguiente ronda
  // Emparejamos posiciones consecutivas: 0-1, 2-3, 4-5, etc.
  const prevRoundLabel = firstRoundMatches[0]?.round.charAt(0).toUpperCase() + 
                         firstRoundMatches[0]?.round.slice(1) || "";
  
  for (let i = 0; i < numMatches; i++) {
    const matchNum = i + 1;
    const pos1 = i * 2;
    const pos2 = i * 2 + 1;
    
    const bye1 = seededByes[pos1];
    const bye2 = seededByes[pos2];
    
    let team1Id: number | null = null;
    let team2Id: number | null = null;
    let source1: string | null = null;
    let source2: string | null = null;
    
    if (bye1) {
      team1Id = bye1.team_id;
    } else {
      const matchNum1 = positionToMatch.get(pos1);
      if (matchNum1) {
        source1 = `Ganador ${prevRoundLabel}${matchNum1}`;
      }
    }
    
    if (bye2) {
      team2Id = bye2.team_id;
    } else {
      const matchNum2 = positionToMatch.get(pos2);
      if (matchNum2) {
        source2 = `Ganador ${prevRoundLabel}${matchNum2}`;
      }
    }
    
    matches.push({
      round: roundName,
      bracket_pos: matchNum,
      team1_id: team1Id,
      team2_id: team2Id,
      source_team1: source1,
      source_team2: source2,
    });
  }
  
  return matches;
}

/**
 * Genera todos los matches de playoffs según las reglas del torneo.
 * 
 * @param rankedTeams Equipos ordenados según el ranking global
 * @returns Array de matches de todas las rondas
 */
export function generatePlayoffBracket(rankedTeams: QualifiedTeam[]): PlayoffMatch[] {
  const n = rankedTeams.length;
  
  if (n < 2) {
    throw new Error("Se necesitan al menos 2 equipos para generar playoffs");
  }

  const { firstRoundName, teamsPlaying, teamsWithBye, nextRoundSize } = calculateFirstRound(n);
  const allMatches: PlayoffMatch[] = [];

  // Separar equipos: los mejores tienen bye, los restantes juegan
  const teamsWithByeList = rankedTeams.slice(0, teamsWithBye);
  const teamsPlayingInFirstRound = rankedTeams.slice(teamsWithBye);

  // Helper para obtener el nombre de la ronda
  const getRoundName = (size: number): string => {
    if (size === 2) return "final";
    if (size === 4) return "semifinal";
    if (size === 8) return "cuartos";
    if (size === 16) return "octavos";
    return "16avos";
  };

  // PRIMERA RONDA
  if (teamsWithBye > 0 && teamsPlaying > 0) {
    // Hay byes Y matches reales: necesitamos crear matches para TODAS las posiciones
    // que alimentan la siguiente ronda para mantener el orden correcto
    
    // Generar los cruces reales: mejor seed vs peor seed disponible
    const realMatchesCount = Math.floor(teamsPlaying / 2);
    const realMatches: Array<{ team1: QualifiedTeam; team2: QualifiedTeam; strength: number }> = [];
    
    for (let i = 0; i < realMatchesCount; i++) {
      const team1Index = i; // Mejor seed disponible
      const team2Index = teamsPlayingInFirstRound.length - 1 - i; // Peor seed disponible
      const team1 = teamsPlayingInFirstRound[team1Index];
      const team2 = teamsPlayingInFirstRound[team2Index];
      
      // Calcular la fuerza del ganador esperado (usando el índice en rankedTeams)
      const team1GlobalIndex = rankedTeams.findIndex(t => t.team_id === team1.team_id);
      const team2GlobalIndex = rankedTeams.findIndex(t => t.team_id === team2.team_id);
      // La fuerza es el MEJOR seed del match (menor índice = más fuerte)
      const strength = Math.min(team1GlobalIndex, team2GlobalIndex);
      
      realMatches.push({
        team1,
        team2,
        strength,
      });
    }
    
    // Ordenar los matches reales por fuerza (más débil primero)
    realMatches.sort((a, b) => a.strength - b.strength);
    
    // Distribuir todos los equipos (byes + jugadores) en las posiciones del bracket usando seeding
    const allTeamsForNextRound = [...rankedTeams];
    const nextRoundSeeded = seedByeTeams(allTeamsForNextRound, nextRoundSize);
    
    // Identificar qué posiciones tienen byes y cuáles necesitan ganadores
    const positionsWithByes: Array<{ position: number; team: QualifiedTeam }> = [];
    const positionsNeedingWinners: number[] = [];
    
    for (let i = 0; i < nextRoundSize; i++) {
      const team = nextRoundSeeded[i];
      const teamIsBye = team ? teamsWithByeList.some(t => t.team_id === team.team_id) : false;
      
      if (teamIsBye) {
        positionsWithByes.push({ position: i, team: team! });
      } else {
        positionsNeedingWinners.push(i);
      }
    }
    
    // Crear un mapa de posición a seed del bye oponente
    const positionToOpponentSeed = new Map<number, number>();
    for (let i = 0; i < nextRoundSize; i++) {
      if (!nextRoundSeeded[i] || !teamsWithByeList.some(t => t.team_id === nextRoundSeeded[i]!.team_id)) {
        // Esta posición necesita un ganador
        const pairIndex = Math.floor(i / 2);
        const isFirstInPair = i % 2 === 0;
        const opponentPos = isFirstInPair ? i + 1 : i - 1;
        
        if (nextRoundSeeded[opponentPos] && teamsWithByeList.some(t => t.team_id === nextRoundSeeded[opponentPos]!.team_id)) {
          const opponentTeam = nextRoundSeeded[opponentPos]!;
          const opponentSeed = rankedTeams.findIndex(t => t.team_id === opponentTeam.team_id);
          positionToOpponentSeed.set(i, opponentSeed);
        }
      }
    }
    
    // Ordenar las posiciones que necesitan ganadores por el seed de su oponente (mejor oponente primero)
    positionsNeedingWinners.sort((a, b) => {
      const seedA = positionToOpponentSeed.get(a) ?? Infinity;
      const seedB = positionToOpponentSeed.get(b) ?? Infinity;
      return seedA - seedB; // Menor seed (mejor) primero
    });
    
    // Crear todos los matches: byes y reales, ordenados por posición del bracket
    const allMatchData: Array<{ bracketPos: number; team1_id: number | null; team2_id: number | null }> = [];
    
    // Agregar matches de bye
    for (const { position, team } of positionsWithByes) {
      allMatchData.push({
        bracketPos: position + 1, // bracket_pos es 1-based
        team1_id: team.team_id,
        team2_id: null,
      });
    }
    
    // Agregar matches reales: asignar en orden inverso
    // El match más débil (índice 0) va a la posición con el mejor oponente (última en la lista ordenada)
    // Esto asegura que en cuartos sea: 1 vs 8, 2 vs 7, 3 vs 6, 4 vs 5
    for (let i = 0; i < realMatchesCount; i++) {
      const match = realMatches[i]; // Match ordenado por fuerza (más débil primero)
      // Asignar en orden inverso: el más débil va a la última posición que necesita ganador
      const positionIndex = positionsNeedingWinners.length - 1 - i;
      const bracketPos = positionsNeedingWinners[positionIndex] + 1; // bracket_pos es 1-based
      
      allMatchData.push({
        bracketPos,
        team1_id: match.team1.team_id,
        team2_id: match.team2.team_id,
      });
    }
    
    // Ordenar por bracketPos y crear los matches
    allMatchData.sort((a, b) => a.bracketPos - b.bracketPos);
    
    const firstRoundMatches: PlayoffMatch[] = [];
    for (const matchData of allMatchData) {
      firstRoundMatches.push({
        round: firstRoundName,
        bracket_pos: matchData.bracketPos,
        team1_id: matchData.team1_id,
        team2_id: matchData.team2_id,
        source_team1: null,
        source_team2: null,
      });
    }
    allMatches.push(...firstRoundMatches);
    
    // Generar la siguiente ronda que combina byes con ganadores
    const nextRoundName = getRoundName(nextRoundSize);
    const realMatchesOnly = firstRoundMatches.filter(m => m.team1_id && m.team2_id);
    const nextRoundMatches = generateNextRoundWithByes(
      teamsWithByeList,
      realMatchesOnly,
      rankedTeams, // Pasar el ranking completo para calcular fuerza
      nextRoundName,
      nextRoundSize
    );
    allMatches.push(...nextRoundMatches);
    
    // Generar rondas restantes (solo ganadores)
    let currentRoundSize = Math.floor(nextRoundSize / 2);
    let currentRoundName = nextRoundName;
    
    while (currentRoundSize > 1) {
      const nextRoundMatches = Math.floor(currentRoundSize / 2);
      const nextRoundName = getRoundName(currentRoundSize);
      const prevRoundLabel = currentRoundName.charAt(0).toUpperCase() + currentRoundName.slice(1);
      
      // En cada ronda, los matches se generan emparejando matches de la ronda anterior
      // Patrón estándar de brackets: match 1 (arriba) vs match último (abajo), match 2 vs penúltimo, etc.
      for (let i = 0; i < nextRoundMatches; i++) {
        const matchNum = i + 1;
        const prevMatch1 = i + 1;
        const prevMatch2 = currentRoundSize - i;
        
        allMatches.push({
          round: nextRoundName,
          bracket_pos: matchNum,
          team1_id: null,
          team2_id: null,
          source_team1: `Ganador ${prevRoundLabel}${prevMatch1}`,
          source_team2: `Ganador ${prevRoundLabel}${prevMatch2}`,
        });
      }
      
      currentRoundSize = nextRoundMatches;
      currentRoundName = nextRoundName;
    }
  } else if (teamsPlaying > 0) {
    // No hay byes, solo equipos que juegan
    // Generar cruces: mejor seed vs peor seed disponible
    const firstRoundMatches = generateFirstRoundMatches(teamsPlayingInFirstRound, firstRoundName);
    allMatches.push(...firstRoundMatches);
    
    // Generar rondas restantes (solo ganadores)
    let currentRoundSize = Math.floor(teamsPlaying / 2);
    let currentRoundName = firstRoundName;
    
    while (currentRoundSize > 1) {
      const nextRoundMatches = Math.floor(currentRoundSize / 2);
      const nextRoundName = getRoundName(currentRoundSize);
      const prevRoundLabel = currentRoundName.charAt(0).toUpperCase() + currentRoundName.slice(1);
      
      // Mismo patrón: match 1 vs match último, match 2 vs match penúltimo, etc.
      for (let i = 0; i < nextRoundMatches; i++) {
        const matchNum = i + 1;
        const prevMatch1 = i + 1;
        const prevMatch2 = currentRoundSize - i;
        
        allMatches.push({
          round: nextRoundName,
          bracket_pos: matchNum,
          team1_id: null,
          team2_id: null,
          source_team1: `Ganador ${prevRoundLabel}${prevMatch1}`,
          source_team2: `Ganador ${prevRoundLabel}${prevMatch2}`,
        });
      }
      
      currentRoundSize = nextRoundMatches;
      currentRoundName = nextRoundName;
    }
  } else {
    // Todos tienen bye: ir directo a la siguiente ronda
    // Esto es un caso raro, pero lo manejamos
    const nextRoundName = getRoundName(nextRoundSize);
    const seededByes = seedByeTeams(teamsWithByeList, nextRoundSize);
    const numMatches = Math.floor(nextRoundSize / 2);
    
    for (let i = 0; i < numMatches; i++) {
      const matchNum = i + 1;
      const pos1 = i * 2;
      const pos2 = i * 2 + 1;
      const team1 = seededByes[pos1];
      const team2 = seededByes[pos2];
      
      allMatches.push({
        round: nextRoundName,
        bracket_pos: matchNum,
        team1_id: team1?.team_id || null,
        team2_id: team2?.team_id || null,
        source_team1: null,
        source_team2: null,
      });
    }
    
    // Generar rondas restantes
    let currentRoundSize = numMatches;
    let currentRoundName = nextRoundName;
    
    while (currentRoundSize > 1) {
      const nextRoundMatches = Math.floor(currentRoundSize / 2);
      const nextRoundName = getRoundName(currentRoundSize);
      const prevRoundLabel = currentRoundName.charAt(0).toUpperCase() + currentRoundName.slice(1);
      
      for (let i = 0; i < nextRoundMatches; i++) {
        const matchNum = i + 1;
        const prevMatch1 = i + 1;
        const prevMatch2 = currentRoundSize - i;
        
        allMatches.push({
          round: nextRoundName,
          bracket_pos: matchNum,
          team1_id: null,
          team2_id: null,
          source_team1: `Ganador ${prevRoundLabel}${prevMatch1}`,
          source_team2: `Ganador ${prevRoundLabel}${prevMatch2}`,
        });
      }
      
      currentRoundSize = nextRoundMatches;
      currentRoundName = nextRoundName;
    }
  }

  return allMatches;
}

/**
 * Función principal que genera el bracket completo de playoffs.
 * 
 * @param qualifiedTeams Equipos clasificados con su posición y grupo
 * @param groupOrderMap Mapa de group_id -> group_order
 * @returns Array de matches de todas las rondas
 */
export function generatePlayoffs(
  qualifiedTeams: Array<{ team_id: number; from_group_id: number; pos: number }>,
  groupOrderMap: Map<number, number>
): PlayoffMatch[] {
  // Agregar group_order a cada equipo
  const teamsWithOrder: QualifiedTeam[] = qualifiedTeams.map(t => ({
    ...t,
    group_order: groupOrderMap.get(t.from_group_id) ?? 999,
  }));

  // Construir ranking global
  const rankedTeams = buildGlobalRanking(teamsWithOrder);

  // Generar bracket
  return generatePlayoffBracket(rankedTeams);
}

