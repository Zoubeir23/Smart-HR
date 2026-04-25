import { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import {
  Users,
  UserCheck,
  UserX,
  Clock,
  Calendar,
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

type ApiAttendanceStatus = 'present' | 'absent' | 'late' | 'half_day';
type StatusFilter = 'all' | ApiAttendanceStatus;
type DateFilter = 'today' | 'week' | 'month';

interface AttendanceRecord {
  id: number;
  employee: number;
  employee_name: string;
  department_name: string;
  date: string;
  check_in: string | null;
  check_out: string | null;
  status: ApiAttendanceStatus;
  note: string;
}

const STATUS_CONFIG: Record<ApiAttendanceStatus, { label: string; className: string }> = {
  present: { label: 'Présent', className: 'bg-success text-success-foreground' },
  absent: { label: 'Absent', className: 'bg-destructive text-destructive-foreground' },
  late: { label: 'En retard', className: 'bg-warning text-warning-foreground' },
  half_day: { label: 'Demi-journée', className: 'bg-muted text-muted-foreground' },
};

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Tous' },
  { value: 'present', label: 'Présents' },
  { value: 'absent', label: 'Absents' },
  { value: 'late', label: 'En retard' },
  { value: 'half_day', label: 'Demi-journée' },
];

const DATE_FILTER_LABELS: Record<DateFilter, string> = {
  today: "Aujourd'hui",
  week: 'Cette semaine',
  month: 'Ce mois',
};

function buildDateParam(filter: DateFilter): string {
  const now = new Date();
  if (filter === 'today') {
    return now.toISOString().split('T')[0];
  }
  return '';
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0] ?? '')
    .join('')
    .toUpperCase();
}

export default function AttendancePage() {
  const [dateFilter, setDateFilter] = useState<DateFilter>('today');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const apiDate = buildDateParam(dateFilter);

  const { data, isLoading } = useQuery({
    queryKey: ['attendance', dateFilter],
    queryFn: () =>
      dateFilter === 'today'
        ? attendanceService.getToday()
        : attendanceService.getAll(apiDate ? { date: apiDate } : {}),
  });

  const records: AttendanceRecord[] = data?.results ?? data ?? [];

  const filteredRecords =
    statusFilter === 'all' ? records : records.filter((r) => r.status === statusFilter);

  const stats = {
    total: records.length,
    present: records.filter((r) => r.status === 'present').length,
    absent: records.filter((r) => r.status === 'absent').length,
    late: records.filter((r) => r.status === 'late').length,
  };

  const statCards = [
    { label: 'Total', value: stats.total, icon: Users, color: 'text-primary' },
    { label: 'Présents', value: stats.present, icon: UserCheck, color: 'text-success' },
    { label: 'Absents', value: stats.absent, icon: UserX, color: 'text-destructive' },
    { label: 'En retard', value: stats.late, icon: Clock, color: 'text-warning' },
  ];

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Chargement…</p>
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
            {(Object.keys(DATE_FILTER_LABELS) as DateFilter[]).map((filter) => (
              <Button
                key={filter}
                variant={dateFilter === filter ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDateFilter(filter)}
              >
                {filter === 'today' && <Calendar className="mr-2 h-4 w-4" />}
                {DATE_FILTER_LABELS[filter]}
              </Button>
            ))}
          </div>
        </div>

        {/* Stats */}
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

        {/* Status Filter */}
        <div className="border border-border bg-card rounded-lg shadow-sm p-4">
          <div className="flex items-center gap-2 flex-wrap">
            {STATUS_FILTERS.map((filter) => (
              <Button
                key={filter.value}
                variant={statusFilter === filter.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter(filter.value)}
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
                  <TableHead>Date</TableHead>
                  <TableHead>Arrivée</TableHead>
                  <TableHead>Départ</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.map((record) => {
                  const config = STATUS_CONFIG[record.status];
                  return (
                    <TableRow key={record.id} className="hover:bg-muted/50">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-primary text-sm font-medium text-primary-foreground">
                            {getInitials(record.employee_name || 'NN')}
                          </div>
                          <span className="font-medium text-foreground">{record.employee_name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{record.department_name || '—'}</TableCell>
                      <TableCell className="text-foreground">
                        {new Date(record.date).toLocaleDateString('fr-FR')}
                      </TableCell>
                      <TableCell className="text-foreground">
                        {record.check_in ?? <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-foreground">
                        {record.check_out ?? <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell>
                        <Badge className={config?.className ?? ''}>
                          {config?.label ?? record.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>

        {filteredRecords.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16">
            <Users className="h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold text-foreground">Aucun enregistrement</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Aucune présence ne correspond au filtre sélectionné.
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
