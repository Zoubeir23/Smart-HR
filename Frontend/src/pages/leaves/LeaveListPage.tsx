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
import { Calendar, List, Plus, Check, X, TrendingUp, CalendarDays, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

type LeaveStatus = 'pending' | 'approved' | 'rejected';

const LeaveListPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newLeave, setNewLeave] = useState({
    leave_type: '',
    start_date: '',
    end_date: '',
    reason: '',
  });

  const queryClient = useQueryClient();

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
    const variants = {
      pending: 'bg-warning text-warning-foreground',
      approved: 'bg-success text-success-foreground',
      rejected: 'bg-destructive text-destructive-foreground',
    };

    const labels = {
      pending: 'En attente',
      approved: 'Approuvé',
      rejected: 'Rejeté',
    };

    return (
      <Badge className={variants[status]}>
        {labels[status]}
      </Badge>
    );
  };

  return (
    <DashboardLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-6"
      >
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div>
            <h2 className="text-3xl font-extrabold text-foreground tracking-tight">Gestion des Congés</h2>
            <p className="text-muted-foreground mt-1">
              Supervisez les absences et validez les demandes de votre équipe.
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary text-primary-foreground shadow-sm hover:shadow-md transition-shadow">
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
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="start_date">Date de début</Label>
                    <Input
                      id="start_date"
                      type="date"
                      value={newLeave.start_date}
                      onChange={(e) => setNewLeave({ ...newLeave, start_date: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="end_date">Date de fin</Label>
                    <Input
                      id="end_date"
                      type="date"
                      value={newLeave.end_date}
                      onChange={(e) => setNewLeave({ ...newLeave, end_date: e.target.value })}
                    />
                  </div>
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
                  onClick={() => createLeaveMutation.mutate(newLeave)}
                  disabled={createLeaveMutation.isPending || !newLeave.leave_type || !newLeave.start_date || !newLeave.end_date}
                >
                  {createLeaveMutation.isPending ? 'Soumission...' : 'Soumettre'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {/* Card 1: Total */}
          <div className="bg-card p-6 rounded-2xl shadow-sm border border-border">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Total des congés pris</span>
            <div className="flex items-baseline gap-4 mt-4">
              <span className="text-5xl font-extrabold text-primary">142</span>
              <div className="flex items-center text-success text-xs font-bold bg-success/10 px-2 py-1 rounded-full">
                <TrendingUp className="text-sm mr-1 h-4 w-4" />
                +12%
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground mt-4 italic font-medium">Cumulé depuis le début du mois</p>
          </div>

          {/* Card 2: Pending */}
          <div className="bg-card p-6 rounded-2xl shadow-sm border border-border">
            <div className="flex justify-between items-start">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Demandes en attente</span>
              <span className="bg-destructive/10 text-destructive text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-tight">Action requise</span>
            </div>
            <div className="mt-4 flex items-center gap-6">
              <span className="text-5xl font-extrabold text-foreground">
                {leaves.filter((l: any) => l.status === 'pending').length.toString().padStart(2, '0')}
              </span>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-primary"></div>
                  <span className="text-[11px] text-muted-foreground font-medium">Congés Payés</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-warning"></div>
                  <span className="text-[11px] text-muted-foreground font-medium">Maladie / Personnel</span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: Holidays */}
          <div className="bg-primary text-primary-foreground p-6 rounded-2xl shadow-lg relative overflow-hidden">
            <div className="relative z-10 h-full flex flex-col justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-primary-foreground/80">Prochains jours fériés</span>
              <div className="mt-4 space-y-2.5">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold">Toussaint</span>
                  <span className="text-[10px] font-bold bg-white/20 px-2 py-1 rounded">1 NOV</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold">Armistice 1918</span>
                  <span className="text-[10px] font-bold bg-white/20 px-2 py-1 rounded">11 NOV</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold">Noël</span>
                  <span className="text-[10px] font-bold bg-white/20 px-2 py-1 rounded">25 DÉC</span>
                </div>
              </div>
            </div>
            <div className="absolute -right-6 -bottom-6 opacity-10">
              <CalendarDays className="w-32 h-32" />
            </div>
          </div>
        </div>

        {/* View Selection & Filters */}
        <Card className="p-4 mb-6">
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
        ) : (
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
          {/* Calendar Column */}
          <div className="xl:col-span-3">
            {viewMode === 'list' ? (
              <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-muted/40">
                        <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Employé</th>
                        <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Type</th>
                        <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Dates</th>
                        <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Durée</th>
                        <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Statut</th>
                        <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {leaves.map((leave: any) => {
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
                          <tr key={leave.id} className="hover:bg-muted/30 transition-colors">
                            <td className="px-6 py-4 font-medium text-sm">{employeeName}</td>
                            <td className="px-6 py-4 text-sm">{leaveType}</td>
                            <td className="px-6 py-4 text-sm">
                              <div>{new Date(startDate).toLocaleDateString('fr-FR')}</div>
                              <div className="text-muted-foreground text-xs">
                                au {new Date(endDate).toLocaleDateString('fr-FR')}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm">{duration} jour{duration > 1 ? 's' : ''}</td>
                            <td className="px-6 py-4">{getStatusBadge(leave.status)}</td>
                            <td className="px-6 py-4 text-right">
                              {user?.role === 'rh' && leave.status === 'pending' && (
                                <div className="flex justify-end gap-2">
                                  <Button
                                    size="sm"
                                    className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 shadow-none border border-emerald-500/20"
                                    onClick={() => handleApprove(leave.id)}
                                    disabled={approveMutation.isPending}
                                  >
                                    <Check className="mr-1 h-3 w-3" />
                                    Valider
                                  </Button>
                                  <Button
                                    size="sm"
                                    className="bg-red-500/10 text-red-600 hover:bg-red-500/20 shadow-none border border-red-500/20"
                                    onClick={() => handleReject(leave.id)}
                                    disabled={rejectMutation.isPending}
                                  >
                                    <X className="mr-1 h-3 w-3" />
                                    Refuser
                                  </Button>
                                </div>
                              )}
                              {leave.status !== 'pending' && (
                                <span className="text-xs text-muted-foreground">-</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                      {leaves.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">Aucune demande trouvée</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
            <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
              <div className="p-6 flex flex-wrap justify-between items-center gap-4 border-b border-border/50">
                <div className="flex items-center gap-4">
                  <h3 className="text-xl font-bold text-foreground">Octobre 2024</h3>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:bg-muted">
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:bg-muted">
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-primary"></span>
                    <span className="text-xs font-semibold text-muted-foreground">Congés</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-secondary"></span>
                    <span className="text-xs font-semibold text-muted-foreground">Personnel</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-destructive/40"></span>
                    <span className="text-xs font-semibold text-muted-foreground">Maladie</span>
                  </div>
                </div>
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-[1px] bg-muted border-b border-border">
                {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((day) => (
                  <div key={day} className="bg-card py-3 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    {day}
                  </div>
                ))}

                {/* Placeholder calendar content until wired to real leave data */}
                <div className="col-span-7 h-40 flex flex-col items-center justify-center bg-muted/40 text-center px-4">
                  <p className="text-xs font-semibold text-muted-foreground tracking-wide uppercase">
                    Vue calendrier à venir
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground/80">
                    Cette vue sera bientôt reliée aux demandes de congés réelles.
                  </p>
                </div>
              </div>
            </div>
            )}
          </div>

          {/* Approvals Column */}
          <div className="xl:col-span-1 flex flex-col gap-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-foreground">Demandes en attente</h3>
              <button className="text-primary text-[11px] font-bold hover:underline uppercase tracking-tight" onClick={() => setViewMode('list')}>Voir tout</button>
            </div>

            <div className="space-y-4 max-h-[calc(100vh-250px)] overflow-y-auto pr-2 custom-scrollbar">
              {leaves.filter((l: any) => l.status === 'pending').map((leave: any) => {
                const startDate = leave.start_date || leave.startDate;
                const endDate = leave.end_date || leave.endDate;
                const employeeName = typeof leave.employee === 'object'
                  ? `${leave.employee.first_name || ''} ${leave.employee.last_name || ''}`.trim()
                  : leave.employee_name || leave.employee || 'Employé inconnu';

                return (
                  <div key={leave.id} className="bg-card p-5 rounded-2xl shadow-sm border border-border hover:border-primary/30 transition-all">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                        {employeeName.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-foreground">{employeeName}</h4>
                        <p className="text-[10px] text-muted-foreground font-medium">Département</p>
                      </div>
                    </div>
                    <div className="space-y-3 bg-muted/50 p-3 rounded-xl border border-border/50 mb-5">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground font-medium">Dates</span>
                        <span className="font-bold text-foreground">{new Date(startDate).getDate()} - {new Date(endDate).getDate()} {new Date(startDate).toLocaleString('default', { month: 'short' })}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-muted-foreground font-medium">Type</span>
                        <span className="px-2 py-0.5 bg-primary/20 text-primary font-bold rounded-md">{leave.leave_type || leave.type}</span>
                      </div>
                    </div>
                    {user?.role === 'rh' ? (
                      <div className="grid grid-cols-2 gap-3">
                        <Button className="bg-primary text-primary-foreground py-2.5 rounded-xl text-xs font-bold shadow-sm hover:shadow-md transition-all" onClick={() => handleApprove(leave.id)} disabled={approveMutation.isPending}>Approuver</Button>
                        <Button variant="secondary" className="py-2.5 rounded-xl text-xs font-bold transition-colors" onClick={() => handleReject(leave.id)} disabled={rejectMutation.isPending}>Rejeter</Button>
                      </div>
                    ) : (
                      <div className="text-center text-xs text-muted-foreground font-medium">En attente de validation RH</div>
                    )}
                  </div>
                );
              })}

              {leaves.filter((l: any) => l.status === 'pending').length === 0 && (
                <div className="text-center py-8 bg-card border border-dashed border-border rounded-xl">
                  <p className="text-sm text-muted-foreground">Aucune demande en attente</p>
                </div>
              )}

              {/* AI Insight Chip */}
              <div className="bg-indigo-50/50 dark:bg-indigo-950/20 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-900/50 flex gap-3 items-start mt-4">
                <Sparkles className="text-indigo-500 h-5 w-5 shrink-0" />
                <div>
                  <p className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-tight mb-1">Analyse Smart-HR</p>
                  <p className="text-[10px] text-muted-foreground leading-relaxed font-medium">Le taux d'absence actuel est 4% inférieur à la moyenne habituelle du secteur.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        )}
      </motion.div>
    </DashboardLayout>
  );
};

export default LeaveListPage;
