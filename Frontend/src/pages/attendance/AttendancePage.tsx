import { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import {
  Users,
  UserCheck,
  UserX,
  Clock,
  Calendar,
  Eye,
} from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { attendanceService } from '@/services/attendanceService';

type AttendanceStatus = 'present' | 'absent' | 'retard' | 'conge';
type DateFilter = 'today' | 'week' | 'month';
type StatusFilter = 'all' | AttendanceStatus;

interface AttendanceRecord {
  id: string;
  employee: string;
  initials: string;
  department: string;
  arrival: string | null;
  departure: string | null;
  status: AttendanceStatus;
}

const statusConfig: Record<AttendanceStatus, { label: string; className: string }> = {
  present: { label: 'Présent', className: 'bg-success text-success-foreground' },
  absent: { label: 'Absent', className: 'bg-destructive text-destructive-foreground' },
  retard: { label: 'En retard', className: 'bg-warning text-warning-foreground' },
  conge: { label: 'En congé', className: 'bg-muted text-muted-foreground' },
};

const statusFilters: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Tous' },
  { value: 'present', label: 'Présents' },
  { value: 'absent', label: 'Absents' },
  { value: 'retard', label: 'En retard' },
  { value: 'conge', label: 'En congé' },
];

export default function AttendancePage() {
  const [dateFilter, setDateFilter] = useState<DateFilter>('today');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const { data, isLoading } = useQuery({ queryKey: ['attendance'], queryFn: () => attendanceService.getAll() });
  const attendanceRecords: AttendanceRecord[] = data?.results || data || [];

  const filteredRecords = attendanceRecords.filter((record) => {
    if (statusFilter === 'all') return true;
    return record.status === statusFilter;
  });

  const stats = {
    total: attendanceRecords.length,
    present: attendanceRecords.filter((r) => r.status === 'present').length,
    absent: attendanceRecords.filter((r) => r.status === 'absent').length,
    retard: attendanceRecords.filter((r) => r.status === 'retard').length,
  };

  const statCards = [
    { label: 'Total employés', value: stats.total, icon: Users, color: 'text-primary' },
    { label: 'Présents', value: stats.present, icon: UserCheck, color: 'text-success' },
    { label: 'Absents', value: stats.absent, icon: UserX, color: 'text-destructive' },
    { label: 'En retard', value: stats.retard, icon: Clock, color: 'text-warning' },
  ];

  const dateFilterLabels: Record<DateFilter, string> = {
    today: "Aujourd'hui",
    week: 'Cette semaine',
    month: 'Ce mois',
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </DashboardLayout>
    );
  }

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
            <h1 className="text-3xl font-bold text-foreground">Gestion des Présences</h1>
            <p className="text-muted-foreground mt-1">
              Suivez la présence quotidienne de vos collaborateurs
            </p>
          </div>
          <div className="flex items-center gap-2">
            {(Object.keys(dateFilterLabels) as DateFilter[]).map((filter) => (
              <Button
                key={filter}
                variant={dateFilter === filter ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDateFilter(filter)}
                className={dateFilter === filter ? 'bg-primary text-primary-foreground' : ''}
              >
                {filter === 'today' && <Calendar className="mr-2 h-4 w-4" />}
                {dateFilterLabels[filter]}
              </Button>
            ))}
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="border border-border bg-card rounded-lg shadow-sm p-4 flex items-center gap-3"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                  <Icon className={cn('h-5 w-5', stat.color)} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Status Filter Tabs */}
        <div className="border border-border bg-card rounded-lg shadow-sm p-4">
          <div className="flex items-center gap-2 flex-wrap">
            {statusFilters.map((filter) => (
              <Button
                key={filter.value}
                variant={statusFilter === filter.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter(filter.value)}
                className={statusFilter === filter.value ? 'bg-primary text-primary-foreground' : ''}
              >
                {filter.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Attendance Table */}
        <div className="border border-border bg-card rounded-lg shadow-sm">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Employé</TableHead>
                  <TableHead>Département</TableHead>
                  <TableHead>Arrivée</TableHead>
                  <TableHead>Départ</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.map((record) => (
                  <TableRow key={record.id} className="hover:bg-muted/50">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-primary text-sm font-medium text-primary-foreground">
                          {record.initials}
                        </div>
                        <span className="font-medium text-foreground">{record.employee}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{record.department}</TableCell>
                    <TableCell className="text-foreground">
                      {record.arrival ?? <span className="text-muted-foreground">--:--</span>}
                    </TableCell>
                    <TableCell className="text-foreground">
                      {record.departure ?? <span className="text-muted-foreground">--:--</span>}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusConfig[record.status].className}>
                        {statusConfig[record.status].label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">
                        <Eye className="mr-1 h-4 w-4" />
                        Détails
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Empty State */}
        {filteredRecords.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16">
            <Users className="h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold text-foreground">Aucun enregistrement trouvé</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Aucune présence ne correspond au filtre sélectionné
            </p>
            <Button className="mt-4" onClick={() => setStatusFilter('all')}>
              Réinitialiser les filtres
            </Button>
          </div>
        )}
      </motion.div>
    </DashboardLayout>
  );
}
