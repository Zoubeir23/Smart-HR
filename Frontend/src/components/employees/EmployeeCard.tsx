import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { MoreVertical, Mail, Phone, MapPin, AlertTriangle, Eye, Pencil, UserX } from 'lucide-react';
import { Employee } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface EmployeeCardProps {
  employee: Employee;
  /** Appelé quand on demande la désactivation depuis le menu */
  onDeactivate?: (employee: Employee) => void;
}

const statusStyles = {
  active:   'bg-success/10 text-success border-success/20',
  inactive: 'bg-destructive/10 text-destructive border-destructive/20',
  on_leave: 'bg-warning/10 text-warning border-warning/20',
};

const statusLabels = {
  active:   'Actif',
  inactive: 'Inactif',
  on_leave: 'En congé',
};

const avatarColors = [
  'bg-blue-600', 'bg-indigo-600', 'bg-violet-600', 'bg-teal-600',
  'bg-cyan-600',  'bg-emerald-600', 'bg-sky-600',   'bg-slate-600',
];

function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return avatarColors[Math.abs(hash) % avatarColors.length];
}

export default function EmployeeCard({ employee, onDeactivate }: EmployeeCardProps) {
  const navigate = useNavigate();
  const hasHighChurnRisk = employee.churn_risk && employee.churn_risk > 60;
  const avatarBg = getAvatarColor(`${employee.user.first_name}${employee.user.last_name}`);

  function goToProfile() {
    navigate(`/employees/${employee.id}`);
  }

  function goToEdit() {
    navigate(`/employees/${employee.id}?edit=true`);
  }

  function sendEmail() {
    window.location.href = `mailto:${employee.user.email}`;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      className="group relative cursor-pointer rounded-lg border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md"
      onClick={goToProfile}
    >
      {/* Badge risque churn */}
      {hasHighChurnRisk && (
        <div className="absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full bg-destructive shadow-lg">
          <AlertTriangle className="h-4 w-4 text-destructive-foreground" />
        </div>
      )}

      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4 min-w-0 flex-1">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <div className={cn('flex h-14 w-14 items-center justify-center rounded-full text-lg font-semibold text-white', avatarBg)}>
              {employee.user.first_name[0]}
              {employee.user.last_name[0]}
            </div>
            <div
              className={cn(
                'absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-card',
                employee.status === 'active'   && 'bg-success',
                employee.status === 'inactive' && 'bg-destructive',
                employee.status === 'on_leave' && 'bg-warning'
              )}
            />
          </div>

          {/* Info */}
          <div className="min-w-0">
            <h3 className="font-semibold truncate">
              {employee.user.first_name} {employee.user.last_name}
            </h3>
            <p className="text-sm text-muted-foreground truncate">
              {(employee as { position_title?: string }).position_title ?? '—'}
            </p>
            <Badge variant="outline" className={cn('mt-1', statusStyles[employee.status])}>
              {statusLabels[employee.status]}
            </Badge>
          </div>
        </div>

        {/* Menu actions — stoppe la propagation pour ne pas déclencher goToProfile */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 flex-shrink-0"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
            <DropdownMenuItem onSelect={(e) => { e.preventDefault(); e.stopPropagation(); goToProfile(); }} className="gap-2 cursor-pointer">
              <Eye className="h-4 w-4" />
              Voir le profil
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={(e) => { e.preventDefault(); e.stopPropagation(); goToEdit(); }} className="gap-2 cursor-pointer">
              <Pencil className="h-4 w-4" />
              Modifier
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={(e) => { e.preventDefault(); e.stopPropagation(); sendEmail(); }} className="gap-2 cursor-pointer">
              <Mail className="h-4 w-4" />
              Envoyer un email
            </DropdownMenuItem>
            {onDeactivate && employee.status === 'active' && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={(e) => { e.preventDefault(); e.stopPropagation(); onDeactivate(employee); }}
                  className="gap-2 cursor-pointer text-destructive focus:text-destructive"
                >
                  <UserX className="h-4 w-4" />
                  Désactiver
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Détails */}
      <div className="mt-4 space-y-2 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 flex-shrink-0" />
          <span className="truncate">{employee.user.email}</span>
        </div>
        {employee.user.tel && (
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 flex-shrink-0" />
            <span>{employee.user.tel}</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 flex-shrink-0" />
          <span className="truncate">
            {(employee as { department_name?: string }).department_name ?? '—'}
          </span>
        </div>
      </div>

      {/* Barre de risque churn */}
      {employee.churn_risk !== undefined && (
        <div className="mt-4 space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Risque de départ</span>
            <span
              className={cn(
                'font-medium',
                employee.churn_risk < 30  && 'text-success',
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
                employee.churn_risk < 30  && 'bg-success',
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
