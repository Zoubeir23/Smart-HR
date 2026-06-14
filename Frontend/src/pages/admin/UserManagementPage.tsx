import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users,
  Search,
  ShieldCheck,
  ShieldOff,
  UserCog,
  Loader2,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { authService } from '@/services/authService';
import { useAuth } from '@/context/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import DataPagination, { usePagination } from '@/components/common/DataPagination';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

type UserRole = 'ADMIN' | 'RH' | 'EMPLOYEE' | 'CANDIDATE';

interface ManagedUser {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  username: string;
  role: UserRole;
  is_active: boolean;
  is_email_verified: boolean;
  date_joined: string;
  last_login: string | null;
}

// ──────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: 'ADMIN', label: 'Admin Système' },
  { value: 'RH', label: 'Responsable RH' },
  { value: 'EMPLOYEE', label: 'Employé' },
  { value: 'CANDIDATE', label: 'Candidat' },
];

const ROLE_BADGE_STYLES: Record<UserRole, string> = {
  ADMIN: 'bg-red-500/10 text-red-600 border-red-500/30 dark:text-red-400',
  RH: 'bg-blue-500/10 text-blue-600 border-blue-500/30 dark:text-blue-400',
  EMPLOYEE: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30 dark:text-emerald-400',
  CANDIDATE: 'bg-amber-500/10 text-amber-600 border-amber-500/30 dark:text-amber-400',
};

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

function getUserInitials(managedUser: ManagedUser): string {
  if (managedUser.first_name && managedUser.last_name) {
    return `${managedUser.first_name[0]}${managedUser.last_name[0]}`.toUpperCase();
  }
  return managedUser.email.slice(0, 2).toUpperCase();
}

function getUserFullName(managedUser: ManagedUser): string {
  if (managedUser.first_name || managedUser.last_name) {
    return `${managedUser.first_name} ${managedUser.last_name}`.trim();
  }
  return managedUser.username;
}

function getRoleLabel(role: UserRole): string {
  return ROLE_OPTIONS.find((option) => option.value === role)?.label ?? role;
}

