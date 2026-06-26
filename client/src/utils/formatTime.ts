export function formatMinutes(totalMinutes: number): string {
  if (totalMinutes <= 0) return '0 мин';
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h && m) return `${h} ч ${m} мин`;
  if (h) return `${h} ч`;
  return `${m} мин`;
}

export function formatSeconds(totalSeconds: number): string {
  const s = Math.max(0, totalSeconds);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

export const getGreeting = (): string => {
  const hrs = new Date().getHours();
  if (hrs >= 5 && hrs < 12) return "greeting.morning";
  if (hrs >= 12 && hrs < 17) return "greeting.afternoon";
  if (hrs >= 17 && hrs < 22) return "greeting.evening";
  return "greeting.night";
};