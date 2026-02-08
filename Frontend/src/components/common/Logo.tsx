import { cn } from '@/lib/utils';

interface LogoProps {
  variant?: 'full' | 'icon' | 'text';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Logo Smart-HR — Sobre, corporate, crédible RH/Tech
 * Symbole abstrait : 3 silhouettes stylisées (équipe/collaboration)
 * Pas de référence IA gadget
 */
const sizeConfig = {
  sm: { icon: 28, text: 'text-lg' },
  md: { icon: 36, text: 'text-xl' },
  lg: { icon: 48, text: 'text-3xl' },
};

export default function Logo({ variant = 'full', size = 'md', className }: LogoProps) {
  const { icon: iconSize, text: textSize } = sizeConfig[size];

  // Icône abstraite : 3 silhouettes formant une équipe/collaboration
  // Style minimaliste, corporate, sans IA gadget
  const IconSVG = (
    <svg
      width={iconSize}
      height={iconSize}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="flex-shrink-0"
      aria-hidden
    >
      <rect
        width="48"
        height="48"
        rx="10"
        fill="currentColor"
        className="text-primary"
      />
      {/* Silhouettes stylisées — représentation abstraite d'équipe */}
      <rect
        x="12"
        y="14"
        width="6"
        height="20"
        rx="3"
        fill="white"
        fillOpacity="0.95"
      />
      <rect x="21" y="10" width="6" height="24" rx="3" fill="white" />
      <rect
        x="30"
        y="14"
        width="6"
        height="20"
        rx="3"
        fill="white"
        fillOpacity="0.95"
      />
      <rect
        x="12"
        y="22"
        width="24"
        height="2"
        rx="1"
        fill="white"
        fillOpacity="0.8"
      />
    </svg>
  );

  if (variant === 'icon') {
    return <div className={cn('inline-flex', className)}>{IconSVG}</div>;
  }

  if (variant === 'text') {
    return (
      <span className={cn(textSize, 'font-bold tracking-tight', className)}>
        <span className="text-foreground">Smart</span>
        <span className="text-primary">-HR</span>
      </span>
    );
  }

  return (
    <div className={cn('inline-flex items-center gap-2.5', className)}>
      {IconSVG}
      <span className={cn(textSize, 'font-bold tracking-tight')}>
        <span className="text-foreground">Smart</span>
        <span className="text-primary">-HR</span>
      </span>
    </div>
  );
}
