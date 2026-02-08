import { cn } from '@/lib/utils';

interface LogoProps {
  variant?: 'full' | 'icon' | 'text';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeConfig = {
  sm: { icon: 28, text: 'text-lg' },
  md: { icon: 36, text: 'text-xl' },
  lg: { icon: 48, text: 'text-3xl' },
};

export default function Logo({ variant = 'full', size = 'md', className }: LogoProps) {
  const { icon: iconSize, text: textSize } = sizeConfig[size];

  const IconSVG = (
    <svg
      width={iconSize}
      height={iconSize}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="flex-shrink-0"
    >
      <defs>
        <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1e3a8a" />
          <stop offset="100%" stopColor="#3b82f6" />
        </linearGradient>
        <linearGradient id="logoGrad2" x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#2146a1" />
          <stop offset="100%" stopColor="#60a5fa" />
        </linearGradient>
      </defs>
      {/* Cercle de fond */}
      <rect width="48" height="48" rx="14" fill="url(#logoGrad)" />
      {/* Cerveau / Reseau - partie gauche */}
      <path
        d="M16 18C16 15.8 17.8 14 20 14C21.5 14 22.8 14.9 23.4 16.2"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.9"
      />
      <path
        d="M15 24C13.3 24 12 22.7 12 21C12 19.5 13 18.3 14.4 18"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.9"
      />
      <path
        d="M16 30C16 32.2 17.8 34 20 34C21.5 34 22.8 33.1 23.4 31.8"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.9"
      />
      <path
        d="M15 24C13.3 24 12 25.3 12 27C12 28.5 13 29.7 14.4 30"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.9"
      />
      {/* Cerveau / Reseau - partie droite */}
      <path
        d="M32 18C32 15.8 30.2 14 28 14C26.5 14 25.2 14.9 24.6 16.2"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.9"
      />
      <path
        d="M33 24C34.7 24 36 22.7 36 21C36 19.5 35 18.3 33.6 18"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.9"
      />
      <path
        d="M32 30C32 32.2 30.2 34 28 34C26.5 34 25.2 33.1 24.6 31.8"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.9"
      />
      <path
        d="M33 24C34.7 24 36 25.3 36 27C36 28.5 35 29.7 33.6 30"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.9"
      />
      {/* Connexion centrale */}
      <line x1="24" y1="16" x2="24" y2="32" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
      {/* Points de connexion (noeuds du reseau) */}
      <circle cx="24" cy="16" r="2.5" fill="white" />
      <circle cx="24" cy="24" r="3" fill="white" />
      <circle cx="24" cy="32" r="2.5" fill="white" />
      {/* Connexions laterales */}
      <line x1="24" y1="24" x2="16" y2="20" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
      <line x1="24" y1="24" x2="32" y2="20" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
      <line x1="24" y1="24" x2="16" y2="28" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
      <line x1="24" y1="24" x2="32" y2="28" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
      {/* Petits noeuds lateraux */}
      <circle cx="16" cy="20" r="1.5" fill="white" opacity="0.7" />
      <circle cx="32" cy="20" r="1.5" fill="white" opacity="0.7" />
      <circle cx="16" cy="28" r="1.5" fill="white" opacity="0.7" />
      <circle cx="32" cy="28" r="1.5" fill="white" opacity="0.7" />
    </svg>
  );

  if (variant === 'icon') {
    return <div className={cn('inline-flex', className)}>{IconSVG}</div>;
  }

  if (variant === 'text') {
    return (
      <span className={cn(textSize, 'font-bold', className)}>
        <span className="text-foreground">Smart</span>
        <span className="text-primary">-HR</span>
      </span>
    );
  }

  return (
    <div className={cn('inline-flex items-center gap-2.5', className)}>
      {IconSVG}
      <span className={cn(textSize, 'font-bold')}>
        <span className="text-foreground">Smart</span>
        <span className="text-primary">-HR</span>
      </span>
    </div>
  );
}
