// Deterministic corporate avatar colors from name
const avatarColors = [
  'bg-blue-600',
  'bg-indigo-600',
  'bg-teal-600',
  'bg-emerald-600',
  'bg-sky-600',
  'bg-slate-600',
];

export function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return avatarColors[Math.abs(hash) % avatarColors.length];
}

export const statusStyles = {
  active: 'bg-success/20 text-success border-success/30',
  inactive: 'bg-destructive/20 text-destructive border-destructive/30',
  on_leave: 'bg-warning/20 text-warning border-warning/30',
};

export const statusLabels = {
  active: 'Actif',
  inactive: 'Inactif',
  on_leave: 'En congé',
};

export const leaveStatusStyles: Record<string, string> = {
  approved: 'bg-success/20 text-success border-success/30',
  pending: 'bg-warning/20 text-warning border-warning/30',
  rejected: 'bg-destructive/20 text-destructive border-destructive/30',
};

export const leaveStatusLabels: Record<string, string> = {
  approved: 'Approuvé',
  pending: 'En attente',
  rejected: 'Refusé',
};

// new Date("YYYY-MM-DD") is parsed as UTC midnight, causing a -1 day shift in UTC-
// negative timezones. Passing year/month/day separately uses the local clock instead.
export function formatLocalDate(dateString: string): string {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('fr-FR');
}

export function getRiskLevel(score: number) {
  if (score < 30) return { label: 'Faible', color: 'text-success', bgColor: 'bg-success' };
  if (score < 60) return { label: 'Modéré', color: 'text-warning', bgColor: 'bg-warning' };
  return { label: 'Élevé', color: 'text-destructive', bgColor: 'bg-destructive' };
}
