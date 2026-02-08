import { motion } from 'framer-motion';
import { Shield, Key, LogIn, AlertCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import DashboardLayout from '@/components/layout/DashboardLayout';
import PageHeader from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { authService } from '@/services/authService';

/**
 * Page Sécurité — Admin uniquement
 * Logs, gestion des accès, RBAC
 */
export default function SecurityPage() {
  const { data: adminStats, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: authService.getAdminStats,
  });

  return (
    <DashboardLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-6"
      >
        <PageHeader
          title="Sécurité"
          description="Logs système, historique des actions et gestion des accès"
        />

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LogIn className="h-5 w-5" />
                Connexions récentes
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Dernières authentifications
              </p>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {adminStats?.recent_activity?.slice(0, 10).map((log: any, i: number) => (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
                    >
                      <div>
                        <span className="font-medium">{log.action}</span>
                        <span className="mx-2 text-muted-foreground">—</span>
                        <span>{log.user}</span>
                        {log.role && (
                          <Badge variant="outline" className="ml-2 text-xs">
                            {log.role}
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {log.time ? new Date(log.time).toLocaleString('fr-FR', {
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
                <Key className="h-5 w-5" />
                Permissions RBAC
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Matrice des rôles et accès
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span>Admin</span>
                  <Badge variant="default">Accès complet</Badge>
                </div>
                <div className="flex justify-between">
                  <span>RH</span>
                  <Badge variant="secondary">Gestion RH</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Employé</span>
                  <Badge variant="outline">Profil + Congés</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Candidat</span>
                  <Badge variant="outline">Offres + Candidatures</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.div>
    </DashboardLayout>
  );
}
