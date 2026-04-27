import { motion } from 'framer-motion';
import {
  Users,
  Shield,
  Settings,
  Activity,
  UserPlus,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Loader2,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import PageHeader from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { authService } from '@/services/authService';

/**
 * Dashboard Admin — Vue système, sécurité, utilisateurs
 */
export default function AdminDashboard() {
  const { user } = useAuth();

  // Fetch admin stats from API
  const { data: adminStats, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: authService.getAdminStats,
    enabled: user?.role === 'ADMIN',
  });

  const quickActions = [
    {
      title: 'Gestion des utilisateurs',
      description: 'Créer, modifier, supprimer des comptes',
      href: '/settings',
      icon: Users,
    },
    {
      title: 'Sécurité & Logs',
      description: 'Historique des actions, accès',
      href: '/security',
      icon: Shield,
    },
    {
      title: 'Paramètres système',
      description: 'Configuration globale',
      href: '/settings',
      icon: Settings,
    },
  ];

  return (
    <DashboardLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-6"
      >
        <PageHeader
          title={`Bienvenue, ${user?.first_name} 👋`}
          description="Tableau de bord administrateur — Supervision système et sécurité"
          actions={
            <Button asChild>
              <Link to="/employees">
                <UserPlus className="mr-2 h-4 w-4" />
                Nouvel employé
              </Link>
            </Button>
          }
        />

        {/* Cartes d'actions rapides */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Card
                key={action.title}
                className="group cursor-pointer border-border transition-all hover:border-secondary/30 hover:shadow-md"
              >
                <Link to={action.href} className="block">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary/10">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
                  </CardHeader>
                  <CardContent>
                    <CardTitle className="text-base">{action.title}</CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {action.description}
                    </p>
                  </CardContent>
                </Link>
              </Card>
            );
          })}
        </div>

        {/* Alertes système & Statistiques */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Activité récente
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Dernières connexions
              </p>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {adminStats?.recent_activity?.slice(0, 5).map((item: { action: string; user: string; role: string; time: string | null }, i: number) => (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2"
                    >
                      <div>
                        <span className="text-sm font-medium">{item.action}</span>
                        <span className="mx-2 text-muted-foreground">—</span>
                        <span className="text-sm text-muted-foreground">{item.user}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {item.time ? new Date(item.time).toLocaleString('fr-FR', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        }) : 'N/A'}
                      </span>
                    </div>
                  )) ?? (
                    <p className="text-center text-sm text-muted-foreground py-4">
                      Aucune activité récente
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Vue d'ensemble
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Statistiques système
              </p>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="grid grid-cols-2 gap-4">
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg border border-border p-4">
                    <p className="text-2xl font-bold">{adminStats?.active_roles ?? 0}</p>
                    <p className="text-sm text-muted-foreground">Rôles actifs</p>
                  </div>
                  <div className="rounded-lg border border-border p-4">
                    <p className="text-2xl font-bold">{adminStats?.total_users ?? 0}</p>
                    <p className="text-sm text-muted-foreground">Utilisateurs</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </motion.div>
    </DashboardLayout>
  );
}
