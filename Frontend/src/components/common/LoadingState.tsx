import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingStateProps {
  message?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * État de chargement — Design system Smart-HR
 * Spinner sobre et professionnel
 */
export default function LoadingState({
  message = 'Chargement...',
  className,
  size = 'md',
}: LoadingStateProps) {
  const sizeClasses = {
    sm: 'h-5 w-5',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-4 py-12',
        className
      )}
    >
      <Loader2
        className={cn('animate-spin text-primary', sizeClasses[size])}
      />
      {message && (
        <p className="text-sm text-muted-foreground">{message}</p>
      )}
    </div>
  );
}
