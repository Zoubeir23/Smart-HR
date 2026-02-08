import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { leaveService } from '@/services/leaveService';
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
import { Calendar, List, Plus, Check, X } from 'lucide-react';
import { motion } from 'framer-motion';

type LeaveStatus = 'pending' | 'approved' | 'rejected';

const LeaveListPage = () => {
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const queryClient = useQueryClient();

  const { data: leavesData, isLoading } = useQuery({
    queryKey: ['leaves'],
    queryFn: () => leaveService.getAll(),
  });
  const leaves = leavesData?.results || leavesData || [];

  const approveMutation = useMutation({
    mutationFn: (id: number) => leaveService.approve(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['leaves'] }),
  });

  const rejectMutation = useMutation({
    mutationFn: (id: number) => leaveService.reject(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['leaves'] }),
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
                  <Select>
                    <SelectTrigger id="type">
                      <SelectValue placeholder="Sélectionnez un type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vacances">Vacances</SelectItem>
                      <SelectItem value="maladie">Maladie</SelectItem>
                      <SelectItem value="personnel">Personnel</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="start-date">Date de début</Label>
                  <Input id="start-date" type="date" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="end-date">Date de fin</Label>
                  <Input id="end-date" type="date" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="reason">Motif</Label>
                  <Textarea
                    id="reason"
                    placeholder="Décrivez brièvement la raison de votre demande"
                    rows={4}
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
                  onClick={() => setIsDialogOpen(false)}
                >
                  Soumettre
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
                        {user?.role === 'rh' && leave.status === 'pending' && (
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
          <Card className="p-8">
            <div className="grid grid-cols-7 gap-2">
              {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((day) => (
                <div
                  key={day}
                  className="text-center font-semibold text-sm text-muted-foreground p-2"
                >
                  {day}
                </div>
              ))}
              {Array.from({ length: 35 }, (_, i) => (
                <div
                  key={i}
                  className="border border-border rounded-lg p-4 min-h-[80px] hover:bg-muted/50 transition-colors"
                >
                  <div className="text-sm text-muted-foreground">{i + 1}</div>
                </div>
              ))}
            </div>
            <p className="text-center text-muted-foreground mt-6">
              Vue calendrier - Fonctionnalité à venir
            </p>
          </Card>
        )}
      </motion.div>
    </DashboardLayout>
  );
};

export default LeaveListPage;
