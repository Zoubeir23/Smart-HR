import { motion } from 'framer-motion';
import { MoreVertical, Mail, Phone, MapPin, AlertTriangle } from 'lucide-react';
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

const statusStyles = {
  active: 'bg-success/10 text-success border-success/20',
  inactive: 'bg-destructive/10 text-destructive border-destructive/20',
  on_leave: 'bg-warning/10 text-warning border-warning/20',
};

const statusLabels = {
  active: 'Actif',
  inactive: 'Inactif',
  on_leave: 'En congé',
};

// Deterministic corporate avatar colors from initials
const avatarColors = [
  'bg-blue-600',
  'bg-indigo-600',
  'bg-violet-600',
  'bg-teal-600',
  'bg-cyan-600',
  'bg-emerald-600',
  'bg-sky-600',
  'bg-slate-600',
];

function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return avatarColors[Math.abs(hash) % avatarColors.length];
}

export default function EmployeeCard({ employee, onClick }: EmployeeCardProps) {
  const hasHighChurnRisk = employee.churn_risk && employee.churn_risk > 60;
  const avatarBg = getAvatarColor(`${employee.user.first_name}${employee.user.last_name}`);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      className="group relative cursor-pointer rounded-lg border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md"
      onClick={onClick}
    >
      {/* Risque de churn badge */}
      {hasHighChurnRisk && (
        <div className="absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full bg-destructive shadow-lg">
          <AlertTriangle className="h-4 w-4 text-destructive-foreground" />
        </div>
      )}

      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <div className="relative">
            <div className={cn('flex h-14 w-14 items-center justify-center rounded-full text-lg font-semibold text-white', avatarBg)}>
              {employee.user.first_name[0]}
              {employee.user.last_name[0]}
            </div>
            <div
              className={cn(
                'absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-card',
                employee.status === 'active' && 'bg-success',
                employee.status === 'inactive' && 'bg-destructive',
                employee.status === 'on_leave' && 'bg-warning'
              )}
            />
          </div>

          {/* Info */}
          <div>
            <h3 className="font-semibold">
              {employee.user.first_name} {employee.user.last_name}
            </h3>
            <p className="text-sm text-muted-foreground">{employee.position}</p>
            <Badge variant="outline" className={cn('mt-1', statusStyles[employee.status])}>
              {statusLabels[employee.status]}
            </Badge>
          </div>
        </div>

        {/* Actions */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>Voir le profil</DropdownMenuItem>
            <DropdownMenuItem>Modifier</DropdownMenuItem>
            <DropdownMenuItem>Envoyer un email</DropdownMenuItem>
            <DropdownMenuItem className="text-destructive focus:text-destructive">
              Désactiver
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Details */}
      <div className="mt-4 space-y-2 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4" />
          <span className="truncate">{employee.user.email}</span>
        </div>
        {employee.phone && (
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4" />
            <span>{employee.phone}</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          <span>{employee.department}</span>
        </div>
      </div>

      {/* Churn Risk Bar */}
      {employee.churn_risk !== undefined && (
        <div className="mt-4 space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Risque de départ</span>
            <span
              className={cn(
                'font-medium',
                employee.churn_risk < 30 && 'text-success',
                employee.churn_risk >= 30 && employee.churn_risk < 60 && 'text-warning',
                employee.churn_risk >= 60 && 'text-destructive'
              )}
            >
              {employee.churn_risk}%
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${employee.churn_risk}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className={cn(
                'h-full rounded-full',
                employee.churn_risk < 30 && 'bg-success',
                employee.churn_risk >= 30 && employee.churn_risk < 60 && 'bg-warning',
                employee.churn_risk >= 60 && 'bg-destructive'
              )}
            />
          </div>
        </div>
      )}
    </motion.div>
  );
}
