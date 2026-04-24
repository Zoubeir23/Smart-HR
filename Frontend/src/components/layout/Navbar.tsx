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
    /* DS Topbar — bg blanc strict, border warm, h-64px */
    <header className="sticky top-0 z-30 flex h-16 flex-shrink-0 items-center gap-5 border-b border-[hsl(34,30%,86%)] bg-white px-6">

      {/* Bouton menu mobile */}
      {showMenuButton && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenuClick}
          className="lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </Button>
      )}

      {/* Logo mobile uniquement */}
      <Link to="/dashboard" className="flex items-center shrink-0 lg:hidden">
        <Logo variant="full" size="sm" />
      </Link>

      {/* Search — DS: fond cream, focus border rouge */}
      <div className="relative hidden flex-1 max-w-[420px] md:flex">
        <Search className="absolute left-3 top-1/2 h-[14px] w-[14px] -translate-y-1/2 text-muted-foreground/60" />
        <Input
          placeholder="Rechercher employés, documents..."
          className="h-[38px] rounded-[10px] border-[hsl(34,30%,86%)] bg-[hsl(36,40%,96%)] pl-9 text-[13px] focus-visible:bg-white"
        />
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Actions droite */}
      <div className="flex items-center gap-1.5">

        {/* Toggle dark mode — DS: hover warm */}
        <button
          onClick={toggleTheme}
          className="flex h-[38px] w-[38px] items-center justify-center rounded-[10px] text-muted-foreground transition-colors hover:bg-[hsl(36,40%,91%)] hover:text-foreground"
        >
          {theme === 'dark'
            ? <Sun className="h-[17px] w-[17px]" />
            : <Moon className="h-[17px] w-[17px]" />
          }
        </button>

        {/* Notifications — DS: point rouge sans badge carré */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="relative flex h-[38px] w-[38px] items-center justify-center rounded-[10px] text-muted-foreground transition-colors hover:bg-[hsl(36,40%,91%)] hover:text-foreground">
              <Bell className="h-[17px] w-[17px]" />
              {/* Dot rouge DS */}
              <span className="absolute right-[9px] top-[9px] h-[7px] w-[7px] rounded-full bg-[#D62828] ring-2 ring-white" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 rounded-xl border-[hsl(34,30%,86%)] shadow-lg">
            <DropdownMenuLabel className="flex items-center justify-between px-4 py-3">
              <span className="font-semibold text-foreground">Notifications</span>
              <button className="text-[11px] font-semibold text-[#c41e1e] hover:text-[#D62828]">
                Tout marquer comme lu
              </button>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="border-[hsl(34,30%,86%)]" />
            {notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className="flex cursor-pointer flex-col items-start gap-1 px-4 py-3 hover:bg-[hsl(36,40%,96%)]"
              >
                <span className="text-[13px] font-semibold text-foreground">{notification.title}</span>
                <span className="text-[12px] text-muted-foreground">{notification.description}</span>
                <span className="text-[11px] text-muted-foreground/60">{notification.time}</span>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator className="border-[hsl(34,30%,86%)]" />
            <DropdownMenuItem className="cursor-pointer justify-center py-2.5 text-[13px] font-semibold text-[#c41e1e] hover:bg-[hsl(36,40%,96%)] hover:text-[#D62828]">
              Voir toutes les notifications
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User menu — DS: avatar rouge gradient, nom + rôle */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2.5 rounded-[10px] px-2 py-1.5 transition-colors hover:bg-[hsl(36,40%,91%)]">
              {/* Avatar rouge gradient */}
              <div
                className="flex h-[34px] w-[34px] flex-shrink-0 items-center justify-center rounded-[10px] text-[13px] font-bold text-white"
                style={{ background: 'linear-gradient(135deg, #e86060, #c41e1e)' }}
              >
                {user?.first_name?.[0]}{user?.last_name?.[0]}
              </div>
              <div className="hidden text-left md:block">
                <p className="text-[13px] font-semibold text-foreground leading-tight">
                  {user?.first_name} {user?.last_name}
                </p>
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                  {user?.role}
                </p>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 rounded-xl border-[hsl(34,30%,86%)] shadow-lg">
            <DropdownMenuLabel className="px-4 py-3 text-[13px] font-semibold">Mon compte</DropdownMenuLabel>
            <DropdownMenuSeparator className="border-[hsl(34,30%,86%)]" />
            <DropdownMenuItem asChild>
              <Link to="/profile" className="flex items-center gap-2.5 px-4 py-2.5 text-[13px] hover:bg-[hsl(36,40%,96%)]">
                <User className="h-4 w-4 text-muted-foreground" />
                Profil
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/settings" className="flex items-center gap-2.5 px-4 py-2.5 text-[13px] hover:bg-[hsl(36,40%,96%)]">
                <Settings className="h-4 w-4 text-muted-foreground" />
                Paramètres
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="border-[hsl(34,30%,86%)]" />
            <DropdownMenuItem
              className="flex cursor-pointer items-center gap-2.5 px-4 py-2.5 text-[13px] text-[#c41e1e] hover:bg-[hsl(0,69%,50%,0.06)] hover:text-[#D62828]"
              onClick={() => logout()}
            >
              <LogOut className="h-4 w-4" />
              Déconnexion
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
