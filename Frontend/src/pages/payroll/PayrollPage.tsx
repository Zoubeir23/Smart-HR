import { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import {
  DollarSign,
  TrendingUp,
  Users,
  Clock,
  Download,
  Eye,
} from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { payrollService } from '@/services/payrollService';

type PayrollStatus = 'paid' | 'pending' | 'processed';

interface ApiPayrollRecord {
  id: number;
  employee: number;
  employee_name: string;
  department_name: string;
  month: string;
  base_salary: string | number;
  bonuses: string | number;
  deductions: string | number;
  net_salary: string | number;
  status: PayrollStatus;
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  paid: { label: 'Payé', className: 'bg-success text-success-foreground' },
  pending: { label: 'En attente', className: 'bg-warning text-warning-foreground' },
  processed: { label: 'Traité', className: 'bg-blue-100 text-blue-800' },
};

const MONTHS = [
  { value: '01', label: 'Janvier' },
  { value: '02', label: 'Février' },
  { value: '03', label: 'Mars' },
  { value: '04', label: 'Avril' },
  { value: '05', label: 'Mai' },
  { value: '06', label: 'Juin' },
  { value: '07', label: 'Juillet' },
  { value: '08', label: 'Août' },
  { value: '09', label: 'Septembre' },
  { value: '10', label: 'Octobre' },
  { value: '11', label: 'Novembre' },
  { value: '12', label: 'Décembre' },
];

const YEARS = ['2024', '2025', '2026'];

function formatCurrency(amount: string | number): string {
  return new Intl.NumberFormat('fr-FR').format(Number(amount)) + ' FCFA';
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0] ?? '')
    .join('')
    .toUpperCase();
}

export default function PayrollPage() {
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(
    String(currentDate.getMonth() + 1).padStart(2, '0'),
  );
  const [selectedYear, setSelectedYear] = useState(String(currentDate.getFullYear()));

  const monthParam = `${selectedYear}-${selectedMonth}`;

  const { data, isLoading } = useQuery({
    queryKey: ['payroll', monthParam],
    queryFn: () => payrollService.getAll({ month: monthParam }),
  });

  const payrollRecords: ApiPayrollRecord[] = data?.results ?? data ?? [];

  const totalMass = payrollRecords.reduce((sum, r) => sum + Number(r.base_salary), 0);
  const averageSalary = payrollRecords.length > 0 ? Math.round(totalMass / payrollRecords.length) : 0;
  const paidCount = payrollRecords.filter((r) => r.status === 'paid').length;
  const pendingCount = payrollRecords.filter((r) => r.status !== 'paid').length;

  const statCards = [
    { label: 'Masse salariale', value: formatCurrency(totalMass), icon: DollarSign, color: 'text-primary' },
    { label: 'Salaire moyen', value: formatCurrency(averageSalary), icon: TrendingUp, color: 'text-success' },
    { label: 'Payés', value: String(paidCount), icon: Users, color: 'text-success' },
    { label: 'En attente', value: String(pendingCount), icon: Clock, color: 'text-warning' },
  ];

  const selectedMonthLabel = MONTHS.find((m) => m.value === selectedMonth)?.label ?? selectedMonth;

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
            <h1 className="text-3xl font-bold text-foreground">Gestion de la Paie</h1>
            <p className="text-muted-foreground mt-1">
              Consultez et gérez les salaires de vos collaborateurs
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Mois" />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-24">
                <SelectValue placeholder="Année" />
              </SelectTrigger>
              <SelectContent>
                {YEARS.map((year) => (
                  <SelectItem key={year} value={year}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
                <div className="min-w-0">
                  <p className="text-lg font-bold text-foreground truncate">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Payroll Table */}
        <div className="border border-border bg-card rounded-lg shadow-sm">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h2 className="text-lg font-semibold text-foreground">
              Fiches de paie — {selectedMonthLabel} {selectedYear}
            </h2>
            <Button variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Exporter
            </Button>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Employé</TableHead>
                  <TableHead>Département</TableHead>
                  <TableHead className="text-right">Salaire brut</TableHead>
                  <TableHead className="text-right">Déductions</TableHead>
                  <TableHead className="text-right">Net à payer</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payrollRecords.map((record) => {
                  const statusConf = STATUS_CONFIG[record.status];
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
                      <TableCell className="text-right text-foreground font-medium">
                        {formatCurrency(record.base_salary)}
                      </TableCell>
                      <TableCell className="text-right text-destructive">
                        -{formatCurrency(record.deductions)}
                      </TableCell>
                      <TableCell className="text-right text-foreground font-bold">
                        {formatCurrency(record.net_salary)}
                      </TableCell>
                      <TableCell>
                        <Badge className={statusConf?.className ?? ''}>
                          {statusConf?.label ?? record.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">
                          <Eye className="mr-1 h-4 w-4" />
                          Voir fiche
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>

        {payrollRecords.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16">
            <DollarSign className="h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold text-foreground">Aucune fiche de paie</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Aucune fiche de paie pour {selectedMonthLabel} {selectedYear}.
            </p>
          </div>
        )}

        {payrollRecords.length > 0 && (
          <div className="border border-border bg-card rounded-lg shadow-sm p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="text-sm text-muted-foreground">
                {payrollRecords.length} employé(s) ·{' '}
                <span className="text-success font-medium">{paidCount} payé(s)</span>,{' '}
                <span className="text-warning font-medium">{pendingCount} en attente</span>
              </div>
              <div className="text-sm text-foreground font-semibold">
                Total net versé :{' '}
                {formatCurrency(
                  payrollRecords
                    .filter((r) => r.status === 'paid')
                    .reduce((sum, r) => sum + Number(r.net_salary), 0),
                )}
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </DashboardLayout>
  );
}
