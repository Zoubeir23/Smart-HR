import { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import {
  DollarSign,
  TrendingUp,
  Users,
  Clock,
  FileText,
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

type PayrollStatus = 'paid' | 'pending' | 'error';

interface PayrollRecord {
  id: string;
  employee: string;
  initials: string;
  department: string;
  grossSalary: number;
  deductions: number;
  netSalary: number;
  status: PayrollStatus;
}

const statusConfig: Record<PayrollStatus, { label: string; className: string }> = {
  paid: { label: 'Payé', className: 'bg-success text-success-foreground' },
  pending: { label: 'En attente', className: 'bg-warning text-warning-foreground' },
  error: { label: 'Erreur', className: 'bg-destructive text-destructive-foreground' },
};

const months = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

const years = ['2024', '2025', '2026'];

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';
}

export default function PayrollPage() {
  const [selectedMonth, setSelectedMonth] = useState('Février');
  const [selectedYear, setSelectedYear] = useState('2026');

  const { data, isLoading } = useQuery({ queryKey: ['payroll'], queryFn: () => payrollService.getAll() });
  const payrollRecords: PayrollRecord[] = data?.results || data || [];

  const totalMass = payrollRecords.reduce((sum, r) => sum + r.grossSalary, 0);
  const averageSalary = payrollRecords.length > 0 ? Math.round(totalMass / payrollRecords.length) : 0;
  const paidCount = payrollRecords.filter((r) => r.status === 'paid').length;
  const pendingCount = payrollRecords.filter((r) => r.status !== 'paid').length;

  const statCards = [
    {
      label: 'Masse salariale totale',
      value: formatCurrency(totalMass),
      icon: DollarSign,
      color: 'text-primary',
    },
    {
      label: 'Salaire moyen',
      value: formatCurrency(averageSalary),
      icon: TrendingUp,
      color: 'text-success',
    },
    {
      label: 'Employés payés',
      value: paidCount.toString(),
      icon: Users,
      color: 'text-success',
    },
    {
      label: 'En attente',
      value: pendingCount.toString(),
      icon: Clock,
      color: 'text-warning',
    },
  ];

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
                {months.map((month) => (
                  <SelectItem key={month} value={month}>
                    {month}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-24">
                <SelectValue placeholder="Année" />
              </SelectTrigger>
              <SelectContent>
                {years.map((year) => (
                  <SelectItem key={year} value={year}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button className="bg-primary text-primary-foreground">
              <FileText className="mr-2 h-4 w-4" />
              Générer les fiches
            </Button>
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
              Fiches de paie - {selectedMonth} {selectedYear}
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
                {payrollRecords.map((record) => (
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
                    <TableCell className="text-right text-foreground font-medium">
                      {formatCurrency(record.grossSalary)}
                    </TableCell>
                    <TableCell className="text-right text-destructive">
                      -{formatCurrency(record.deductions)}
                    </TableCell>
                    <TableCell className="text-right text-foreground font-bold">
                      {formatCurrency(record.netSalary)}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusConfig[record.status].className}>
                        {statusConfig[record.status].label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">
                        <Eye className="mr-1 h-4 w-4" />
                        Voir fiche
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Summary Footer */}
        <div className="border border-border bg-card rounded-lg shadow-sm p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="text-sm text-muted-foreground">
              {payrollRecords.length} employé{payrollRecords.length > 1 ? 's' : ''} au total
              {' - '}
              <span className="text-success font-medium">{paidCount} payé{paidCount > 1 ? 's' : ''}</span>
              {', '}
              <span className="text-warning font-medium">{pendingCount} en attente</span>
            </div>
            <div className="text-sm text-foreground font-semibold">
              Total net versé : {formatCurrency(payrollRecords.filter((r) => r.status === 'paid').reduce((sum, r) => sum + r.netSalary, 0))}
            </div>
          </div>
        </div>
      </motion.div>
    </DashboardLayout>
  );
}
