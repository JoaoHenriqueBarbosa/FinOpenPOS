/**
 * Lógica para generar playoffs de torneos
 * 
 * Reglas:
 * - Zonas de 3: clasifican 2 (1° y 2°)
 * - Zonas de 4: clasifican 3 (1°, 2° y 3°)
 * - Ranking global fijo: 1A, 1B, 1C, 1D, 1E, 2E, 2D, 2C, 2B, 2A, 3A, 3B, ...
 * - Byes van a los mejores rankeados
 * - Cruces: mejor vs peor disponible
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
 * Distribuye equipos en posiciones de bracket usando seeding estándar.
 * Los mejores equipos se distribuyen para que no se enfrenten hasta las rondas finales.
 * 
 * Patrón de seeding estándar:
 * - El mejor (1) va a la posición 0 (parte superior)
 * - El segundo mejor (2) va a la última posición (parte inferior)
 * - El tercero (3) va a la mitad superior
 * - El cuarto (4) va a la mitad inferior
 * - Y así sucesivamente
 * 
 * @param teams Lista de equipos ordenados por calidad (mejor primero)
 * @param numPositions Número de posiciones en el bracket
 * @returns Array de equipos distribuidos en las posiciones del bracket (null para posiciones sin equipo)
 */
function seedTeams(teams: QualifiedTeam[], numPositions: number): (QualifiedTeam | null)[] {
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
    // Patrón estándar: [1, 8, 4, 5, 2, 7, 3, 6] para 8
    // [1, 4, 2, 3] para 4
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
    // Para cada nivel, el mejor va arriba, el peor va abajo, y se intercalan
    // Para seed 1 -> opuesto es 8, para seed 2 -> opuesto es 7, etc.
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
  const firstRoundMatches = Math.floor(teamsPlaying / 2);
  
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
  // Si hay byes, necesitamos crear matches para todas las posiciones del bracket
  // para mantener el orden correcto en la visualización
  if (teamsWithBye > 0 && teamsPlaying > 0) {
    // Distribuir todos los equipos (byes + jugadores) en las posiciones del bracket usando seeding
    const allTeamsForNextRound = [...rankedTeams];
    const nextRoundSeeded = seedTeams(allTeamsForNextRound, nextRoundSize);
    
    // Crear matches para TODAS las posiciones que alimentan la siguiente ronda
    // Si la siguiente ronda tiene 8 posiciones (cuartos), entonces la primera ronda debe tener 8 matches
    // (uno por cada posición de la siguiente ronda)
    // Algunos serán byes (solo team1_id o team2_id), otros serán matches reales
    const firstRoundMatchesCount = nextRoundSize; // Un match por cada posición de la siguiente ronda
    
    // Crear matches para todas las posiciones de la siguiente ronda
    // Cada posición de cuartos tiene su propio match en octavos
    // Algunos son byes (solo un equipo), otros son reales (dos equipos)
    
    // Primero, identificar qué posiciones tienen byes
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
    
    // Distribuir los equipos que juegan usando seeding para emparejarlos
    const playingSeeded = seedTeams(teamsPlayingInFirstRound, teamsPlaying);
    const realMatchesCount = Math.floor(teamsPlaying / 2);
    
    // Crear todos los matches: primero los byes, luego los reales
    // Ordenar por posición para mantener el orden del bracket
    const allMatchData: Array<{ bracketPos: number; team1_id: number | null; team2_id: number | null }> = [];
    
    // Agregar matches de bye
    for (const { position, team } of positionsWithByes) {
      allMatchData.push({
        bracketPos: position + 1,
        team1_id: team.team_id,
        team2_id: null,
      });
    }
    
    // Agregar matches reales: emparejar mejor vs peor, segundo mejor vs segundo peor, etc.
    for (let i = 0; i < realMatchesCount; i++) {
      const team1Index = i;
      const team2Index = teamsPlaying - 1 - i;
      const team1 = playingSeeded[team1Index];
      const team2 = playingSeeded[team2Index];
      
      // Asignar este match a la posición correspondiente que necesita ganador
      // Las posiciones que necesitan ganadores están en orden según el seeding
      const bracketPos = positionsNeedingWinners[i] + 1;
      
      allMatchData.push({
        bracketPos,
        team1_id: team1?.team_id || null,
        team2_id: team2?.team_id || null,
      });
    }
    
    // Ordenar por bracketPos y crear los matches
    allMatchData.sort((a, b) => a.bracketPos - b.bracketPos);
    
    for (const matchData of allMatchData) {
      allMatches.push({
        round: firstRoundName,
        bracket_pos: matchData.bracketPos,
        team1_id: matchData.team1_id,
        team2_id: matchData.team2_id,
        source_team1: null,
        source_team2: null,
      });
    }
  } else if (teamsPlaying > 0) {
    // No hay byes, solo equipos que juegan
    // Distribuir los equipos que juegan en las posiciones del bracket usando seeding
    const firstRoundSeeded = seedTeams(teamsPlayingInFirstRound, teamsPlaying);
    
    // Crear los matches: cada match empareja dos posiciones consecutivas del bracket
    for (let i = 0; i < firstRoundMatches; i++) {
      const pos1 = i * 2;
      const pos2 = i * 2 + 1;
      const team1 = firstRoundSeeded[pos1];
      const team2 = firstRoundSeeded[pos2];
      
      if (team1 && team2) {
        allMatches.push({
          round: firstRoundName,
          bracket_pos: i + 1,
          team1_id: team1.team_id,
          team2_id: team2.team_id,
          source_team1: null,
          source_team2: null,
        });
      }
    }
  }

  // SIGUIENTE RONDA (combina byes con ganadores si hay byes, o solo ganadores si no)
  if (teamsWithBye > 0) {
    // Hay byes: la siguiente ronda combina byes con ganadores
    const nextRoundMatches = Math.floor(nextRoundSize / 2);
    const nextRoundName = getRoundName(nextRoundSize);
    const prevRoundLabel = firstRoundName.charAt(0).toUpperCase() + firstRoundName.slice(1);

    // Distribuir los byes en las posiciones del bracket usando seeding
    // Esto asegura que 1A esté arriba y 1B esté abajo
    const nextRoundSeeded = seedTeams(teamsWithByeList, nextRoundSize);
    
    // Crear un mapa que asocia cada posición del bracket con:
    // - El equipo con bye (si tiene uno)
    // - El match de la primera ronda que alimenta esa posición (si no tiene bye)
    const positionToFirstRoundMatch = new Map<number, number>();
    let firstRoundMatchNum = 0;
    
    // Identificar qué posiciones necesitan ganadores de la primera ronda
    for (let i = 0; i < nextRoundSize; i++) {
      if (!nextRoundSeeded[i]) {
        // Esta posición no tiene bye, necesita un ganador de la primera ronda
        firstRoundMatchNum++;
        positionToFirstRoundMatch.set(i, firstRoundMatchNum);
      }
    }
    
    // Crear los matches de la siguiente ronda
    // Los matches se generan emparejando posiciones consecutivas: 0-1, 2-3, 4-5, etc.
    // Pero el orden de los matches en el bracket es: match 1 arriba, match último abajo
    for (let i = 0; i < nextRoundMatches; i++) {
      const matchNum = i + 1;
      const pos1 = i * 2;
      const pos2 = i * 2 + 1;
      
      const team1 = nextRoundSeeded[pos1];
      const team2 = nextRoundSeeded[pos2];
      
      let team1Id: number | null = null;
      let team2Id: number | null = null;
      let source1: string | null = null;
      let source2: string | null = null;
      
      if (team1) {
        // Es un bye
        team1Id = team1.team_id;
        source1 = null;
      } else {
        // Es un ganador de la primera ronda
        const firstRoundMatch = positionToFirstRoundMatch.get(pos1);
        if (firstRoundMatch) {
          source1 = `Ganador ${prevRoundLabel}${firstRoundMatch}`;
        }
      }
      
      if (team2) {
        // Es un bye
        team2Id = team2.team_id;
        source2 = null;
      } else {
        // Es un ganador de la primera ronda
        const firstRoundMatch = positionToFirstRoundMatch.get(pos2);
        if (firstRoundMatch) {
          source2 = `Ganador ${prevRoundLabel}${firstRoundMatch}`;
        }
      }

      allMatches.push({
        round: nextRoundName,
        bracket_pos: matchNum,
        team1_id: team1Id,
        team2_id: team2Id,
        source_team1: source1,
        source_team2: source2,
      });
    }

    // Generar rondas restantes (solo ganadores)
    let currentRoundSize = nextRoundMatches;
    let currentRoundName = nextRoundName;

    while (currentRoundSize > 1) {
      const nextRoundMatches = Math.floor(currentRoundSize / 2);
      const nextRoundName = getRoundName(currentRoundSize);
      const prevRoundLabel = currentRoundName.charAt(0).toUpperCase() + currentRoundName.slice(1);

      // En cada ronda, los matches se generan emparejando matches de la ronda anterior
      // Patrón estándar de brackets: match 1 (arriba) vs match último (abajo), match 2 vs penúltimo, etc.
      // Esto asegura que los mejores equipos no se enfrenten hasta las rondas finales
      for (let i = 0; i < nextRoundMatches; i++) {
        const matchNum = i + 1;
        // Match de la parte superior: i + 1
        // Match de la parte inferior: currentRoundSize - i (opuesto)
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
    // No hay byes: todas las rondas son solo ganadores
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

