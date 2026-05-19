import { motion } from 'framer-motion';
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

type CardColor = 'indigo' | 'amber' | 'emerald' | 'rose' | 'violet' | 'cyan';

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
  color?: CardColor;
  variant?: 'default' | 'gradient' | 'outline';
}

const colorConfig: Record<CardColor, {
  iconBg: string;
  topBar: string;
  glow: string;
  sparkHex: string;
  sparkFillHex: string;
}> = {
  indigo: {
    iconBg:       'bg-gradient-to-br from-indigo-600 to-indigo-400',
    topBar:       'bg-gradient-to-r from-indigo-500 to-indigo-400/40',
    glow:         'bg-indigo-500/10',
    sparkHex:     '#6366f1',
    sparkFillHex: 'rgba(99,102,241,0.06)',
  },
  amber: {
    iconBg:       'bg-gradient-to-br from-amber-600 to-amber-400',
    topBar:       'bg-gradient-to-r from-amber-500 to-amber-400/40',
    glow:         'bg-amber-500/10',
    sparkHex:     '#f59e0b',
    sparkFillHex: 'rgba(245,158,11,0.06)',
  },
  emerald: {
    iconBg:       'bg-gradient-to-br from-emerald-600 to-emerald-400',
    topBar:       'bg-gradient-to-r from-emerald-500 to-emerald-400/40',
    glow:         'bg-emerald-500/10',
    sparkHex:     '#10b981',
    sparkFillHex: 'rgba(16,185,129,0.06)',
  },
  rose: {
    iconBg:       'bg-gradient-to-br from-rose-600 to-rose-400',
    topBar:       'bg-gradient-to-r from-rose-500 to-rose-400/40',
    glow:         'bg-rose-500/10',
    sparkHex:     '#f43f5e',
    sparkFillHex: 'rgba(244,63,94,0.06)',
  },
  violet: {
    iconBg:       'bg-gradient-to-br from-violet-600 to-violet-400',
    topBar:       'bg-gradient-to-r from-violet-500 to-violet-400/40',
    glow:         'bg-violet-500/10',
    sparkHex:     '#8b5cf6',
    sparkFillHex: 'rgba(139,92,246,0.06)',
  },
  cyan: {
    iconBg:       'bg-gradient-to-br from-cyan-600 to-cyan-400',
    topBar:       'bg-gradient-to-r from-cyan-500 to-cyan-400/40',
    glow:         'bg-cyan-500/10',
    sparkHex:     '#06b6d4',
    sparkFillHex: 'rgba(6,182,212,0.06)',
  },
};

const changeConfig = {
  increase: { icon: TrendingUp,  className: 'bg-emerald-500/10 text-emerald-500' },
  decrease: { icon: TrendingDown, className: 'bg-rose-500/10 text-rose-500' },
  neutral:  { icon: Minus,       className: 'bg-slate-500/10 text-slate-400' },
};

/* SVG Sparkline — stroke/fill sont des attributs SVG natifs, pas des styles CSS */
function Sparkline({ strokeColor, fillColor }: { strokeColor: string; fillColor: string }) {
  const points = [0, 40, 25, 55, 35, 20, 50, 60, 45, 70, 55, 40, 70, 65, 80, 45, 90, 55, 100, 35];
  const w = 120;
  const h = 40;

  const coords: [number, number][] = [];
  for (let i = 0; i < points.length; i += 2) {
    coords.push([(points[i] / 100) * w, h - (points[i + 1] / 100) * h]);
  }

  const pathD = coords.reduce((acc, [x, y], idx) => {
    if (idx === 0) return `M ${x},${y}`;
    const [px, py] = coords[idx - 1];
    const cx1 = px + (x - px) / 3;
    const cx2 = x - (x - px) / 3;
    return `${acc} C ${cx1},${py} ${cx2},${y} ${x},${y}`;
  }, '');

  const fillPath = `${pathD} L ${w},${h} L 0,${h} Z`;

  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      className="absolute bottom-0 right-0 w-[120px] h-[40px] pointer-events-none"
      aria-hidden
    >
      <path d={fillPath} fill={fillColor} />
      <path d={pathD} fill="none" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function KPICard({
  title,
  value,
  change,
  icon: Icon,
  description,
  className,
  color = 'indigo',
}: KPICardProps) {
  const cfg = colorConfig[color];
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
      {/* Top accent bar */}
      <div className={cn('absolute left-0 top-0 right-0 h-[3px] rounded-t-xl', cfg.topBar)} />

      {/* Sparkline décorative */}
      <Sparkline strokeColor={cfg.sparkHex} fillColor={cfg.sparkFillHex} />

      {/* Glow orb */}
      <div className={cn('pointer-events-none absolute right-0 top-0 h-28 w-28 rounded-full blur-3xl opacity-60', cfg.glow)} />

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
            'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl shadow-md transition-transform duration-200 group-hover:scale-110',
            cfg.iconBg
          )}>
            <Icon className="h-5 w-5 text-white" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
