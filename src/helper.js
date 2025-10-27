export function getWeekStartMonday(date) {
  const d = new Date(date);
  const day = d.getDay(); // 0 (Sun) → 6 (Sat)
  const diff = day === 0 ? -6 : 1 - day; // adjust so Monday is first
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}
