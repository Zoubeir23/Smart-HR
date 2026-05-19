import { Bell, Search, Moon, Sun, Menu, LogOut, User, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';
import Logo from '@/components/common/Logo';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface NavbarProps {
  onMenuClick?: () => void;
  showMenuButton?: boolean;
}

export default function Navbar({ onMenuClick, showMenuButton }: NavbarProps) {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();

  const notifications = [
    { id: 1, title: 'Nouvelle demande de congé', description: 'Amadou Sow a demandé un congé', time: 'Il y a 5 min' },
    { id: 2, title: 'Candidature reçue', description: 'Nouvelle candidature pour Développeur Frontend', time: 'Il y a 1h' },
    { id: 3, title: 'Risque de turnover détecté', description: 'Alerte IA : Fatou Ndiaye présente un risque élevé', time: 'Il y a 2h' },
  ];

  return (
    /* DS Topbar — bg blanc strict, border warm, h-64px — RESPONSIVE PADDING MOBILE-FIRST */
    <header className="sticky top-0 z-30 flex h-16 flex-shrink-0 items-center gap-2 sm:gap-3 md:gap-4 lg:gap-5 border-b border-[hsl(34,30%,86%)] bg-card px-3 sm:px-4 md:px-5 lg:px-6 dark:border-[hsl(20,10%,18%)]">

      {/* Bouton menu mobile — responsive icon size */}
      {showMenuButton && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenuClick}
          className="lg:hidden h-9 w-9 sm:h-10 sm:w-10"
        >
          <Menu className="h-4 w-4 sm:h-5 sm:w-5" />
        </Button>
      )}

      {/* Logo mobile uniquement — responsive sizing */}
      <Link to="/dashboard" className="flex items-center shrink-0 lg:hidden">
        <Logo variant="full" size="sm" />
      </Link>

      {/* Search — DS: fond cream, focus border rouge — HIDDEN ON MOBILE FOR SPACE */}
      <div className="relative hidden flex-1 max-w-xs sm:max-w-sm md:max-w-md lg:max-w-[420px] md:flex">
        <Search className="absolute left-2 sm:left-3 top-1/2 h-[13px] w-[13px] sm:h-[14px] sm:w-[14px] -translate-y-1/2 text-muted-foreground/60 flex-shrink-0" />
        <Input
          placeholder="Rechercher..."
          className="h-[36px] sm:h-[38px] rounded-[10px] border-[hsl(34,30%,86%)] bg-muted pl-7 sm:pl-9 pr-3 text-[12px] sm:text-[13px] focus-visible:bg-card dark:border-[hsl(20,10%,22%)] truncate"
        />
      </div>

      {/* Spacer */}
      <div className="flex-1 min-w-0" />

      {/* Actions droite — responsive gaps and sizing */}
      <div className="flex items-center gap-0.5 sm:gap-1 md:gap-1.5 flex-shrink-0">

        {/* Toggle dark mode — DS: hover warm — RESPONSIVE SIZING */}
        <button
          onClick={toggleTheme}
          className="flex h-8 w-8 sm:h-9 sm:w-9 md:h-[38px] md:w-[38px] items-center justify-center rounded-[10px] text-muted-foreground transition-colors hover:bg-[hsl(36,40%,91%)] hover:text-foreground flex-shrink-0"
        >
          {theme === 'dark'
            ? <Sun className="h-[15px] w-[15px] sm:h-4 sm:w-4 md:h-[17px] md:w-[17px]" />
            : <Moon className="h-[15px] w-[15px] sm:h-4 sm:w-4 md:h-[17px] md:w-[17px]" />
          }
        </button>

        {/* Notifications — DS: point rouge sans badge carré — RESPONSIVE SIZING */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="relative flex h-8 w-8 sm:h-9 sm:w-9 md:h-[38px] md:w-[38px] items-center justify-center rounded-[10px] text-muted-foreground transition-colors hover:bg-[hsl(36,40%,91%)] hover:text-foreground flex-shrink-0">
              <Bell className="h-[15px] w-[15px] sm:h-4 sm:w-4 md:h-[17px] md:w-[17px]" />
              {/* Dot rouge DS — RESPONSIVE */}
              <span className="absolute right-1 top-1 h-1.5 w-1.5 sm:right-[7px] sm:top-[7px] sm:h-[6px] sm:w-[6px] md:right-[9px] md:top-[9px] md:h-[7px] md:w-[7px] rounded-full bg-[#D62828] ring-1 sm:ring-2 ring-white" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72 sm:w-80 rounded-xl border-[hsl(34,30%,86%)] shadow-lg">
            <DropdownMenuLabel className="flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3">
              <span className="font-semibold text-foreground text-sm sm:text-base">Notifications</span>
              <button className="text-[10px] sm:text-[11px] font-semibold text-[#c41e1e] hover:text-[#D62828]">
                Tout marquer
              </button>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="border-[hsl(34,30%,86%)]" />
            {notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className="flex cursor-pointer flex-col items-start gap-0.5 px-3 sm:px-4 py-2 sm:py-3 hover:bg-[hsl(36,40%,96%)]"
              >
                <span className="text-xs sm:text-[13px] font-semibold text-foreground line-clamp-2">{notification.title}</span>
                <span className="text-xs text-muted-foreground line-clamp-1">{notification.description}</span>
                <span className="text-[10px] sm:text-[11px] text-muted-foreground/60">{notification.time}</span>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator className="border-[hsl(34,30%,86%)]" />
            <DropdownMenuItem className="cursor-pointer justify-center py-2 sm:py-2.5 text-xs sm:text-[13px] font-semibold text-[#c41e1e] hover:bg-[hsl(36,40%,96%)] hover:text-[#D62828]">
              Voir toutes
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User menu — DS: avatar rouge gradient, nom + rôle — RESPONSIVE LAYOUT */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-1.5 sm:gap-2 md:gap-2.5 rounded-[10px] px-1.5 sm:px-2 py-1 sm:py-1.5 transition-colors hover:bg-[hsl(36,40%,91%)] flex-shrink-0">
              {/* Avatar rouge gradient — RESPONSIVE SIZING */}
              <div
                className="flex h-7 w-7 sm:h-8 sm:w-8 md:h-[34px] md:w-[34px] flex-shrink-0 items-center justify-center rounded-[10px] text-[11px] sm:text-[12px] md:text-[13px] font-bold text-white bg-gradient-to-br from-brand-red-light to-brand-red-dark"
              >
                {user?.first_name?.[0]}{user?.last_name?.[0]}
              </div>
              <div className="hidden text-left sm:block">
                <p className="text-[11px] sm:text-[12px] md:text-[13px] font-semibold text-foreground leading-tight">
                  {user?.first_name}
                </p>
                <p className="text-[8px] sm:text-[9px] md:text-[10px] font-semibold uppercase tracking-[0.05em] sm:tracking-[0.08em] md:tracking-[0.1em] text-muted-foreground truncate">
                  {user?.role}
                </p>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 sm:w-56 rounded-xl border-[hsl(34,30%,86%)] shadow-lg">
            <DropdownMenuLabel className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-[13px] font-semibold">Mon compte</DropdownMenuLabel>
            <DropdownMenuSeparator className="border-[hsl(34,30%,86%)]" />
            <DropdownMenuItem asChild>
              <Link to="/profile" className="flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-[13px] hover:bg-[hsl(36,40%,96%)]">
                <User className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
                Profil
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/settings" className="flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-[13px] hover:bg-[hsl(36,40%,96%)]">
                <Settings className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
                Paramètres
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="border-[hsl(34,30%,86%)]" />
            <DropdownMenuItem
              className="flex cursor-pointer items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-[13px] text-[#c41e1e] hover:bg-[hsl(0,69%,50%,0.06)] hover:text-[#D62828]"
              onClick={() => logout()}
            >
              <LogOut className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
              Déconnexion
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
