/**
 * Utility functions for date and time formatting
 * All dates use dd/mm/yyyy format
 * All times use 24-hour format (HH:MM)
 */

/**
 * Formats a date string to dd/mm/yyyy format
 * @param dateStr - Date string in ISO format (YYYY-MM-DD) or Date object
 * @returns Formatted date string (dd/mm/yyyy) or "Sin fecha" if invalid
 */
export function formatDate(dateStr: string | null | Date | undefined): string {
  if (!dateStr) return "Sin fecha";
  
  let date: Date;
  if (typeof dateStr === "string") {
    // Handle ISO date strings (YYYY-MM-DD)
    if (dateStr.includes("T")) {
      date = new Date(dateStr);
    } else {
      // Date only string (YYYY-MM-DD)
      date = new Date(dateStr + "T00:00:00");
    }
  } else {
    date = dateStr;
  }

  if (isNaN(date.getTime())) {
    return "Sin fecha";
  }

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Formats a time string to HH:MM format (24-hour)
 * @param timeStr - Time string in format HH:MM:SS or HH:MM
 * @returns Formatted time string (HH:MM) or empty string if invalid
 */
export function formatTime(timeStr: string | null | undefined): string {
  if (!timeStr) return "";
  
  // Handle both HH:MM:SS and HH:MM formats
  const parts = timeStr.split(":");
  const hours = parts[0]?.padStart(2, "0") || "00";
  const minutes = parts[1]?.padStart(2, "0") || "00";
  
  return `${hours}:${minutes}`;
}

/**
 * Formats a datetime string to dd/mm/yyyy HH:MM format
 * Uses the browser's local timezone for display
 * @param datetimeStr - Datetime string in ISO format (UTC from DB)
 * @returns Formatted datetime string (dd/mm/yyyy HH:MM) or "Sin fecha" if invalid
 */
export function formatDateTime(datetimeStr: string | null | Date | undefined): string {
  if (!datetimeStr) return "Sin fecha";
  
  let date: Date;
  if (typeof datetimeStr === "string") {
    // Supabase devuelve timestamps en formato ISO pero puede que no tengan 'Z' al final
    // Si no tiene 'Z' y no tiene offset (+/-HH:MM), asumimos que es UTC
    let normalizedStr = datetimeStr.trim();
    
    // Si ya tiene 'Z' o un offset, usarlo directamente
    if (normalizedStr.endsWith('Z') || normalizedStr.match(/[+-]\d{2}:?\d{2}$/)) {
      date = new Date(normalizedStr);
    }
    // Si es un ISO string sin 'Z' ni offset (ej: "2025-12-25T14:30:00" o "2025-12-25T14:30:00.123456")
    // Supabase lo devuelve como UTC, así que agregamos 'Z' explícitamente
    else if (normalizedStr.includes('T')) {
      // Remover cualquier punto final (por si acaso) y agregar 'Z'
      normalizedStr = normalizedStr.replace(/\.$/, '') + 'Z';
      date = new Date(normalizedStr);
    }
    // Formato legacy o sin formato ISO - intentar parsear directamente
    else {
      date = new Date(normalizedStr);
    }
  } else {
    date = datetimeStr;
  }

  if (isNaN(date.getTime())) {
    return "Sin fecha";
  }

  // Use local timezone methods (getDate, getMonth, etc.) to display in browser's timezone
  // Estos métodos automáticamente convierten de UTC a la zona horaria local del navegador
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

/**
 * Converts a date string from dd/mm/yyyy to YYYY-MM-DD format (for HTML date inputs)
 * @param dateStr - Date string in dd/mm/yyyy format
 * @returns Date string in YYYY-MM-DD format or empty string if invalid
 */
export function dateToInputFormat(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  
  // If already in YYYY-MM-DD format, return as is
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }
  
  // Try to parse dd/mm/yyyy format
  const parts = dateStr.split("/");
  if (parts.length === 3) {
    const day = parts[0].padStart(2, "0");
    const month = parts[1].padStart(2, "0");
    const year = parts[2];
    return `${year}-${month}-${day}`;
  }
  
  return "";
}

/**
 * Converts a date from YYYY-MM-DD (HTML input format) to Date object
 * @param dateStr - Date string in YYYY-MM-DD format
 * @returns Date object or null if invalid
 */
export function inputFormatToDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  
  // Handle YYYY-MM-DD format
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const date = new Date(dateStr + "T00:00:00");
    if (!isNaN(date.getTime())) {
      return date;
    }
  }
  
  return null;
}

/**
 * Gets the day of the week in Spanish
 * @param dateStr - Date string in ISO format (YYYY-MM-DD) or Date object
 * @returns Day of the week in Spanish (e.g., "LUNES", "MARTES")
 */
export function getDayOfWeek(dateStr: string | Date): string {
  let date: Date;
  if (typeof dateStr === "string") {
    // Handle ISO date strings (YYYY-MM-DD)
    if (dateStr.includes("T")) {
      date = new Date(dateStr);
    } else {
      // Date only string (YYYY-MM-DD)
      date = new Date(dateStr + "T00:00:00");
    }
  } else {
    date = dateStr;
  }

  if (isNaN(date.getTime())) {
    return "";
  }

  const days = ["DOMINGO", "LUNES", "MARTES", "MIÉRCOLES", "JUEVES", "VIERNES", "SÁBADO"];
  return days[date.getDay()] || "";
}

