import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { HeartHandshake, Send } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  distressAlertService, DISTRESS_ALERT_STATUS_OPTIONS, type DistressAlert, type DistressAlertStatus,
} from '@/services/communicationService';

interface DistressAlertsTabProps {
  canManage: boolean;
}

const STATUS_BADGE_STYLES: Record<DistressAlertStatus, string> = {
  new: 'bg-destructive/10 text-destructive border-destructive/30',
  acknowledged: 'bg-warning/20 text-warning border-warning/30',
  in_progress: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200',
  resolved: 'bg-success/20 text-success border-success/30',
};

export default function DistressAlertsTab({ canManage }: DistressAlertsTabProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [message, setMessage] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data, isLoading } = useQuery({
    queryKey: ['distress-alerts', statusFilter],
    queryFn: () => distressAlertService.getAll(statusFilter !== 'all' ? { status: statusFilter as DistressAlertStatus } : undefined),
  });
  const alerts: DistressAlert[] = data?.results ?? data ?? [];

  const createMutation = useMutation({
    mutationFn: distressAlertService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['distress-alerts'] });
      toast({ title: 'Alerte envoyée', description: 'Votre alerte a été transmise aux RH.' });
      setMessage('');
    },
    onError: () => toast({ title: 'Erreur', description: "Impossible d'envoyer l'alerte.", variant: 'destructive' }),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: DistressAlertStatus }) => distressAlertService.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['distress-alerts'] });
      toast({ title: 'Statut mis à jour' });
    },
    onError: () => toast({ title: 'Erreur', description: 'Impossible de mettre à jour le statut.', variant: 'destructive' }),
  });

  return (
    <div className="space-y-4">
      {!canManage && (
        <Card className="border border-dashed border-destructive/40 bg-destructive/5">
          <CardContent className="space-y-3 p-4">
            <p className="text-sm font-medium text-foreground">Vous vous sentez en détresse au travail ?</p>
            <p className="text-xs text-muted-foreground">
              Cette alerte est transmise confidentiellement aux RH, qui en assurent le suivi jusqu'à résolution.
            </p>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Décrivez votre situation (optionnel)…"
              rows={3}
            />
            <Button
              size="sm"
              variant="destructive"
              className="gap-1.5"
              onClick={() => createMutation.mutate(message.trim())}
              disabled={createMutation.isPending}
            >
              <Send className="h-3.5 w-3.5" />
              Envoyer l'alerte
            </Button>
          </CardContent>
        </Card>
      )}

      {canManage && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Suivi des alertes de détresse déclenchées par les employés</p>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              {DISTRESS_ALERT_STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {isLoading && <p className="py-6 text-center text-sm text-muted-foreground">Chargement…</p>}

      {!isLoading && alerts.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-12 text-center">
          <HeartHandshake className="h-8 w-8 text-muted-foreground/40" />
          <p className="mt-3 text-sm text-muted-foreground">Aucune alerte pour le moment.</p>
        </div>
      )}

      <div className="space-y-3">
        {alerts.map((alert) => (
          <Card key={alert.id} className="border border-border">
            <CardContent className="space-y-2 p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  {canManage && <p className="text-sm font-semibold text-foreground">{alert.employee_name}</p>}
                  <p className="text-xs text-muted-foreground">{new Date(alert.created_at).toLocaleString('fr-FR')}</p>
                </div>
                <Badge variant="outline" className={STATUS_BADGE_STYLES[alert.status]}>
                  {alert.status_display}
                </Badge>
              </div>
              {alert.message && <p className="text-sm text-foreground">{alert.message}</p>}
              {alert.handled_by_name && alert.handled_by_name !== '—' && (
                <p className="text-xs text-muted-foreground">Pris en charge par {alert.handled_by_name}</p>
              )}

              {canManage && alert.status !== 'resolved' && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {alert.status === 'new' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateStatusMutation.mutate({ id: alert.id, status: 'acknowledged' })}
                    >
                      Prendre en compte
                    </Button>
                  )}
                  {alert.status !== 'in_progress' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateStatusMutation.mutate({ id: alert.id, status: 'in_progress' })}
                    >
                      Mettre en traitement
                    </Button>
                  )}
                  <Button size="sm" onClick={() => updateStatusMutation.mutate({ id: alert.id, status: 'resolved' })}>
                    Marquer résolu
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
