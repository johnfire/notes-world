/** Returns a short relative time string: "2d", "3w", "4mo", "1y" */
export function relativeAge(dateStr: string): string {
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000);
  if (days < 1)  return 'today';
  if (days < 7)  return `${days}d`;
  if (days < 30) return `${Math.floor(days / 7)}w`;
  if (days < 365) return `${Math.floor(days / 30)}mo`;
  return `${Math.floor(days / 365)}y`;
}

/** Returns a Tailwind color class based on days since last update */
export function stalenessColor(dateStr: string): string {
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000);
  if (days < 7)  return 'text-gray-600';
  if (days < 30) return 'text-amber-600';
  return 'text-red-500';
}
