# Restricciones del Algoritmo de Scheduling

El algoritmo de scheduling maneja las siguientes restricciones:

## 1. Restricciones de Disponibilidad de Slots

### 1.1. Slot ya usado
- **Descripción**: Un slot no puede ser asignado a más de un partido.
- **Validación**: `if (state.usedSlots.has(i)) continue;`
- **Tipo**: Hard constraint (obligatoria)

### 1.2. Slot físico ya usado
- **Descripción**: Un slot físico (mismo tiempo + misma cancha) no puede ser usado dos veces, incluso si aparece en diferentes días (por ejemplo, slots que terminan a las 00:00).
- **Validación**: `if (state.usedPhysicalSlots.has(physicalSlotKey)) continue;`
- **Tipo**: Hard constraint (obligatoria)
- **Nota**: Esto previene que se asignen dos partidos al mismo slot físico cuando un slot termina a medianoche y puede aparecer en múltiples días.

## 2. Restricciones de Horarios de Equipos

### 2.1. Restricciones horarias específicas de equipos
- **Descripción**: Los equipos pueden tener restricciones que marcan ciertos horarios disponibles como "no disponibles" para ese equipo.
- **Validación**: `if (slotViolatesRestriction(slot, restrictedScheduleIds, availableSchedules))`
- **Tipo**: Hard constraint (obligatoria)
- **Nota**: Solo se aplica si hay horarios disponibles configurados (`availableSchedules`) y el equipo tiene restricciones definidas.

## 3. Restricciones de Descanso Mínimo

### 3.1. No permitir partidos consecutivos del mismo equipo
- **Descripción**: Un equipo no puede jugar dos partidos consecutivos (sin descanso mínimo).
- **Validación**: `if (distance <= minSlotsBetweenMatches)`
- **Tipo**: Hard constraint (obligatoria)
- **Parámetro**: `minSlotsBetweenMatches = 1` (siempre mantener descanso mínimo)
- **Nota**: Se verifica que haya al menos 1 slot de diferencia entre partidos del mismo equipo en el mismo día.

## 4. Restricciones de Orden Deportivo (Grupos de 4 equipos)

### 4.1. Partido 3 (match_order === 3)
- **Descripción**: El partido 3 (entre ganadores del partido 1 y 2) debe jugarse después del partido 2, con al menos un slot de descanso.
- **Validación**: 
  - Si `relaxOrderRestrictions = false`: `valid = false` si `gapMinutes < minGapMinutes`
  - Si `relaxOrderRestrictions = true`: Se aplica penalización pero se permite
- **Tipo**: 
  - Hard constraint cuando `relaxOrderRestrictions = false`
  - Soft constraint (con penalización) cuando `relaxOrderRestrictions = true`
- **Gap mínimo**: `matchDurationMinutes` (duración de un partido)

### 4.2. Partido 4 (match_order === 4)
- **Descripción**: El partido 4 (entre perdedores del partido 1 y 2) debe jugarse después del partido 3, en el mismo día o después, y no puede empezar antes de que termine el partido 3.
- **Validaciones**:
  - Si está en el mismo día: `slotStartMinutes < match3EndMinutes` → rechazado (o penalizado)
  - Si está en un día anterior: `slot.date < match3Assignment.date` → rechazado (o penalizado)
  - Si el partido 3 no está asignado: rechazado (o penalizado)
- **Tipo**: 
  - Hard constraint cuando `relaxOrderRestrictions = false`
  - Soft constraint (con penalización) cuando `relaxOrderRestrictions = true`

## 5. Restricciones de Horarios Disponibles del Torneo

### 5.1. Slots deben coincidir con horarios disponibles
- **Descripción**: Los slots generados deben coincidir con los horarios disponibles configurados para el torneo.
- **Validación**: Se realiza durante la generación de slots (`generateTimeSlots`)
- **Tipo**: Hard constraint (obligatoria)
- **Nota**: Si no hay horarios disponibles configurados, se generan slots para todos los rangos de tiempo definidos.

## Resumen de Tipos de Restricciones

### Hard Constraints (Obligatorias - siempre se aplican)
1. Slot ya usado
2. Slot físico ya usado
3. Restricciones horarias específicas de equipos
4. No permitir partidos consecutivos del mismo equipo
5. Slots deben coincidir con horarios disponibles del torneo

### Soft Constraints (Con penalización - solo cuando `relaxOrderRestrictions = true`)
1. Orden deportivo para partido 3 (gap mínimo después del partido 2)
2. Orden deportivo para partido 4 (después del partido 3, mismo día o después)

### Parámetros Configurables
- `minSlotsBetweenMatches = 1`: Descanso mínimo entre partidos del mismo equipo (en slots)
- `matchDurationMinutes`: Duración de un partido (usado para calcular gaps)
- `relaxOrderRestrictions`: Si es `true`, permite violaciones del orden deportivo con penalización

