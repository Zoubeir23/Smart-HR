import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  variant?: 'default' | 'gradient' | 'outline';
}

const variants = {
  default: 'kpi-card',
  gradient: 'kpi-card gradient-border',
  outline: 'rounded-xl border-2 border-dashed border-border bg-card/50 p-6',
};

export default function KPICard({
  title,
  value,
  change,
  icon: Icon,
  description,
  className,
  variant = 'default',
}: KPICardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(variants[variant], className)}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-3xl font-bold tracking-tight">{value}</h3>
            {change && (
              <span
                className={cn(
                  'flex items-center text-sm font-medium',
                  change.type === 'increase' && 'text-success',
                  change.type === 'decrease' && 'text-destructive',
                  change.type === 'neutral' && 'text-muted-foreground'
                )}
              >
                {change.type === 'increase' && '↑'}
                {change.type === 'decrease' && '↓'}
                {change.value}%
              </span>
            )}
          </div>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-6 w-6 text-primary" />
        </div>
      </div>
    </motion.div>
  );
}
