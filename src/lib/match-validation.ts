/**
 * Validation functions for match set scores
 */

export type ValidationResult = {
  valid: boolean;
  error?: string;
};

/**
 * Validates a normal set score (sets 1, 2, and set 3 if not super tiebreak)
 * Rules:
 * - Must be won at 6 games (6-0, 6-1, 6-2, 6-3, 6-4)
 * - Can go to 7-5 (if leading 6-5, must win 7-5)
 * - Can go to 7-6 (tiebreak at 6-6)
 * - Cannot be 7-0, 7-1, 7-2, 7-3, 7-4 (must be 6-X or 7-5 or 7-6)
 * - Cannot be 8-6 or higher (must be 7-6 max)
 */
export function validateNormalSet(
  team1: number | null,
  team2: number | null
): ValidationResult {
  if (team1 === null || team2 === null) {
    return { valid: true }; // Empty sets are allowed (partial results)
  }

  if (team1 < 0 || team2 < 0) {
    return { valid: false, error: "Los games no pueden ser negativos" };
  }

  // Check if it's a valid winning score
  const winner = team1 > team2 ? team1 : team2;
  const loser = team1 > team2 ? team2 : team1;

  // Valid scores: 6-X (where X <= 4, diferencia de 2 o más), 7-5, or 7-6
  if (winner === 6 && loser <= 4) {
    return { valid: true };
  }

  // 6-5 no es válido, debe continuar hasta 7-5
  if (winner === 6 && loser === 5) {
    return {
      valid: false,
      error: `Puntuación inválida: ${team1}-${team2}. A 6-5 debe continuarse hasta ganar por diferencia de 2 (7-5)`,
    };
  }

  if (winner === 7 && loser === 5) {
    return { valid: true };
  }

  if (winner === 7 && loser === 6) {
    return { valid: true };
  }

  // Invalid scores
  if (winner === 7 && loser < 5) {
    return {
      valid: false,
      error: `Puntuación inválida: ${team1}-${team2}. Si se llega a 7, debe ser 7-5 o 7-6`,
    };
  }

  if (winner > 7) {
    return {
      valid: false,
      error: `Puntuación inválida: ${team1}-${team2}. El máximo es 7-6`,
    };
  }

  if (winner < 6) {
    return {
      valid: false,
      error: `Puntuación inválida: ${team1}-${team2}. El set debe ganarse con al menos 6 games`,
    };
  }

  // If winner is 6 but loser is also 6 or more, invalid
  if (winner === 6 && loser >= 6) {
    return {
      valid: false,
      error: `Puntuación inválida: ${team1}-${team2}. A 6-6 debe jugarse tiebreak (7-6)`,
    };
  }

  return {
    valid: false,
    error: `Puntuación inválida: ${team1}-${team2}`,
  };
}

/**
 * Validates a super tiebreak score (set 3 only, if has_super_tiebreak is true)
 * Rules:
 * - Played to 11 points (or difference of 2)
 * - Valid scores: 11-0, 11-1, 11-2, ..., 11-9, 11-10, 12-10, 13-11, etc.
 * - Must win by 2 points if it goes beyond 11
 * - Cannot be less than 11 for the winner (unless opponent has 0-10, then 11-10 is valid)
 */
export function validateSuperTiebreak(
  team1: number | null,
  team2: number | null
): ValidationResult {
  if (team1 === null || team2 === null) {
    return { valid: true }; // Empty sets are allowed (partial results)
  }

  if (team1 < 0 || team2 < 0) {
    return { valid: false, error: "Los puntos no pueden ser negativos" };
  }

  const winner = team1 > team2 ? team1 : team2;
  const loser = team1 > team2 ? team2 : team1;

  // If winner has 11 or more, check if it's valid
  if (winner >= 11) {
    // If winner is exactly 11, loser must be <= 9 (11-0 to 11-9, diferencia de 2 o más)
    if (winner === 11 && loser <= 9) {
      return { valid: true };
    }

    // If winner is 11 and loser is 10, invalid (debe continuar hasta diferencia de 2)
    if (winner === 11 && loser === 10) {
      return {
        valid: false,
        error: `Puntuación inválida: ${team1}-${team2}. A 11-10 debe continuarse hasta ganar por diferencia de 2 puntos (12-10, 13-11, etc.)`,
      };
    }

    // If winner is more than 11, must win by exactly 2
    if (winner > 11) {
      if (winner - loser === 2) {
        return { valid: true };
      }
      return {
        valid: false,
        error: `Puntuación inválida: ${team1}-${team2}. En super tiebreak, si se pasa de 11, debe ganarse por diferencia de exactamente 2 puntos`,
      };
    }

    // If winner is 11 and loser is 11 or more, invalid
    if (winner === 11 && loser >= 11) {
      return {
        valid: false,
        error: `Puntuación inválida: ${team1}-${team2}. A 11-11 debe continuarse hasta ganar por 2`,
      };
    }
  }

  // If winner is less than 11, invalid
  if (winner < 11) {
    return {
      valid: false,
      error: `Puntuación inválida: ${team1}-${team2}. El super tiebreak se gana con al menos 11 puntos`,
    };
  }

  return {
    valid: false,
    error: `Puntuación inválida: ${team1}-${team2}`,
  };
}

