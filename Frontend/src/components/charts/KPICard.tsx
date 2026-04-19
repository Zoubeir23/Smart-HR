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
  iconColor: string;
  accent: string;
  glowColor: string;
  topBorder: string;
  badgeBg: string;
  badgeText: string;
}> = {
  indigo: {
    iconBg: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
    iconColor: 'text-white',
    accent: '#4f46e5',
    glowColor: 'rgba(99,102,241,0.12)',
    topBorder: '#6366f1',
    badgeBg: 'rgba(99,102,241,0.1)',
    badgeText: '#818cf8',
  },
  amber: {
    iconBg: 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)',
    iconColor: 'text-white',
    accent: '#f59e0b',
    glowColor: 'rgba(245,158,11,0.10)',
    topBorder: '#f59e0b',
    badgeBg: 'rgba(245,158,11,0.1)',
    badgeText: '#fbbf24',
  },
  emerald: {
    iconBg: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
    iconColor: 'text-white',
    accent: '#10b981',
    glowColor: 'rgba(16,185,129,0.10)',
    topBorder: '#10b981',
    badgeBg: 'rgba(16,185,129,0.1)',
    badgeText: '#34d399',
  },
  rose: {
    iconBg: 'linear-gradient(135deg, #e11d48 0%, #f43f5e 100%)',
    iconColor: 'text-white',
    accent: '#f43f5e',
    glowColor: 'rgba(244,63,94,0.10)',
    topBorder: '#f43f5e',
    badgeBg: 'rgba(244,63,94,0.1)',
    badgeText: '#fb7185',
  },
  violet: {
    iconBg: 'linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%)',
    iconColor: 'text-white',
    accent: '#8b5cf6',
    glowColor: 'rgba(139,92,246,0.10)',
    topBorder: '#8b5cf6',
    badgeBg: 'rgba(139,92,246,0.1)',
    badgeText: '#a78bfa',
  },
  cyan: {
    iconBg: 'linear-gradient(135deg, #0891b2 0%, #06b6d4 100%)',
    iconColor: 'text-white',
    accent: '#06b6d4',
    glowColor: 'rgba(6,182,212,0.10)',
    topBorder: '#06b6d4',
    badgeBg: 'rgba(6,182,212,0.1)',
    badgeText: '#22d3ee',
  },
};

const changeConfig = {
  increase: {
    icon: TrendingUp,
    label: 'hausse',
    style: { background: 'rgba(16,185,129,0.12)', color: '#34d399' },
  },
  decrease: {
    icon: TrendingDown,
    label: 'baisse',
    style: { background: 'rgba(244,63,94,0.12)', color: '#fb7185' },
  },
  neutral: {
    icon: Minus,
    label: 'stable',
    style: { background: 'rgba(148,163,184,0.12)', color: '#94a3b8' },
  },
};

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
      whileHover={{ y: -3, transition: { duration: 0.2 } }}
      transition={{ duration: 0.35 }}
      className={cn(
        'group relative overflow-hidden rounded-xl border bg-card p-5 shadow-sm transition-shadow hover:shadow-lg',
        className
      )}
      style={{
        borderColor: 'hsl(var(--border))',
        boxShadow: `0 1px 3px rgba(0,0,0,0.06), 0 0 0 0 ${cfg.glowColor}`,
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow =
          `0 8px 24px rgba(0,0,0,0.1), 0 0 0 1px ${cfg.accent}22`;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow =
          `0 1px 3px rgba(0,0,0,0.06)`;
      }}
    >
      {/* Colored top accent */}
      <div
        className="absolute left-0 top-0 right-0 h-[3px] rounded-t-xl"
        style={{ background: `linear-gradient(90deg, ${cfg.topBorder}, ${cfg.topBorder}88)` }}
      />

      {/* Subtle background glow */}
      <div
        className="pointer-events-none absolute right-0 top-0 h-24 w-24 rounded-full blur-2xl"
        style={{ background: cfg.glowColor, opacity: 0.6 }}
      />

      <div className="relative flex items-start justify-between gap-3">
        {/* Content */}
        <div className="min-w-0 flex-1 space-y-2.5">
          <p className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
            {title}
          </p>

          <div className="flex items-baseline gap-2.5">
            <motion.h3
              key={String(value)}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="text-[2rem] font-bold leading-none tracking-tight"
              style={{ fontFeatureSettings: '"tnum"' }}
            >
              {value}
            </motion.h3>

            {change && changeCfg && ChangeIcon && (
              <span
                className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
                style={changeCfg.style}
              >
                <ChangeIcon className="h-3 w-3" />
                {change.value}%
              </span>
            )}
          </div>

          {description && (
            <p className="text-[12px] text-muted-foreground">{description}</p>
          )}
        </div>

        {/* Icon */}
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl shadow-md"
          style={{ background: cfg.iconBg, boxShadow: `0 4px 12px ${cfg.glowColor}` }}
        >
          <Icon className={cn('h-5 w-5', cfg.iconColor)} />
        </div>
      </div>
    </motion.div>
  );
}
