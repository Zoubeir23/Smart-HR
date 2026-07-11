import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Shield,
  Key,
  Activity,
  Trash2,
  RefreshCw,
  ChevronDown,
  AlertTriangle,
  CheckCircle,
  Filter,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PageHeader from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { securityService, AuditLogEntry, AuditLogFilters } from '@/services/securityService';

const ACTION_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  CREATE: { label: 'Création', variant: 'default' },
  UPDATE: { label: 'Modification', variant: 'secondary' },
  DELETE: { label: 'Suppression', variant: 'destructive' },
  LOGIN: { label: 'Connexion', variant: 'outline' },
  LOGOUT: { label: 'Déconnexion', variant: 'outline' },
  EXPORT: { label: 'Export', variant: 'secondary' },
};

const RBAC_MATRIX = [
  { role: 'Admin', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300', permissions: ['Accès complet', 'Gestion utilisateurs', 'Logs d\'audit', 'RGPD - Anonymisation'] },
  { role: 'RH', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300', permissions: ['Gestion personnel', 'Validation congés', 'Prédiction churn', 'Recrutement'] },
  { role: 'Employé', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300', permissions: ['Profil personnel', 'Congés (les siens)', 'Tâches assignées', 'Documents'] },
  { role: 'Candidat', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300', permissions: ['Offres d\'emploi', 'Candidatures (les siennes)', 'Chat IA'] },
];

