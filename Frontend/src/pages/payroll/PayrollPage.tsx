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
  Sparkles,
  Rocket
} from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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
        {/* Header Section */}
        <header className="flex flex-col gap-2">
          <Badge variant="secondary" className="w-fit bg-primary/10 text-primary hover:bg-primary/20 uppercase tracking-widest font-bold">
            Aperçu de la période
          </Badge>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold text-foreground tracking-tight leading-tight">
                Tableau de Bord Paie
              </h1>
              <p className="text-muted-foreground font-medium mt-1">
                Aperçu mensuel et versement des salaires pour la période active.
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="w-32 font-bold uppercase text-xs">
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
                  <SelectTrigger className="w-24 font-bold uppercase text-xs">
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
              </div>
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-5 rounded-xl font-extrabold text-sm shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95">
                <FileText className="mr-2 h-5 w-5" />
                Générer les fiches
              </Button>
            </div>
          </div>
        </header>

        {/* Bento Stats Grid */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Stat 1 */}
          <div className="bg-card p-6 rounded-xl border border-border flex flex-col justify-between group hover:bg-muted/30 transition-colors shadow-sm">
            <div>
              <p className="text-xs text-muted-foreground font-bold uppercase mb-4 tracking-wider">Masse salariale totale</p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-foreground">{formatCurrency(totalMass).replace(' FCFA', '')}</span>
                <span className="text-lg font-bold text-muted-foreground">FCFA</span>
              </div>
            </div>
            <div className="mt-6 flex items-center gap-2 text-success font-bold text-sm">
              <TrendingUp className="h-4 w-4" />
              <span>+2,4% vs mois dernier</span>
            </div>
          </div>

          {/* Stat 2 */}
          <div className="bg-card p-6 rounded-xl border border-border flex flex-col justify-between group hover:bg-muted/30 transition-colors shadow-sm">
            <div>
              <p className="text-xs text-muted-foreground font-bold uppercase mb-4 tracking-wider">Employés payés</p>
              <div className="flex items-center gap-4">
                <div className="text-3xl font-extrabold text-foreground">
                  {paidCount}<span className="text-muted-foreground">/{payrollRecords.length > 0 ? payrollRecords.length : 1}</span>
                </div>
                <div className="flex-1">
                  <Progress value={payrollRecords.length > 0 ? (paidCount / payrollRecords.length) * 100 : 0} className="h-2" />
                </div>
              </div>
            </div>
            <p className="mt-6 text-sm text-muted-foreground font-medium">
              {pendingCount} dossier{pendingCount > 1 ? 's' : ''} en attente de validation
            </p>
          </div>

          {/* Stat 3 */}
          <div className="bg-primary/10 p-6 rounded-xl border border-primary/20 flex flex-col justify-between relative overflow-hidden group shadow-sm">
            <div className="absolute -right-4 -top-4 text-primary/10 group-hover:rotate-12 transition-transform duration-500">
              <Sparkles className="w-32 h-32" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="text-primary h-4 w-4" />
                <p className="text-xs text-primary font-bold uppercase tracking-wider">Prochain versement</p>
              </div>
              <div className="text-3xl font-extrabold text-foreground">31 {selectedMonth.substring(0, 3).toLowerCase()}. {selectedYear}</div>
            </div>
            <Button className="mt-6 w-full py-5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-sm font-bold shadow-md shadow-primary/20 transition-colors relative z-10">
              Configurer les rappels
            </Button>
          </div>
        </section>

        {/* Table Section */}
        <section className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
          <div className="px-6 py-5 border-b border-border flex flex-col sm:flex-row justify-between items-center gap-4">
            <h3 className="text-lg font-bold text-foreground">Liste des Rémunérations</h3>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-none">
                <FileText className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <input
                  className="pl-9 pr-4 py-2 bg-muted border-none rounded-lg text-sm w-full sm:w-64 focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/60 outline-none text-foreground"
                  placeholder="Rechercher un employé..."
                  type="text"
                />
              </div>
              <Button variant="outline" size="icon" className="bg-muted border-none">
                <FileText className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="px-6 py-4 text-xs text-muted-foreground font-bold uppercase">Nom</TableHead>
                  <TableHead className="px-6 py-4 text-xs text-muted-foreground font-bold uppercase">Salaire de base</TableHead>
                  <TableHead className="px-6 py-4 text-xs text-muted-foreground font-bold uppercase">Primes</TableHead>
                  <TableHead className="px-6 py-4 text-xs text-muted-foreground font-bold uppercase">Retenues</TableHead>
                  <TableHead className="px-6 py-4 text-xs text-muted-foreground font-bold uppercase">Salaire Net</TableHead>
                  <TableHead className="px-6 py-4 text-xs text-muted-foreground font-bold uppercase">Statut</TableHead>
                  <TableHead className="px-6 py-4 text-xs text-muted-foreground font-bold uppercase text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payrollRecords.map((record) => {
                  const bonuses = record.grossSalary * 0.05; // Mocking bonus for visuals
                  const baseSalary = record.grossSalary - bonuses;
                  return (
                    <TableRow key={record.id} className="hover:bg-muted/30 transition-colors group">
                      <TableCell className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                            {record.initials}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-foreground">{record.employee}</p>
                            <p className="text-xs text-muted-foreground">{record.department}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-4 text-sm font-medium text-foreground">
                        {formatCurrency(baseSalary)}
                      </TableCell>
                      <TableCell className="px-6 py-4 text-sm font-medium text-success">
                        +{formatCurrency(bonuses)}
                      </TableCell>
                      <TableCell className="px-6 py-4 text-sm font-medium text-destructive">
                        -{formatCurrency(record.deductions)}
                      </TableCell>
                      <TableCell className="px-6 py-4 text-sm font-bold text-foreground">
                        {formatCurrency(record.netSalary)}
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <Badge variant="outline" className={statusConfig[record.status].className}>
                          {statusConfig[record.status].label}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-6 py-4 text-right">
                        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary hover:bg-primary/10" title="Télécharger PDF">
                          <Download className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Table Footer/Pagination */}
          <div className="px-6 py-4 bg-muted/20 border-t border-border flex justify-between items-center">
            <p className="text-xs text-muted-foreground font-medium">
              Affichage de {payrollRecords.length > 0 ? 1 : 0} - {payrollRecords.length} sur {payrollRecords.length} employés
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="h-8 w-8 p-0 border-border hover:bg-muted disabled:opacity-30" disabled>
                {'<'}
              </Button>
              <Button size="sm" className="h-8 w-8 p-0 bg-primary text-primary-foreground font-bold">1</Button>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-muted font-bold transition-colors">2</Button>
              <Button variant="outline" size="sm" className="h-8 w-8 p-0 border-border hover:bg-muted transition-colors">
                {'>'}
              </Button>
            </div>
          </div>
        </section>

        {/* AI Recommendations / Bottom Section */}
        <section className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <div className="md:col-span-3 bg-primary text-primary-foreground p-8 rounded-xl relative overflow-hidden flex flex-col justify-center shadow-lg">
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <Sparkles className="w-48 h-48" />
            </div>
            <h3 className="text-2xl font-extrabold mb-4 relative z-10">Analyse Intelligente</h3>
            <p className="text-sm opacity-90 max-w-lg mb-8 relative z-10 font-medium">
              Nous avons détecté une augmentation de 4,2% des primes ce mois-ci par rapport aux prévisions. Souhaitez-vous générer un rapport détaillé pour la direction ?
            </p>
            <div className="flex gap-4 relative z-10">
              <Button variant="secondary" className="bg-background text-primary font-bold shadow-md hover:bg-background/90">
                Générer le rapport
              </Button>
              <Button variant="outline" className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 bg-transparent font-bold">
                Ignorer
              </Button>
            </div>
          </div>

          <div className="md:col-span-2 bg-card p-8 rounded-xl border border-border flex flex-col shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-lg font-bold text-foreground">Échéances de Paie</h3>
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <div className="space-y-6">
              <div className="flex gap-4 items-start">
                <div className="w-2 h-2 rounded-full bg-destructive mt-1.5 shrink-0"></div>
                <div>
                  <p className="text-sm font-bold text-foreground">Clôture des variables</p>
                  <p className="text-xs text-muted-foreground">Demain, 17:00</p>
                </div>
              </div>
              <div className="flex gap-4 items-start">
                <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0"></div>
                <div>
                  <p className="text-sm font-bold text-foreground">Envoi des DSN</p>
                  <p className="text-xs text-muted-foreground">5 novembre 2024</p>
                </div>
              </div>
              <div className="flex gap-4 items-start">
                <div className="w-2 h-2 rounded-full bg-muted-foreground mt-1.5 shrink-0"></div>
                <div>
                  <p className="text-sm font-bold text-foreground">Archive fiscale</p>
                  <p className="text-xs text-muted-foreground">15 novembre 2024</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </motion.div>
    </DashboardLayout>
  );
}
