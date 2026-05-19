import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ChurnGaugeProps {
  value: number; // 0-100
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

const sizeConfig = {
  sm: { width: 80,  strokeWidth: 8,  containerClass: 'w-20 h-[50px]' },
  md: { width: 120, strokeWidth: 10, containerClass: 'w-[120px] h-[70px]' },
  lg: { width: 160, strokeWidth: 12, containerClass: 'w-40 h-[90px]' },
};

export default function ChurnGauge({ value, size = 'md', showLabel = true, className }: ChurnGaugeProps) {
  const { width, strokeWidth, containerClass } = sizeConfig[size];
  const radius = (width - strokeWidth) / 2;
  const circumference = radius * Math.PI; // Semi-circle
  const progress = (value / 100) * circumference;

  const getRiskLevel = (v: number) => {
    if (v < 30) return { label: 'Faible', color: 'text-success', bgColor: 'stroke-success' };
    if (v < 60) return { label: 'Modéré', color: 'text-warning', bgColor: 'stroke-warning' };
    return { label: 'Élevé', color: 'text-destructive', bgColor: 'stroke-destructive' };
  };

  const risk = getRiskLevel(value);

  return (
    <div className={cn('flex flex-col items-center', className)}>
      <div className={cn('relative', containerClass)}>
        <svg width={width} height={width / 2 + 10} className="overflow-visible">
          {/* Background arc */}
          <path
            d={`M ${strokeWidth / 2} ${width / 2} A ${radius} ${radius} 0 0 1 ${width - strokeWidth / 2} ${width / 2}`}
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          {/* Progress arc */}
          <motion.path
            d={`M ${strokeWidth / 2} ${width / 2} A ${radius} ${radius} 0 0 1 ${width - strokeWidth / 2} ${width / 2}`}
            fill="none"
            className={risk.bgColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: circumference - progress }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
        </svg>
        {/* Value */}
        <div className="absolute inset-x-0 bottom-0 text-center">
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className={cn('text-2xl font-bold', risk.color)}
          >
            {value}%
          </motion.span>
        </div>
      </div>
      {showLabel && (
        <span className={cn('mt-2 text-sm font-medium', risk.color)}>Risque {risk.label}</span>
      )}
    </div>
  );
}