function AuditLogRow({ log }: { log: AuditLogEntry }) {
  const [expanded, setExpanded] = useState(false);
  const actionMeta = ACTION_LABELS[log.action] ?? { label: log.action, variant: 'outline' as const };

  return (
    <div className="rounded-lg border border-border bg-card">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between px-4 py-3 text-left text-sm"
      >
        <div className="flex items-center gap-3">
          <Badge variant={actionMeta.variant} className="w-24 justify-center text-xs">
            {actionMeta.label}
          </Badge>
          <span className="font-medium text-foreground">{log.model_name}</span>
          {log.object_repr && (
            <span className="max-w-xs truncate text-muted-foreground">{log.object_repr}</span>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs text-muted-foreground">
            {log.performed_by ? log.performed_by.full_name || log.performed_by.email : 'Système'}
          </span>
          <span className="text-xs text-muted-foreground">
            {new Date(log.timestamp).toLocaleString('fr-FR', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </div>
      </button>
      {expanded && (
        <div className="border-t border-border px-4 py-3">
          <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
            <div>
              <span className="font-medium text-foreground">ID objet : </span>
              {log.object_id || '-'}
            </div>
            {log.performed_by && (
              <div>
                <span className="font-medium text-foreground">Rôle : </span>
                {log.performed_by.role}
              </div>
            )}
            {Object.keys(log.details).length > 0 && (
              <div className="sm:col-span-2">
                <span className="font-medium text-foreground">Détails : </span>
                <pre className="mt-1 rounded bg-muted p-2 text-xs overflow-x-auto">
                  {JSON.stringify(log.details, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface AnonymizableApplication {
  id: number;
  job_offer_title?: string;
  candidate_name?: string;
  status: string;
  anonymized: boolean;
  created_at: string;
}

interface AnonymizableEmployee {
  id: number;
  user_full_name?: string;
  matricule?: string;
  status: string;
  anonymized: boolean;
  hire_date?: string;
}

function RgpdSection() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: applicationsData, isLoading: applicationsLoading } = useQuery({
    queryKey: ['rejected-applications'],
    queryFn: securityService.getRejectedApplications,
  });

  const { data: employeesData, isLoading: employeesLoading } = useQuery({
    queryKey: ['inactive-employees'],
    queryFn: securityService.getInactiveEmployees,
  });

  const anonymizeApplicationMutation = useMutation({
    mutationFn: (applicationId: number) => securityService.anonymizeApplication(applicationId),
    onSuccess: () => {
      toast({ title: 'Candidature anonymisée avec succès.' });
      queryClient.invalidateQueries({ queryKey: ['rejected-applications'] });
    },
    onError: (error: { response?: { data?: { detail?: string } } }) => {
      toast({
        title: 'Erreur',
        description: error.response?.data?.detail ?? 'Impossible d\'anonymiser cette candidature.',
        variant: 'destructive',
      });
    },
  });

  const anonymizeEmployeeMutation = useMutation({
    mutationFn: (employeeId: number) => securityService.anonymizeEmployee(employeeId),
    onSuccess: () => {
      toast({ title: 'Données employé anonymisées avec succès.' });
      queryClient.invalidateQueries({ queryKey: ['inactive-employees'] });
    },
    onError: (error: { response?: { data?: { detail?: string } } }) => {
      toast({
        title: 'Erreur',
        description: error.response?.data?.detail ?? 'Impossible d\'anonymiser cet employé.',
        variant: 'destructive',
      });
    },
  });

  const rejectedApplications: AnonymizableApplication[] = (applicationsData as { results?: AnonymizableApplication[] })?.results ?? [];
  const inactiveEmployees: AnonymizableEmployee[] = (employeesData as { results?: AnonymizableEmployee[] })?.results ?? [];

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="text-sm text-amber-800 dark:text-amber-200">
            <p className="font-semibold">Conformité RGPD — Droit à l'oubli</p>
            <p className="mt-1 text-amber-700 dark:text-amber-300">
              L'anonymisation est irréversible. Les données personnelles (CV, coordonnées, CIN) sont supprimées.
              Seules les données statistiques (score, statut, dates) sont conservées.
            </p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Trash2 className="h-4 w-4 text-destructive" />
            Candidatures rejetées — Anonymisation
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Candidatures au statut "Rejeté" dont les données personnelles peuvent être purgées.
          </p>
        </CardHeader>
        <CardContent>
          {applicationsLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : rejectedApplications.length === 0 ? (
            <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Aucune candidature rejetée en attente d'anonymisation.
            </div>
          ) : (
            <div className="space-y-2">
              {rejectedApplications.map((application) => (
                <div
                  key={application.id}
                  className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
                >
                  <div>
                    <span className="font-medium">
                      {application.candidate_name ?? `Candidature #${application.id}`}
                    </span>
                    {application.job_offer_title && (
                      <span className="ml-2 text-muted-foreground">— {application.job_offer_title}</span>
                    )}
                    {application.anonymized && (
                      <Badge variant="secondary" className="ml-2 text-xs">Anonymisée</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {new Date(application.created_at).toLocaleDateString('fr-FR')}
                    </span>
                    {!application.anonymized && (
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={anonymizeApplicationMutation.isPending}
                        onClick={() => anonymizeApplicationMutation.mutate(application.id)}
                      >
                        <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                        Anonymiser
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Trash2 className="h-4 w-4 text-destructive" />
            Anciens employés — Anonymisation
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Employés inactifs ou avec contrat terminé dont les données personnelles peuvent être purgées.
          </p>
        </CardHeader>
        <CardContent>
          {employeesLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : inactiveEmployees.length === 0 ? (
            <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Aucun ancien employé en attente d'anonymisation.
            </div>
          ) : (
            <div className="space-y-2">
              {inactiveEmployees.map((employee) => (
                <div
                  key={employee.id}
                  className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
                >
                  <div>
                    <span className="font-medium">
                      {employee.user_full_name ?? `Employé #${employee.id}`}
                    </span>
                    {employee.matricule && (
                      <span className="ml-2 text-muted-foreground">{employee.matricule}</span>
                    )}
                    <Badge variant="outline" className="ml-2 text-xs capitalize">{employee.status}</Badge>
                    {employee.anonymized && (
                      <Badge variant="secondary" className="ml-2 text-xs">Anonymisé</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {employee.hire_date && (
                      <span className="text-xs text-muted-foreground">
                        Embauché {new Date(employee.hire_date).toLocaleDateString('fr-FR')}
                      </span>
                    )}
                    {!employee.anonymized && (
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={anonymizeEmployeeMutation.isPending}
                        onClick={() => anonymizeEmployeeMutation.mutate(employee.id)}
                      >
                        <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                        Anonymiser
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function SecurityPage() {
  const [auditFilters, setAuditFilters] = useState<AuditLogFilters>({ limit: 50 });
  const [activeTab, setActiveTab] = useState('audit');

  const { data: auditData, isLoading: auditLoading, refetch: refetchAudit } = useQuery({
    queryKey: ['audit-logs', auditFilters],
    queryFn: () => securityService.getAuditLogs(auditFilters),
    enabled: activeTab === 'audit',
  });

  const auditLogs: AuditLogEntry[] = auditData?.results ?? [];

  return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-6"
      >
        <PageHeader
          title="Sécurité & Conformité"
          description="Journal d'audit, RGPD droit à l'oubli et matrice des permissions"
        />

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid h-auto w-full grid-cols-1 sm:h-10 sm:grid-cols-3">
            <TabsTrigger value="audit" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Journal d'audit
            </TabsTrigger>
            <TabsTrigger value="rgpd" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Conformité RGPD
            </TabsTrigger>
            <TabsTrigger value="permissions" className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              Permissions RBAC
            </TabsTrigger>
          </TabsList>

          <TabsContent value="audit" className="mt-6 space-y-4">
            <div className="flex items-center gap-3">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select
                value={auditFilters.action ?? 'all'}
                onValueChange={(value) =>
                  setAuditFilters((prev) => ({ ...prev, action: value === 'all' ? undefined : value }))
                }
              >
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="Toutes les actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les actions</SelectItem>
                  {Object.entries(ACTION_LABELS).map(([key, meta]) => (
                    <SelectItem key={key} value={key}>{meta.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={() => refetchAudit()}>
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                Actualiser
              </Button>
              <span className="ml-auto text-sm text-muted-foreground">
                {auditData?.returned ?? 0} / {auditData?.count ?? 0} entrées
              </span>
            </div>

            {auditLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
              </div>
            ) : auditLogs.length === 0 ? (
              <div className="rounded-lg border border-border py-12 text-center text-muted-foreground">
                Aucun log d'audit disponible.
              </div>
            ) : (
              <div className="space-y-2">
                {auditLogs.map((log) => <AuditLogRow key={log.id} log={log} />)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="rgpd" className="mt-6">
            <RgpdSection />
          </TabsContent>

          <TabsContent value="permissions" className="mt-6">
            <div className="grid gap-4 sm:grid-cols-2">
              {RBAC_MATRIX.map((rbac) => (
                <Card key={rbac.role}>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <span className={`rounded-md px-2 py-0.5 text-sm font-semibold ${rbac.color}`}>
                        {rbac.role}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-1.5">
                      {rbac.permissions.map((permission) => (
                        <li key={permission} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <CheckCircle className="h-3.5 w-3.5 shrink-0 text-green-500" />
                          {permission}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </motion.div>
  );
}
