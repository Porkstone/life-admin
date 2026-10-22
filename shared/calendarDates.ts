export function isDateOnly(value: string): boolean {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value
  );
}

// Count completed calendar anniversaries, rather than dividing days by 365.
// A 29 February anniversary is reached on 1 March in non-leap years.
export function getWholeYearsSince(
  startDate?: string,
  today = new Date(),
): number | null {
  if (!startDate || !isDateOnly(startDate) || !Number.isFinite(today.getTime()))
    return null;
  const [year, month, day] = startDate.split("-").map(Number);
  const anniversaryPending =
    today.getMonth() + 1 < month ||
    (today.getMonth() + 1 === month && today.getDate() < day);
  return Math.max(0, today.getFullYear() - year - (anniversaryPending ? 1 : 0));
}