/**
 * Validates all sets of a match
 */
export function validateMatchSets(
  set1: { team1: number | null; team2: number | null },
  set2: { team1: number | null; team2: number | null },
  set3: { team1: number | null; team2: number | null },
  hasSuperTiebreak: boolean
): ValidationResult {
  // Los sets 1 y 2 siempre deben tener valores
  if (set1.team1 === null || set1.team2 === null) {
    return { valid: false, error: "El set 1 debe tener valores para ambos equipos" };
  }

  if (set2.team1 === null || set2.team2 === null) {
    return { valid: false, error: "El set 2 debe tener valores para ambos equipos" };
  }

  // Validate set 1
  const set1Validation = validateNormalSet(set1.team1, set1.team2);
  if (!set1Validation.valid) {
    return { valid: false, error: `Set 1: ${set1Validation.error}` };
  }

  // Validate set 2
  const set2Validation = validateNormalSet(set2.team1, set2.team2);
  if (!set2Validation.valid) {
    return { valid: false, error: `Set 2: ${set2Validation.error}` };
  }

  // Determinar quién ganó cada set
  let set1Winner: "team1" | "team2" | null = null;
  let set2Winner: "team1" | "team2" | null = null;

  if (set1.team1 > set1.team2) set1Winner = "team1";
  else if (set1.team2 > set1.team1) set1Winner = "team2";

  if (set2.team1 > set2.team2) set2Winner = "team1";
  else if (set2.team2 > set2.team1) set2Winner = "team2";

  // Validar que si un equipo ganó los 2 primeros sets, el 3er set no debe jugarse
  if (set1Winner && set2Winner && set1Winner === set2Winner) {
    // Un equipo ganó los 2 primeros sets - el 3er set debe estar vacío
    if (set3.team1 !== null || set3.team2 !== null) {
      return {
        valid: false,
        error: "El tercer set no debe jugarse si un equipo ya ganó los dos primeros sets",
      };
    }
  } else if (set1Winner && set2Winner && set1Winner !== set2Winner) {
    // Cada equipo ganó un set, el 3er set es obligatorio y debe tener valores
    if (set3.team1 === null || set3.team2 === null) {
      return {
        valid: false,
        error: "El tercer set es obligatorio cuando cada equipo ganó uno de los primeros dos sets",
      };
    }
  } else {
    // Si no hay ganador claro en los primeros 2 sets, el 3er set no debería tener valores aún
    // (esto puede pasar si los sets están empatados, pero eso ya se validó arriba)
  }

  // Validate set 3 (solo si tiene valores)
  if (set3.team1 !== null || set3.team2 !== null) {
    if (hasSuperTiebreak) {
      const isValidSuperGames =
        (set3.team1 === 7 && set3.team2 === 6) ||
        (set3.team2 === 7 && set3.team1 === 6);
      if (!isValidSuperGames) {
        return {
          valid: false,
          error: "Set 3 de super tie-break debe registrarse como 7-6 para el ganador",
        };
      }
    } else {
      const set3Validation = validateNormalSet(set3.team1, set3.team2);
      if (!set3Validation.valid) {
        return { valid: false, error: `Set 3: ${set3Validation.error}` };
      }
    }
  }

  // Check that there's a winner (one team must win 2 sets)
  const sets = [set1, set2, set3];
  let team1Sets = 0;
  let team2Sets = 0;

  sets.forEach((set) => {
    if (set.team1 !== null && set.team2 !== null) {
      if (set.team1 > set.team2) team1Sets++;
      else if (set.team2 > set.team1) team2Sets++;
    }
  });

  // If all sets are filled, there must be a winner
  const allSetsFilled =
    set1.team1 !== null &&
    set1.team2 !== null &&
    set2.team1 !== null &&
    set2.team2 !== null &&
    set3.team1 !== null &&
    set3.team2 !== null;

  if (allSetsFilled) {
    if (team1Sets === team2Sets) {
      return {
        valid: false,
        error: "Debe haber un ganador. Un equipo debe ganar 2 sets",
      };
    }
    if (team1Sets < 2 && team2Sets < 2) {
      return {
        valid: false,
        error: "Debe haber un ganador. Un equipo debe ganar 2 sets",
      };
    }
  }

  return { valid: true };
}

