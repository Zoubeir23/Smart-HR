import { motion } from 'framer-motion';
import { getMatchingScoreColorClass, getMatchingScoreTextClass } from '@/components/recrutement/applicationHelpers';
import { cn } from '@/lib/utils';

interface MatchingScoreGaugeProps {
  score: number;
}

export function MatchingScoreGauge({ score }: MatchingScoreGaugeProps) {
  const colorClass = getMatchingScoreColorClass(score);
  const textClass = getMatchingScoreTextClass(score);

  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden min-w-0">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className={cn('h-full rounded-full', colorClass)}
        />
      </div>
      <span className={cn('text-sm font-semibold tabular-nums shrink-0', textClass)}>
        {score}%
      </span>
    </div>
  );
}
