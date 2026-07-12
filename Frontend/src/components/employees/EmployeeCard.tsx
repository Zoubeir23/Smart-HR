import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Mail, Phone, MapPin, AlertTriangle, Eye, Pencil, UserX, MoreVertical } from 'lucide-react';
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
  onDeactivate?: (employee: Employee) => void;
}

const statusConfig = {
  active:   { label: 'Actif',     dot: 'bg-success',     badge: 'bg-success/10 text-success border-success/20' },
  inactive: { label: 'Inactif',   dot: 'bg-destructive', badge: 'bg-destructive/10 text-destructive border-destructive/20' },
  on_leave: { label: 'En congé',  dot: 'bg-warning',      badge: 'bg-warning/10 text-warning border-warning/20' },
};

/* En-tête de carte : navy de marque constant (cf. sidebar), pas de dégradé par employé */
const cardHeaderGradient = 'from-brand-navy to-brand-navy-800';

export default function EmployeeCard({ employee, onDeactivate }: EmployeeCardProps) {
  const navigate = useNavigate();
  const gradientClass = cardHeaderGradient;
  const status = statusConfig[employee.status] ?? statusConfig.inactive;
  const hasHighChurnRisk = (employee.churn_risk ?? 0) > 60;
  const dept = (employee as { department_name?: string }).department_name ?? '—';
  const position = (employee as { position_title?: string }).position_title ?? '—';
  const initials = `${employee.user.first_name[0]}${employee.user.last_name[0]}`;

  function goToProfile() { navigate(`/employees/${employee.id}`); }
  function goToEdit() { navigate(`/employees/${employee.id}?edit=true`); }
  function sendEmail() { window.location.href = `mailto:${employee.user.email}`; }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, transition: { duration: 0.18 } }}
      transition={{ duration: 0.28 }}
      className="group relative cursor-pointer rounded-xl border border-border bg-card overflow-hidden shadow-sm hover:shadow-lg hover:border-border/80 transition-shadow"
      onClick={goToProfile}
    >
      {/* ── Gradient header ── */}
      <div className={cn('relative h-20 bg-gradient-to-br', gradientClass)}>
        {/* Subtle pattern overlay — bg-[image:...] = valeur arbitraire Tailwind pour backgroundImage */}
        <div className="absolute inset-0 opacity-[0.08] bg-[image:repeating-linear-gradient(45deg,transparent,transparent_12px,rgba(255,255,255,0.4)_12px,rgba(255,255,255,0.4)_13px)]" />

        {/* High risk badge */}
        {hasHighChurnRisk && (
          <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-destructive/90 px-2 py-0.5 text-[10px] font-bold text-destructive-foreground shadow-lg backdrop-blur-sm">
            <AlertTriangle className="h-3 w-3" />
            Risque élevé
          </div>
        )}

        {/* Menu (visible au survol ou au focus clavier) */}
        <div
          className="absolute left-3 top-3 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
          onClick={(e) => e.stopPropagation()}
        >
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Actions pour ${employee.user.first_name} ${employee.user.last_name}`}
                className="h-7 w-7 bg-black/20 text-white hover:bg-black/40 hover:text-white backdrop-blur-sm"
              >
                <MoreVertical className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem onSelect={(e) => { e.preventDefault(); goToProfile(); }} className="gap-2 cursor-pointer">
                <Eye className="h-4 w-4" /> Voir le profil
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={(e) => { e.preventDefault(); goToEdit(); }} className="gap-2 cursor-pointer">
                <Pencil className="h-4 w-4" /> Modifier
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={(e) => { e.preventDefault(); sendEmail(); }} className="gap-2 cursor-pointer">
                <Mail className="h-4 w-4" /> Envoyer un email
              </DropdownMenuItem>
              {onDeactivate && employee.status === 'active' && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onSelect={(e) => { e.preventDefault(); onDeactivate(employee); }}
                    className="gap-2 cursor-pointer text-destructive focus:text-destructive"
                  >
                    <UserX className="h-4 w-4" /> Désactiver
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* ── Avatar (overlapping header) ── */}
      <div className="px-4 pb-4">
        <div className="relative -mt-8 mb-3 flex items-end justify-between">
          <div className={cn(
            'flex h-16 w-16 items-center justify-center rounded-full text-xl font-bold text-white ring-4 ring-card shadow-md bg-gradient-to-br',
            gradientClass
          )}>
            {initials}
          </div>
          {/* Status dot + badge */}
          <Badge
            variant="outline"
            className={cn('text-[11px] px-2 py-0.5 font-semibold border', status.badge)}
          >
            <span className={cn('mr-1.5 inline-block h-1.5 w-1.5 rounded-full', status.dot)} />
            {status.label}
          </Badge>
        </div>

        {/* Name + position */}
        <div className="mb-3 space-y-0.5">
          <h3 className="font-bold text-sm leading-tight text-foreground group-hover:text-primary transition-colors">
            {employee.user.first_name} {employee.user.last_name}
          </h3>
          <p className="text-xs text-muted-foreground truncate">{position}</p>
        </div>

        {/* Details */}
        <div className="space-y-1.5 text-xs text-muted-foreground mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <MapPin className="h-3.5 w-3.5 shrink-0 opacity-50" />
            <span className="truncate">{dept}</span>
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <Mail className="h-3.5 w-3.5 shrink-0 opacity-50" />
            <span className="truncate">{employee.user.email}</span>
          </div>
          {employee.user.tel && (
            <div className="flex items-center gap-2">
              <Phone className="h-3.5 w-3.5 shrink-0 opacity-50" />
              <span>{employee.user.tel}</span>
            </div>
          )}
        </div>

        {/* Churn risk bar */}
        {employee.churn_risk !== undefined && (
          <div className="space-y-1.5 pt-3 border-t border-border/60">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground font-medium">Risque de départ</span>
              <span className={cn(
                'font-bold tabular-nums',
                employee.churn_risk < 30  && 'text-success',
                employee.churn_risk >= 30 && employee.churn_risk < 60 && 'text-warning',
                employee.churn_risk >= 60 && 'text-destructive',
              )}>
                {employee.churn_risk}%
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${employee.churn_risk}%` }}
                transition={{ duration: 0.9, ease: 'easeOut', delay: 0.1 }}
                className={cn(
                  'h-full rounded-full',
                  employee.churn_risk < 30  && 'bg-success',
                  employee.churn_risk >= 30 && employee.churn_risk < 60 && 'bg-warning',
                  employee.churn_risk >= 60 && 'bg-[image:var(--gradient-primary)]',
                )}
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Barre d'actions révélée au survol ou au focus clavier ── */}
      <div className="absolute inset-x-0 bottom-0 flex translate-y-full items-center justify-center gap-1 bg-gradient-to-t from-card to-card/0 px-4 pb-3 pt-4 opacity-0 transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 h-8 text-xs gap-1.5"
          onClick={(e) => { e.stopPropagation(); sendEmail(); }}
        >
          <Mail className="h-3.5 w-3.5" />
          Email
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1 h-8 text-xs gap-1.5"
          onClick={(e) => { e.stopPropagation(); goToEdit(); }}
        >
          <Pencil className="h-3.5 w-3.5" />
          Modifier
        </Button>
      </div>
    </motion.div>
  );
}
