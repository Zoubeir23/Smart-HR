import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { leaveService } from '@/services/leaveService';
import { useToast } from '@/hooks/use-toast';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAuth } from '@/context/AuthContext';
import { Calendar, List, Plus, Check, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

type LeaveStatus = 'pending' | 'approved' | 'rejected';

type LeaveItem = {
  id: number;
  start_date?: string;
  startDate?: string;
  end_date?: string;
  endDate?: string;
  leave_type?: string;
  type?: string;
  status?: string;
  employee_name?: string;
  employee?: { first_name?: string; last_name?: string } | string;
};

const MONTH_LABELS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

const LEAVE_TYPE_LABELS: Record<string, string> = {
  vacation: 'Vacances',
  sick: 'Maladie',
  personal: 'Personnel',
  maternity: 'Maternité',
  other: 'Autre',
};

const STATUS_CHIP: Record<LeaveStatus, string> = {
  approved: 'bg-success/15 text-success border-success/30',
  pending: 'bg-warning/15 text-warning border-warning/30',
  rejected: 'bg-destructive/10 text-destructive border-destructive/30',
};

const toLocalDate = (value?: string): Date | null => (value ? new Date(`${value}T00:00:00`) : null);
const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/** Grille de 6 semaines (42 jours), démarrant le lundi, pour le mois donné. */
const buildMonthGrid = (month: Date): Date[] => {
  const firstOfMonth = new Date(month.getFullYear(), month.getMonth(), 1);
  const mondayOffset = (firstOfMonth.getDay() + 6) % 7;
  const gridStart = new Date(firstOfMonth);
  gridStart.setDate(firstOfMonth.getDate() - mondayOffset);
  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(gridStart);
    day.setDate(gridStart.getDate() + index);
    return day;
  });
};

const LeaveListPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [calendarMonth, setCalendarMonth] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newLeave, setNewLeave] = useState({
    leave_type: '',
    start_date: '',
    end_date: '',
    reason: '',
  });

  const queryClient = useQueryClient();
  const todayISO = new Date().toISOString().split('T')[0];

  const validateLeaveForm = (): boolean => {
    if (!newLeave.leave_type) {
      toast({ title: 'Champ requis', description: 'Veuillez sélectionner un type de congé.', variant: 'destructive' });
      return false;
    }
    if (!newLeave.start_date) {
      toast({ title: 'Champ requis', description: 'Veuillez saisir une date de début.', variant: 'destructive' });
      return false;
    }
    if (newLeave.start_date < todayISO) {
      toast({ title: 'Date invalide', description: 'La date de début ne peut pas être dans le passé.', variant: 'destructive' });
      return false;
    }
    if (!newLeave.end_date) {
      toast({ title: 'Champ requis', description: 'Veuillez saisir une date de fin.', variant: 'destructive' });
      return false;
    }
    if (newLeave.end_date < newLeave.start_date) {
      toast({ title: 'Date invalide', description: 'La date de fin doit être égale ou postérieure à la date de début.', variant: 'destructive' });
      return false;
    }
    return true;
  };

  const { data: leavesData, isLoading } = useQuery({
    queryKey: ['leaves'],
    queryFn: () => leaveService.getAll(),
  });
  const leaves = leavesData?.results || leavesData || [];

  const createLeaveMutation = useMutation({
    mutationFn: (leaveData: { leave_type: string; start_date: string; end_date: string; reason: string }) =>
      leaveService.create(leaveData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leaves'] });
      setIsDialogOpen(false);
      setNewLeave({ leave_type: '', start_date: '', end_date: '', reason: '' });
      toast({
        title: 'Demande envoyée',
        description: 'Votre demande de congé a été soumise avec succès.',
      });
    },
    onError: () => {
      toast({
        title: 'Erreur',
        description: 'Impossible de créer la demande. Veuillez réessayer.',
        variant: 'destructive',
      });
    },
  });

  const approveMutation = useMutation({
    mutationFn: (id: number) => leaveService.approve(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leaves'] });
      toast({
        title: 'Congé approuvé',
        description: 'La demande de congé a été approuvée.',
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (id: number) => leaveService.reject(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leaves'] });
      toast({
        title: 'Congé refusé',
        description: 'La demande de congé a été refusée.',
      });
    },
  });

  const handleApprove = (id: number) => {
    approveMutation.mutate(id);
  };

  const handleReject = (id: number) => {
    rejectMutation.mutate(id);
  };

  const getStatusBadge = (status: LeaveStatus) => {
    if (status === 'approved') return <Badge variant="success">Approuvé</Badge>;
    if (status === 'rejected') return <Badge variant="inactive">Rejeté</Badge>;
    return <Badge variant="warning">En attente</Badge>;
  };

  const getLeaveName = (leave: LeaveItem): string => {
    if (typeof leave.employee === 'string') return leave.employee;
    if (leave.employee_name) return leave.employee_name;
    const first = leave.employee?.first_name ?? '';
    const last = leave.employee?.last_name ?? '';
    return `${first} ${last}`.trim();
  };

  const leavesForDay = (day: Date): LeaveItem[] => {
    const target = new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime();
    return (leaves as LeaveItem[]).filter((leave) => {
      const start = toLocalDate(leave.start_date || leave.startDate);
      const end = toLocalDate(leave.end_date || leave.endDate) || start;
      if (!start || !end) return false;
      const startTime = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
      const endTime = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime();
      return target >= startTime && target <= endTime;
    });
  };

  return (
    <DashboardLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-6"
      >
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Gestion des Congés</h1>
            <p className="text-muted-foreground mt-1">
              Gérez les demandes de congés de votre équipe
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary text-primary-foreground">
                <Plus className="mr-2 h-4 w-4" />
                Nouvelle demande
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Nouvelle demande de congé</DialogTitle>
                <DialogDescription>
                  Remplissez le formulaire pour soumettre votre demande
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="type">Type de congé</Label>
                  <Select
                    value={newLeave.leave_type}
                    onValueChange={(value) => setNewLeave({ ...newLeave, leave_type: value })}
                  >
                    <SelectTrigger id="type">
                      <SelectValue placeholder="Sélectionnez un type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vacation">Vacances</SelectItem>
                      <SelectItem value="sick">Maladie</SelectItem>
                      <SelectItem value="personal">Personnel</SelectItem>
                      <SelectItem value="maternity">Maternité</SelectItem>
                      <SelectItem value="other">Autre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="start-date">Date de début</Label>
                  <Input
                    id="start-date"
                    type="date"
                    min={todayISO}
                    value={newLeave.start_date}
                    onChange={(e) => setNewLeave({ ...newLeave, start_date: e.target.value, end_date: '' })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="end-date">Date de fin</Label>
                  <Input
                    id="end-date"
                    type="date"
                    min={newLeave.start_date || todayISO}
                    value={newLeave.end_date}
                    onChange={(e) => setNewLeave({ ...newLeave, end_date: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="reason">Motif</Label>
                  <Textarea
                    id="reason"
                    placeholder="Décrivez brièvement la raison de votre demande"
                    rows={4}
                    value={newLeave.reason}
                    onChange={(e) => setNewLeave({ ...newLeave, reason: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Annuler
                </Button>
                <Button
                  className="bg-primary text-primary-foreground"
                  onClick={() => { if (validateLeaveForm()) createLeaveMutation.mutate(newLeave); }}
                  disabled={createLeaveMutation.isPending}
                >
                  {createLeaveMutation.isPending ? 'Soumission...' : 'Soumettre'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* View Mode Toggle */}
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
              className={viewMode === 'list' ? 'bg-primary text-primary-foreground' : ''}
            >
              <List className="mr-2 h-4 w-4" />
              Liste
            </Button>
            <Button
              variant={viewMode === 'calendar' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('calendar')}
              className={viewMode === 'calendar' ? 'bg-primary text-primary-foreground' : ''}
            >
              <Calendar className="mr-2 h-4 w-4" />
              Calendrier
            </Button>
          </div>
        </Card>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center space-y-3">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
              <p className="text-muted-foreground">Chargement...</p>
            </div>
          </div>
        ) : viewMode === 'list' ? (
          <Card>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Employé</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Dates</TableHead>
                    <TableHead>Durée</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaves.map((leave: { id: number; start_date?: string; startDate?: string; end_date?: string; endDate?: string; leave_type?: string; type?: string; employee?: { first_name?: string; last_name?: string } | string; employee_name?: string; duration?: number; status?: string; reason?: string }) => {
                    const startDate = leave.start_date || leave.startDate;
                    const endDate = leave.end_date || leave.endDate;
                    const leaveType = leave.leave_type || leave.type;
                    const employeeName = typeof leave.employee === 'object'
                      ? `${leave.employee.first_name || ''} ${leave.employee.last_name || ''}`.trim()
                      : leave.employee_name || leave.employee || '';
                    const duration = leave.duration
                      || (startDate && endDate
                        ? Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1
                        : 0);

                    return (
                    <TableRow key={leave.id}>
                      <TableCell className="font-medium">{employeeName}</TableCell>
                      <TableCell>{leaveType}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{new Date(startDate).toLocaleDateString('fr-FR')}</div>
                          <div className="text-muted-foreground">
                            au {new Date(endDate).toLocaleDateString('fr-FR')}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{duration} jour{duration > 1 ? 's' : ''}</TableCell>
                      <TableCell>{getStatusBadge(leave.status)}</TableCell>
                      <TableCell className="text-right">
                        {(user?.role === 'RH' || user?.role === 'ADMIN') && leave.status === 'pending' && (
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              className="bg-success text-success-foreground hover:bg-success/90"
                              onClick={() => handleApprove(leave.id)}
                              disabled={approveMutation.isPending}
                            >
                              <Check className="mr-1 h-4 w-4" />
                              Valider
                            </Button>
                            <Button
                              size="sm"
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              onClick={() => handleReject(leave.id)}
                              disabled={rejectMutation.isPending}
                            >
                              <X className="mr-1 h-4 w-4" />
                              Refuser
                            </Button>
                          </div>
                        )}
                        {leave.status !== 'pending' && (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </Card>
        ) : (
          <Card className="p-4 sm:p-6">
            {/* Navigation mois */}
            <div className="flex items-center justify-between mb-4">
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9"
                onClick={() =>
                  setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))
                }
                aria-label="Mois précédent"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h3 className="text-sm sm:text-base font-semibold text-foreground">
                {MONTH_LABELS[calendarMonth.getMonth()]} {calendarMonth.getFullYear()}
              </h3>
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9"
                onClick={() =>
                  setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))
                }
                aria-label="Mois suivant"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid grid-cols-7 gap-1 sm:gap-2">
              {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((day) => (
                <div
                  key={day}
                  className="text-center font-semibold text-xs text-muted-foreground p-2"
                >
                  {day}
                </div>
              ))}
              {buildMonthGrid(calendarMonth).map((day, index) => {
                const inMonth = day.getMonth() === calendarMonth.getMonth();
                const isToday = isSameDay(day, new Date());
                const dayLeaves = leavesForDay(day);
                return (
                  <div
                    key={index}
                    className={cn(
                      'flex min-h-[84px] flex-col gap-1 rounded-lg border p-1.5 transition-colors',
                      inMonth ? 'border-border bg-card' : 'border-transparent bg-muted/30',
                      isToday && 'ring-2 ring-primary border-primary/40'
                    )}
                  >
                    <div
                      className={cn(
                        'text-xs font-medium',
                        inMonth ? 'text-foreground' : 'text-muted-foreground/50',
                        isToday && 'font-bold text-primary'
                      )}
                    >
                      {day.getDate()}
                    </div>
                    <div className="flex flex-col gap-0.5 overflow-hidden">
                      {dayLeaves.slice(0, 3).map((leave) => {
                        const status = (leave.status || 'pending') as LeaveStatus;
                        const name = getLeaveName(leave);
                        const typeLabel = LEAVE_TYPE_LABELS[leave.leave_type || leave.type || 'other'] ?? '';
                        return (
                          <div
                            key={leave.id}
                            className={cn(
                              'truncate rounded border px-1 py-0.5 text-[10px] font-medium',
                              STATUS_CHIP[status]
                            )}
                            title={`${name} — ${typeLabel}`}
                          >
                            {name || typeLabel}
                          </div>
                        );
                      })}
                      {dayLeaves.length > 3 && (
                        <span className="text-[10px] text-muted-foreground">
                          +{dayLeaves.length - 3}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Légende */}
            <div className="mt-4 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-success" /> Approuvé
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-warning" /> En attente
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-destructive" /> Rejeté
              </span>
            </div>
          </Card>
        )}
      </motion.div>
    </DashboardLayout>
  );
};

export default LeaveListPage;
