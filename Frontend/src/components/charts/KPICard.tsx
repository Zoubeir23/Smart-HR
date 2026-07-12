import { motion } from 'framer-motion';
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Ton sémantique, pas décoration : neutre pour l'information pure, warning pour
 * ce qui attend une décision, destructive pour le signal de risque (le rouge
 * braise réservé à l'action, cf. DESIGN.md — La Règle de la Braise).
 */
type KPITone = 'neutral' | 'warning' | 'destructive';

interface KPICardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    type: 'increase' | 'decrease' | 'neutral';
  };
  icon: LucideIcon;
  description?: string;
  className?: string;
  tone?: KPITone;
}

const toneConfig: Record<KPITone, { iconBg: string; iconColor: string; topBar: string }> = {
  neutral: {
    iconBg: 'bg-muted',
    iconColor: 'text-muted-foreground',
    topBar: 'bg-border',
  },
  warning: {
    iconBg: 'bg-warning/12',
    iconColor: 'text-warning',
    topBar: 'bg-warning',
  },
  destructive: {
    iconBg: 'bg-destructive/12',
    iconColor: 'text-destructive',
    topBar: 'bg-[image:var(--gradient-primary)]',
  },
};

const changeConfig = {
  increase: { icon: TrendingUp, className: 'bg-success/10 text-success' },
  decrease: { icon: TrendingDown, className: 'bg-destructive/10 text-destructive' },
  neutral: { icon: Minus, className: 'bg-muted text-muted-foreground' },
};

export default function KPICard({
  title,
  value,
  change,
  icon: Icon,
  description,
  className,
  tone = 'neutral',
}: KPICardProps) {
  const cfg = toneConfig[tone];
  const changeCfg = change ? changeConfig[change.type] : null;
  const ChangeIcon = changeCfg?.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3, transition: { duration: 0.18 } }}
      transition={{ duration: 0.35 }}
      className={cn(
        'group relative overflow-hidden rounded-xl border bg-card shadow-sm transition-all hover:shadow-lg hover:border-border/60',
        className
      )}
    >
      {/* Top accent bar — plat pour le neutre, coloré seulement quand la carte porte un signal réel */}
      <div className={cn('absolute left-0 top-0 right-0 h-[3px] rounded-t-xl', cfg.topBar)} />

      <div className="relative p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-2.5">
            <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground/70">
              {title}
            </p>

            <div className="flex items-baseline gap-2.5">
              <motion.h3
                key={String(value)}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="tabular-nums text-[2.1rem] font-black leading-none tracking-tight text-foreground"
              >
                {value}
              </motion.h3>

              {change && changeCfg && ChangeIcon && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: 0.15 }}
                  className={cn(
                    'flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold',
                    changeCfg.className
                  )}
                >
                  <ChangeIcon className="h-3 w-3" />
                  {change.value > 0 ? '+' : ''}{change.value}%
                </motion.span>
              )}
            </div>

            {description && (
              <p className="text-[12px] leading-relaxed text-muted-foreground">{description}</p>
            )}
          </div>

          {/* Icon */}
          <div className={cn(
            'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-110',
            cfg.iconBg
          )}>
            <Icon className={cn('h-5 w-5', cfg.iconColor)} />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