function formatDate(dateString: string | null): string {
  if (!dateString) return 'Jamais';
  return new Date(dateString).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

// ──────────────────────────────────────────────
// Change Role Dialog
// ──────────────────────────────────────────────

interface ChangeRoleDialogProps {
  targetUser: ManagedUser | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (userId: number, newRole: UserRole) => void;
  isPending: boolean;
}

function ChangeRoleDialog({ targetUser, isOpen, onClose, onConfirm, isPending }: ChangeRoleDialogProps) {
  const [selectedRole, setSelectedRole] = useState<UserRole>(targetUser?.role ?? 'EMPLOYEE');

  if (!targetUser) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCog className="h-5 w-5 text-primary" />
            Changer le rôle
          </DialogTitle>
          <DialogDescription>
            Modifier le rôle de{' '}
            <span className="font-medium text-foreground">{getUserFullName(targetUser)}</span>{' '}
            ({targetUser.email})
          </DialogDescription>
        </DialogHeader>

        <div className="py-2">
          <Select
            value={selectedRole}
            onValueChange={(value) => setSelectedRole(value as UserRole)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Annuler
          </Button>
          <Button
            onClick={() => onConfirm(targetUser.id, selectedRole)}
            disabled={isPending || selectedRole === targetUser.role}
            className="gap-2"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCog className="h-4 w-4" />}
            Confirmer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ──────────────────────────────────────────────
// User Row Card
// ──────────────────────────────────────────────

interface UserRowCardProps {
  managedUser: ManagedUser;
  currentUserId: number;
  isTogglePending: boolean;
  isRolePending: boolean;
  onToggleActive: (managedUser: ManagedUser) => void;
  onChangeRole: (managedUser: ManagedUser) => void;
}

function UserRowCard({
  managedUser,
  currentUserId,
  isTogglePending,
  isRolePending,
  onToggleActive,
  onChangeRole,
}: UserRowCardProps) {
  const initials = getUserInitials(managedUser);
  const fullName = getUserFullName(managedUser);
  const isSelf = managedUser.id === currentUserId;

  return (
    <Card className={cn(
      'transition-shadow hover:shadow-sm',
      !managedUser.is_active && 'opacity-60',
    )}>
      <CardContent className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          {/* Avatar */}
          <div className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white',
            managedUser.is_active
              ? 'bg-gradient-to-br from-primary to-primary/70'
              : 'bg-muted-foreground/40',
          )}>
            {initials}
          </div>

          {/* Info */}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold text-foreground truncate">{fullName}</p>
              {isSelf && (
                <span className="text-xs text-muted-foreground">(vous)</span>
              )}
              <span className={cn(
                'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium',
                ROLE_BADGE_STYLES[managedUser.role],
              )}>
                {getRoleLabel(managedUser.role)}
              </span>
              {!managedUser.is_active && (
                <Badge variant="destructive" className="text-xs">Désactivé</Badge>
              )}
              {managedUser.is_email_verified && (
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              )}
            </div>
            <p className="text-sm text-muted-foreground truncate">{managedUser.email}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Inscrit le {formatDate(managedUser.date_joined)} · Dernière connexion : {formatDate(managedUser.last_login)}
            </p>
          </div>

          {/* Actions */}
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => onChangeRole(managedUser)}
              disabled={isRolePending}
            >
              {isRolePending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <UserCog className="h-3.5 w-3.5" />
              )}
              Rôle
            </Button>

            <Button
              variant={managedUser.is_active ? 'destructive' : 'outline'}
              size="sm"
              className="gap-1.5"
              onClick={() => onToggleActive(managedUser)}
              disabled={isTogglePending || isSelf}
              title={isSelf ? 'Impossible de modifier votre propre compte' : undefined}
            >
              {isTogglePending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : managedUser.is_active ? (
                <ShieldOff className="h-3.5 w-3.5" />
              ) : (
                <ShieldCheck className="h-3.5 w-3.5" />
              )}
              {managedUser.is_active ? 'Désactiver' : 'Activer'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ──────────────────────────────────────────────
// Main Page
// ──────────────────────────────────────────────

export default function UserManagementPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [activeFilter, setActiveFilter] = useState<string>('all');

  const [changeRoleTargetUser, setChangeRoleTargetUser] = useState<ManagedUser | null>(null);
  const [pendingToggleUserId, setPendingToggleUserId] = useState<number | null>(null);
  const [pendingRoleUserId, setPendingRoleUserId] = useState<number | null>(null);

  const { data: usersData, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: authService.listAllUsers,
  });

  const allUsers: ManagedUser[] = usersData ?? [];

  const filteredUsers = useMemo(() => {
    let list = allUsers;

    if (roleFilter !== 'all') {
      list = list.filter((managedUser) => managedUser.role === roleFilter);
    }

    if (activeFilter === 'active') {
      list = list.filter((managedUser) => managedUser.is_active);
    } else if (activeFilter === 'inactive') {
      list = list.filter((managedUser) => !managedUser.is_active);
    }

    if (searchQuery.trim()) {
      const normalizedQuery = searchQuery.toLowerCase().trim();
      list = list.filter(
        (managedUser) =>
          getUserFullName(managedUser).toLowerCase().includes(normalizedQuery) ||
          managedUser.email.toLowerCase().includes(normalizedQuery),
      );
    }

    return list;
  }, [allUsers, roleFilter, activeFilter, searchQuery]);

  const { pageItems: pagedUsers, currentPage, setCurrentPage, totalPages } = usePagination(filteredUsers);

  // ── Mutations ──

  const toggleActiveMutation = useMutation({
    mutationFn: ({ userId, isActive }: { userId: number; isActive: boolean }) =>
      authService.updateUserIsActive(userId, isActive),
    onMutate: ({ userId }) => setPendingToggleUserId(userId),
    onSuccess: (updatedUser) => {
      queryClient.setQueryData<ManagedUser[]>(['admin-users'], (previous) =>
        previous?.map((managedUser) =>
          managedUser.id === updatedUser.id
            ? { ...managedUser, is_active: updatedUser.is_active }
            : managedUser,
        ) ?? [],
      );
      toast({
        title: updatedUser.is_active ? 'Compte activé' : 'Compte désactivé',
        description: `Le compte ${updatedUser.email} a été ${updatedUser.is_active ? 'activé' : 'désactivé'}.`,
      });
    },
    onError: () => {
      toast({ title: 'Erreur', description: "Impossible de modifier le statut.", variant: 'destructive' });
    },
    onSettled: () => setPendingToggleUserId(null),
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: number; role: string }) =>
      authService.updateUserRole(userId, role),
    onMutate: ({ userId }) => setPendingRoleUserId(userId),
    onSuccess: (updatedUser) => {
      queryClient.setQueryData<ManagedUser[]>(['admin-users'], (previous) =>
        previous?.map((managedUser) =>
          managedUser.id === updatedUser.id
            ? { ...managedUser, role: updatedUser.role }
            : managedUser,
        ) ?? [],
      );
      setChangeRoleTargetUser(null);
      toast({
        title: 'Rôle mis à jour',
        description: `Le rôle de ${updatedUser.email} a été changé en ${getRoleLabel(updatedUser.role)}.`,
      });
    },
    onError: () => {
      toast({ title: 'Erreur', description: "Impossible de modifier le rôle.", variant: 'destructive' });
    },
    onSettled: () => setPendingRoleUserId(null),
  });

  // ── Stats ──

  const activeCount = allUsers.filter((managedUser) => managedUser.is_active).length;
  const inactiveCount = allUsers.length - activeCount;
  const adminCount = allUsers.filter((managedUser) => managedUser.role === 'ADMIN').length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col gap-1"
        >
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Gestion des utilisateurs
              </h1>
              <p className="text-sm text-muted-foreground">
                Activez, désactivez et modifiez les rôles des comptes
              </p>
            </div>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="grid grid-cols-2 gap-3 sm:grid-cols-4"
        >
          {[
            { label: 'Total', value: allUsers.length, color: 'text-foreground' },
            { label: 'Actifs', value: activeCount, color: 'text-emerald-600 dark:text-emerald-400' },
            { label: 'Désactivés', value: inactiveCount, color: 'text-red-600 dark:text-red-400' },
            { label: 'Admins', value: adminCount, color: 'text-primary' },
          ].map((stat) => (
            <Card key={stat.label}>
              <CardContent className="p-4 text-center">
                <p className={cn('text-2xl font-bold', stat.color)}>{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Card>
            <CardHeader className="pb-3 pt-4">
              <CardTitle className="text-sm font-semibold">Filtres</CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Nom ou email..."
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    className="pl-8"
                  />
                </div>

                {/* Role filter */}
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Tous les rôles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les rôles</SelectItem>
                    {ROLE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Active filter */}
                <Select value={activeFilter} onValueChange={setActiveFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Tous les statuts" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les statuts</SelectItem>
                    <SelectItem value="active">
                      <span className="flex items-center gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Actifs
                      </span>
                    </SelectItem>
                    <SelectItem value="inactive">
                      <span className="flex items-center gap-2">
                        <XCircle className="h-3.5 w-3.5 text-red-500" /> Désactivés
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Users list */}
        <div>
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
              <span className="ml-3 text-muted-foreground">Chargement des utilisateurs...</span>
            </div>
          ) : filteredUsers.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 py-20 text-center"
            >
              <Users className="mb-3 h-10 w-10 text-muted-foreground/40" />
              <p className="font-medium text-muted-foreground">Aucun utilisateur trouvé</p>
              <p className="mt-1 text-sm text-muted-foreground/60">Modifiez vos filtres.</p>
            </motion.div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {filteredUsers.length} utilisateur{filteredUsers.length > 1 ? 's' : ''} trouvé{filteredUsers.length > 1 ? 's' : ''}
              </p>
              {pagedUsers.map((managedUser, index) => (
                <motion.div
                  key={managedUser.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: index * 0.03 }}
                >
                  <UserRowCard
                    managedUser={managedUser}
                    currentUserId={currentUser?.id ?? -1}
                    isTogglePending={pendingToggleUserId === managedUser.id}
                    isRolePending={pendingRoleUserId === managedUser.id}
                    onToggleActive={(user) =>
                      toggleActiveMutation.mutate({ userId: user.id, isActive: !user.is_active })
                    }
                    onChangeRole={(user) => {
                      setChangeRoleTargetUser(user);
                    }}
                  />
                </motion.div>
              ))}
              <DataPagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                className="pt-2"
              />
            </div>
          )}
        </div>
      </div>

      {/* Change Role Dialog */}
      <ChangeRoleDialog
        targetUser={changeRoleTargetUser}
        isOpen={changeRoleTargetUser !== null}
        onClose={() => setChangeRoleTargetUser(null)}
        onConfirm={(userId, newRole) => updateRoleMutation.mutate({ userId, role: newRole })}
        isPending={updateRoleMutation.isPending}
      />
    </DashboardLayout>
  );
}
