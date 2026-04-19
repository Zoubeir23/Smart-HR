import { motion } from 'framer-motion';
import { MoreVertical, Mail, Building2, AlertTriangle, ShieldAlert, TrendingDown } from 'lucide-react';
import { Employee } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface EmployeeCardProps {
  employee: Employee;
  onClick?: () => void;
}

const statusConfig = {
  active: {
    label: 'Actif',
    dot: 'bg-emerald-500',
    badge: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  },
  inactive: {
    label: 'Inactif',
    dot: 'bg-rose-500',
    badge: 'bg-rose-500/10 text-rose-600 border-rose-500/20',
  },
  on_leave: {
    label: 'En congé',
    dot: 'bg-amber-500',
    badge: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  },
};

const avatarGradients = [
  'linear-gradient(135deg, #4f46e5, #6366f1)',
  'linear-gradient(135deg, #7c3aed, #8b5cf6)',
  'linear-gradient(135deg, #0891b2, #06b6d4)',
  'linear-gradient(135deg, #059669, #10b981)',
  'linear-gradient(135deg, #d97706, #f59e0b)',
  'linear-gradient(135deg, #dc2626, #ef4444)',
  'linear-gradient(135deg, #0d9488, #14b8a6)',
  'linear-gradient(135deg, #7c3aed, #a855f7)',
];

function getAvatarGradient(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return avatarGradients[Math.abs(hash) % avatarGradients.length];
}

function getRiskLevel(risk: number) {
  if (risk < 30) return { label: 'Faible', color: '#10b981', bg: 'rgba(16,185,129,0.12)', bar: '#10b981' };
  if (risk < 60) return { label: 'Modéré', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', bar: '#f59e0b' };
  return { label: 'Élevé', color: '#f43f5e', bg: 'rgba(244,63,94,0.12)', bar: '#f43f5e' };
}

export default function EmployeeCard({ employee, onClick }: EmployeeCardProps) {
  const hasHighChurnRisk = employee.churn_risk != null && employee.churn_risk > 60;
  const gradient = getAvatarGradient(`${employee.user.first_name}${employee.user.last_name}`);
  const status = statusConfig[employee.status] ?? statusConfig.active;
  const risk = employee.churn_risk != null ? getRiskLevel(employee.churn_risk) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, transition: { duration: 0.18 } }}
      transition={{ duration: 0.25 }}
      onClick={onClick}
      className="group relative cursor-pointer overflow-hidden rounded-xl border bg-card transition-all"
      style={{
        borderColor: hasHighChurnRisk ? 'rgba(244,63,94,0.3)' : 'hsl(var(--border))',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.boxShadow = hasHighChurnRisk
          ? '0 8px 24px rgba(244,63,94,0.12), 0 0 0 1px rgba(244,63,94,0.2)'
          : '0 8px 24px rgba(0,0,0,0.08), 0 0 0 1px hsl(var(--border))';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
      }}
    >
      {/* Risk stripe at top */}
      {hasHighChurnRisk && (
        <div
          className="absolute left-0 right-0 top-0 h-[2px]"
          style={{ background: 'linear-gradient(90deg, #f43f5e, #fb7185)' }}
        />
      )}

      <div className="p-4">
        {/* Header row */}
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div className="relative shrink-0">
            <div
              className="flex h-[42px] w-[42px] items-center justify-center rounded-xl text-sm font-bold text-white shadow-sm"
              style={{ background: gradient }}
            >
              {employee.user.first_name[0]}
              {employee.user.last_name[0]}
            </div>
            {/* Status dot */}
            <span
              className={cn(
                'absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-[2px] border-card',
                status.dot
              )}
            />
          </div>

          {/* Name / Role */}
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-[14px] font-semibold leading-tight">
              {employee.user.first_name} {employee.user.last_name}
            </h3>
            <p className="mt-0.5 truncate text-[12px] text-muted-foreground">
              {employee.position}
            </p>
          </div>

          {/* Actions menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
              >
                <MoreVertical className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="text-[13px]">
              <DropdownMenuItem>Voir le profil</DropdownMenuItem>
              <DropdownMenuItem>Modifier</DropdownMenuItem>
              <DropdownMenuItem>Envoyer un email</DropdownMenuItem>
              <DropdownMenuItem className="text-destructive focus:text-destructive">
                Désactiver
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Meta info */}
        <div className="mt-3 space-y-1.5">
          <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
            <Mail className="h-3 w-3 shrink-0" />
            <span className="truncate">{employee.user.email}</span>
          </div>
          <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
            <Building2 className="h-3 w-3 shrink-0" />
            <span className="truncate">{employee.department}</span>
          </div>
        </div>

        {/* Status + Risk row */}
        <div className="mt-3 flex items-center justify-between">
          <span
            className={cn(
              'inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium',
              status.badge
            )}
          >
            {status.label}
          </span>

          {risk && employee.churn_risk != null && (
            <span
              className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
              style={{ background: risk.bg, color: risk.color }}
            >
              {hasHighChurnRisk && <ShieldAlert className="h-3 w-3" />}
              {employee.churn_risk}% churn
            </span>
          )}
        </div>

        {/* Churn risk bar */}
        {employee.churn_risk != null && risk && (
          <div className="mt-3">
            <div className="h-1 overflow-hidden rounded-full bg-muted">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${employee.churn_risk}%` }}
                transition={{ duration: 0.9, ease: 'easeOut' }}
                className="h-full rounded-full"
                style={{ background: risk.bar }}
              />
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
