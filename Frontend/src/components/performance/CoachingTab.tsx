import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Users, Plus, X, CheckCircle2, Ban } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import SearchableSelect from '@/components/common/SearchableSelect';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { performanceService, type CoachingSession } from '@/services/performanceService';
import { employeeService } from '@/services/employeeService';

interface EmployeeOption {
  id: number;
  user_full_name: string;
}

const STATUS_BADGE_STYLES: Record<string, string> = {
  scheduled: 'bg-warning/20 text-warning border-warning/30',
  completed: 'bg-success/20 text-success border-success/30',
  cancelled: 'bg-muted text-muted-foreground',
};

export default function CoachingTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const canManage = user?.role === 'RH' || user?.role === 'ADMIN';

  const [showForm, setShowForm] = useState(false);
  const [coach, setCoach] = useState('');
  const [coachee, setCoachee] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [topic, setTopic] = useState('');
  const [notes, setNotes] = useState('');

  const { data: sessionsData, isLoading } = useQuery({
    queryKey: ['coaching-sessions'],
    queryFn: () => performanceService.getAllCoachingSessions(),
  });
  const sessions: CoachingSession[] = sessionsData?.results ?? sessionsData ?? [];

  const { data: employeesData } = useQuery({
    queryKey: ['employees', 'all'],
    queryFn: () => employeeService.getAll(),
    enabled: canManage,
  });
  const employees: EmployeeOption[] = employeesData?.results ?? employeesData ?? [];

  const createMutation = useMutation({
    mutationFn: performanceService.createCoachingSession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coaching-sessions'] });
      toast({ title: 'Session de coaching planifiée' });
      resetForm();
    },
    onError: () => {
      toast({ title: 'Erreur', description: 'Impossible de planifier cette session.', variant: 'destructive' });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => performanceService.updateCoachingSession(id, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['coaching-sessions'] }),
    onError: () => {
      toast({ title: 'Erreur', description: 'Impossible de mettre à jour le statut.', variant: 'destructive' });
    },
  });

  function resetForm() {
    setShowForm(false);
    setCoach('');
    setCoachee('');
    setScheduledAt('');
    setTopic('');
    setNotes('');
  }

  function handleSubmit() {
    if (!coach || !coachee || !scheduledAt || !topic.trim()) {
      toast({ title: 'Champs requis', description: 'Coach, coaché, date et sujet sont requis.', variant: 'destructive' });
      return;
    }
    createMutation.mutate({
      coach: Number(coach),
      coachee: Number(coachee),
      scheduled_at: new Date(scheduledAt).toISOString(),
      topic: topic.trim(),
      notes: notes.trim(),
    });
  }

  const employeeOptions = employees.map((e) => ({ value: String(e.id), label: e.user_full_name }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Sessions de coaching individuel (one-to-one)</p>
        {canManage && (
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowForm((prev) => !prev)}>
            {showForm ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
            {showForm ? 'Annuler' : 'Planifier une session'}
          </Button>
        )}
      </div>

      {showForm && (
        <Card className="border border-border">
          <CardContent className="space-y-3 p-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Coach</Label>
                <SearchableSelect options={employeeOptions} value={coach} onChange={setCoach} placeholder="Choisir le coach" />
              </div>
              <div className="space-y-1">
                <Label>Coaché</Label>
                <SearchableSelect options={employeeOptions} value={coachee} onChange={setCoachee} placeholder="Choisir le coaché" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Date et heure</Label>
                <Input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Sujet</Label>
                <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Ex: Prise de poste manager" />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Notes (optionnel)</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
            </div>
            <Button size="sm" onClick={handleSubmit} disabled={createMutation.isPending}>
              Planifier
            </Button>
          </CardContent>
        </Card>
      )}

      {isLoading && <p className="py-6 text-center text-sm text-muted-foreground">Chargement…</p>}

      {!isLoading && sessions.length === 0 && !showForm && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-12 text-center">
          <Users className="h-8 w-8 text-muted-foreground/40" />
          <p className="mt-3 text-sm text-muted-foreground">Aucune session de coaching planifiée.</p>
        </div>
      )}

      <div className="space-y-3">
        {sessions.map((session) => (
          <Card key={session.id} className="border border-border">
            <CardContent className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">{session.topic}</p>
                <p className="text-xs text-muted-foreground">
                  {session.coach_name} → {session.coachee_name} · {new Date(session.scheduled_at).toLocaleString('fr-FR')}
                </p>
                {session.notes && <p className="mt-1 text-xs text-muted-foreground">{session.notes}</p>}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={STATUS_BADGE_STYLES[session.status]}>
                  {session.status_display}
                </Badge>
                {canManage && session.status === 'scheduled' && (
                  <>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-success hover:text-success"
                      onClick={() => updateStatusMutation.mutate({ id: session.id, status: 'completed' })}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => updateStatusMutation.mutate({ id: session.id, status: 'cancelled' })}
                    >
                      <Ban className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
