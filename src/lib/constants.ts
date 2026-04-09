// ============================================================
// CONSTANTES DE LA APLICACIÓN - Aldea Savia Padel
// Timezone: Quintana Roo = UTC-5 (sin horario de verano)
// ============================================================

// Horario de la cancha
export const COURT_OPEN_HOUR = 9;   // 9:00 AM
export const COURT_CLOSE_HOUR = 22; // 10:00 PM
export const SLOT_DURATION_MINUTES = 90;

// Límites por casa
export const MAX_SLOTS_PER_MONTH = 12;
export const MAX_PLAYERS_PER_RESERVATION = 4;

// Hora a partir de la cual se puede reservar el día siguiente
export const BOOKING_OPENS_HOUR = 9;

// Sin horarios protegidos
export const PROTECTED_SLOT_STARTS: string[] = [];

// Último horario disponible para iniciar (21:00)
const LAST_BOOKING_HOUR_MINUTES = 21 * 60;

// Quintana Roo es UTC-5 todo el año
const QR_OFFSET_HOURS = -5;
const QR_OFFSET_STRING = "-05:00";

// ============================================================
// CORE: Conversión robusta a Quintana Roo usando Intl API
// ============================================================

interface QRParts {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number; // 0-23
  minute: number;
  second: number;
}

function getQRParts(date: Date = new Date()): QRParts {
  // America/Cancun es UTC-5 fijo, igual que Quintana Roo
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Cancun",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const get = (type: string) =>
    parseInt(parts.find((p) => p.type === type)?.value || "0", 10);

  let hour = get("hour");
  if (hour === 24) hour = 0; // edge case

  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour,
    minute: get("minute"),
    second: get("second"),
  };
}

// Retorna un Date donde .getFullYear/.getMonth/.getDate/.getHours/.getMinutes
// devuelven valores de Quintana Roo. NO usar .getTime() para comparaciones
// absolutas de tiempo contra otros Date — usar parseQRDateTimeToUTC en su lugar.
export function getNowInQuintanaRoo(): Date {
  const p = getQRParts();
  return new Date(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
}

// Convierte una fecha "YYYY-MM-DD" y hora "HH:MM" (interpretadas como hora local
// de QR) a un Date con tiempo UTC real. Úsalo para comparaciones con new Date().
export function parseQRDateTimeToUTC(
  dateStr: string,
  timeStr: string
): Date {
  // Asegurar formato HH:MM:SS
  const time = timeStr.length === 5 ? `${timeStr}:00` : timeStr;
  // "2026-04-08T15:30:00-05:00" — interpretado como QR, devuelve UTC real
  return new Date(`${dateStr}T${time}${QR_OFFSET_STRING}`);
}

// Horarios de inicio (cada 30 min, 9:00 - 21:00)
export function getAvailableStartTimes(): string[] {
  const times: string[] = [];
  for (let hour = COURT_OPEN_HOUR; hour <= 21; hour++) {
    for (const minutes of [0, 30]) {
      const startMinutes = hour * 60 + minutes;
      if (startMinutes > LAST_BOOKING_HOUR_MINUTES) break;
      times.push(
        `${String(hour).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`
      );
    }
  }
  return times;
}

// Calcula hora de fin dada duración (default 90 min, máx hasta cierre 22:00)
export function getSlotEnd(
  startTime: string,
  durationMinutes: number = SLOT_DURATION_MINUTES
): string {
  const [hours, minutes] = startTime.split(":").map(Number);
  const startMinutes = hours * 60 + minutes;
  let endMinutes = startMinutes + durationMinutes;

  const closeMinutes = COURT_CLOSE_HOUR * 60;
  if (endMinutes > closeMinutes) endMinutes = closeMinutes;

  const endHours = Math.floor(endMinutes / 60);
  const endMins = endMinutes % 60;
  return `${String(endHours).padStart(2, "0")}:${String(endMins).padStart(2, "0")}`;
}

export function getSlotDuration(startTime: string): number {
  const end = getSlotEnd(startTime);
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const duration = eh * 60 + em - (sh * 60 + sm);
  return duration > 0 ? duration : 0;
}

// Formatea "09:00" → "9:00 AM"
export function formatTime(time: string): string {
  const [hours, minutes] = time.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const displayHour = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
  return `${displayHour}:${String(minutes).padStart(2, "0")} ${period}`;
}

// Verifica solapamiento entre intervalos
export function slotsOverlap(
  start1: string,
  end1: string,
  start2: string,
  end2: string
): boolean {
  return start1 < end2 && start2 < end1;
}

export function canBookNow(): boolean {
  return getQRParts().hour >= BOOKING_OPENS_HOUR;
}

// Fecha de hoy en QR (YYYY-MM-DD)
export function getTodayDate(): string {
  const p = getQRParts();
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

// Fecha de mañana en QR (YYYY-MM-DD)
export function getTomorrowDate(): string {
  const p = getQRParts();
  // Construir fecha UTC a medianoche de hoy-QR y sumar 1 día
  const today = new Date(Date.UTC(p.year, p.month - 1, p.day));
  today.setUTCDate(today.getUTCDate() + 1);
  const y = today.getUTCFullYear();
  const m = String(today.getUTCMonth() + 1).padStart(2, "0");
  const d = String(today.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// Hora actual en formato HH:MM en QR
export function getCurrentTimeQR(): string {
  const p = getQRParts();
  return `${String(p.hour).padStart(2, "0")}:${String(p.minute).padStart(2, "0")}`;
}

// Formatea fecha "2024-01-15" → "lunes 15 de enero"
export function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d, 12, 0, 0);
  return date.toLocaleDateString("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function getMonthName(month: number): string {
  const months = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
  ];
  return months[month - 1];
}
