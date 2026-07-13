// ─── Salary helpers ───────────────────────────────────────────────────────────
export function parseShiftHours(shift: string): number {
  // "08:00 – 20:00" → 12, "20:00 – 08:00" → 12
  const m = shift.match(/(\d{2}):(\d{2})\s*[–-]\s*(\d{2}):(\d{2})/);
  if (!m) return 0;
  const start = parseInt(m[1]) * 60 + parseInt(m[2]);
  let end = parseInt(m[3]) * 60 + parseInt(m[4]);
  if (end <= start) end += 24 * 60;
  return (end - start) / 60;
}

export function calcSalary(hourlyTotal: number, shiftHours: number, shiftsPerMonth: number) {
  const perShift = hourlyTotal * shiftHours;
  const perMonth = perShift * shiftsPerMonth;
  return { perShift, perMonth };
}
