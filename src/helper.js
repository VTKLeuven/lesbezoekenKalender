export function getWeekStartMonday(date) {
  const d = new Date(date);
  const day = d.getDay(); // 0 (Sun) → 6 (Sat)
  const diff = day === 0 ? -6 : 1 - day; // adjust so Monday is first
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}


export function fulfillsFilter(filter,meet) {
    if (filter.field === '') {
      return true
    }
    const field = filter.field
    const meetValue = meet[field]
    if (meetValue === '') {
      throw new Error('Meet does not have this field')
    }
    if (filter.value === meetValue) {
      return true
    }
    else {
      return false
    }
}