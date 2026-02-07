import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  Filter,
  Plus,
  Download,
  Grid,
  List,
  SlidersHorizontal,
  Users,
  UserCheck,
  UserX,
  Clock,
} from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import EmployeeCard from '@/components/employees/EmployeeCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Employee } from '@/types';
import { cn } from '@/lib/utils';

// Données de démo
const mockEmployees: Employee[] = [
  {
    id: 1,
    user: { id: 1, email: 'amadou.sow@company.com', first_name: 'Amadou', last_name: 'Sow', role: 'EMPLOYEE' },
    department: 'Développement',
    position: 'Développeur Senior',
    hire_date: '2022-03-15',
    salary: 85000,
    status: 'active',
    phone: '+221 77 123 45 67',
    churn_risk: 72,
  },
  {
    id: 2,
    user: { id: 2, email: 'fatou.ndiaye@company.com', first_name: 'Fatou', last_name: 'Ndiaye', role: 'EMPLOYEE' },
    department: 'Marketing',
    position: 'Chef de projet',
    hire_date: '2021-08-20',
    salary: 65000,
    status: 'active',
    phone: '+221 78 234 56 78',
    churn_risk: 25,
  },
  {
    id: 3,
    user: { id: 3, email: 'moussa.diop@company.com', first_name: 'Moussa', last_name: 'Diop', role: 'EMPLOYEE' },
    department: 'Commercial',
    position: 'Commercial',
    hire_date: '2023-01-10',
    salary: 55000,
    status: 'on_leave',
    phone: '+221 76 345 67 89',
    churn_risk: 45,
  },
  {
    id: 4,
    user: { id: 4, email: 'aissatou.ba@company.com', first_name: 'Aïssatou', last_name: 'Ba', role: 'EMPLOYEE' },
    department: 'Finance',
    position: 'Comptable',
    hire_date: '2020-11-05',
    salary: 60000,
    status: 'active',
    phone: '+221 70 456 78 90',
    churn_risk: 15,
  },
  {
    id: 5,
    user: { id: 5, email: 'ousmane.fall@company.com', first_name: 'Ousmane', last_name: 'Fall', role: 'EMPLOYEE' },
    department: 'RH',
    position: 'Responsable RH',
    hire_date: '2019-05-22',
    salary: 75000,
    status: 'active',
    phone: '+221 77 567 89 01',
    churn_risk: 8,
  },
  {
    id: 6,
    user: { id: 6, email: 'mariama.diallo@company.com', first_name: 'Mariama', last_name: 'Diallo', role: 'EMPLOYEE' },
    department: 'Développement',
    position: 'Designer UI/UX',
    hire_date: '2023-06-01',
    salary: 70000,
    status: 'active',
    phone: '+221 78 678 90 12',
    churn_risk: 35,
  },
  {
    id: 7,
    user: { id: 7, email: 'ibrahima.sy@company.com', first_name: 'Ibrahima', last_name: 'Sy', role: 'EMPLOYEE' },
    department: 'IT',
    position: 'Administrateur Système',
    hire_date: '2021-02-14',
    salary: 68000,
    status: 'inactive',
    phone: '+221 76 789 01 23',
    churn_risk: 0,
  },
  {
    id: 8,
    user: { id: 8, email: 'khady.gueye@company.com', first_name: 'Khady', last_name: 'Gueye', role: 'EMPLOYEE' },
    department: 'Commercial',
    position: 'Directrice Commerciale',
    hire_date: '2018-09-10',
    salary: 95000,
    status: 'active',
    phone: '+221 70 890 12 34',
    churn_risk: 18,
  },
];

const departments = ['Tous', 'Développement', 'Marketing', 'Commercial', 'Finance', 'RH', 'IT'];
const statuses = [
  { value: 'all', label: 'Tous les statuts', icon: Users },
  { value: 'active', label: 'Actifs', icon: UserCheck },
  { value: 'inactive', label: 'Inactifs', icon: UserX },
  { value: 'on_leave', label: 'En congé', icon: Clock },
];

const statusStyles = {
  active: 'bg-success/20 text-success border-success/30',
  inactive: 'bg-destructive/20 text-destructive border-destructive/30',
  on_leave: 'bg-warning/20 text-warning border-warning/30',
};

const statusLabels = {
  active: 'Actif',
  inactive: 'Inactif',
  on_leave: 'En congé',
};

export default function EmployeeListPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('Tous');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Filtrer les employés
  const filteredEmployees = mockEmployees.filter((employee) => {
    const matchesSearch =
      employee.user.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      employee.user.last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      employee.user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      employee.position.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesDepartment =
      selectedDepartment === 'Tous' || employee.department === selectedDepartment;

    const matchesStatus = selectedStatus === 'all' || employee.status === selectedStatus;

    return matchesSearch && matchesDepartment && matchesStatus;
  });

  // Stats rapides
  const stats = {
    total: mockEmployees.length,
    active: mockEmployees.filter((e) => e.status === 'active').length,
    inactive: mockEmployees.filter((e) => e.status === 'inactive').length,
    onLeave: mockEmployees.filter((e) => e.status === 'on_leave').length,
  };

  return (
    <DashboardLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">Employés</h1>
            <p className="text-muted-foreground">
              Gérez et consultez les informations de vos collaborateurs
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Exporter
            </Button>
            <Button size="sm" className="bg-gradient-primary hover:opacity-90">
              <Plus className="mr-2 h-4 w-4" />
              Nouvel employé
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {statuses.map((status) => {
            const Icon = status.icon;
            const count =
              status.value === 'all'
                ? stats.total
                : status.value === 'active'
                ? stats.active
                : status.value === 'inactive'
                ? stats.inactive
                : stats.onLeave;

            return (
              <button
                key={status.value}
                onClick={() => setSelectedStatus(status.value)}
                className={cn(
                  'flex items-center gap-3 rounded-lg border p-4 transition-all hover:border-primary',
                  selectedStatus === status.value
                    ? 'border-primary bg-primary/5'
                    : 'border-border bg-card'
                )}
              >
                <div
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-lg',
                    selectedStatus === status.value ? 'bg-primary/10' : 'bg-muted'
                  )}
                >
                  <Icon
                    className={cn(
                      'h-5 w-5',
                      selectedStatus === status.value ? 'text-primary' : 'text-muted-foreground'
                    )}
                  />
                </div>
                <div className="text-left">
                  <p className="text-2xl font-bold">{count}</p>
                  <p className="text-xs text-muted-foreground">{status.label}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 items-center gap-3">
            <div className="relative flex-1 sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Rechercher un employé..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Département" />
              </SelectTrigger>
              <SelectContent>
                {departments.map((dept) => (
                  <SelectItem key={dept} value={dept}>
                    {dept}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon">
              <SlidersHorizontal className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => setViewMode('grid')}
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Results */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {filteredEmployees.length} employé{filteredEmployees.length > 1 ? 's' : ''} trouvé
            {filteredEmployees.length > 1 ? 's' : ''}
          </p>
        </div>

        {/* Employee Grid/List */}
        {viewMode === 'grid' ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          >
            {filteredEmployees.map((employee) => (
              <EmployeeCard key={employee.id} employee={employee} />
            ))}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-lg border border-border"
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employé</TableHead>
                  <TableHead>Département</TableHead>
                  <TableHead>Poste</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Risque</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmployees.map((employee) => (
                  <TableRow key={employee.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-primary text-sm font-medium text-primary-foreground">
                          {employee.user.first_name[0]}
                          {employee.user.last_name[0]}
                        </div>
                        <div>
                          <p className="font-medium">
                            {employee.user.first_name} {employee.user.last_name}
                          </p>
                          <p className="text-sm text-muted-foreground">{employee.user.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{employee.department}</TableCell>
                    <TableCell>{employee.position}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusStyles[employee.status]}>
                        {statusLabels[employee.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {employee.churn_risk !== undefined && (
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-16 overflow-hidden rounded-full bg-muted">
                            <div
                              className={cn(
                                'h-full rounded-full',
                                employee.churn_risk < 30 && 'bg-success',
                                employee.churn_risk >= 30 && employee.churn_risk < 60 && 'bg-warning',
                                employee.churn_risk >= 60 && 'bg-destructive'
                              )}
                              style={{ width: `${employee.churn_risk}%` }}
                            />
                          </div>
                          <span
                            className={cn(
                              'text-sm font-medium',
                              employee.churn_risk < 30 && 'text-success',
                              employee.churn_risk >= 30 && employee.churn_risk < 60 && 'text-warning',
                              employee.churn_risk >= 60 && 'text-destructive'
                            )}
                          >
                            {employee.churn_risk}%
                          </span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">
                        Voir
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </motion.div>
        )}

        {/* Empty State */}
        {filteredEmployees.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16">
            <Users className="h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">Aucun employé trouvé</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Essayez de modifier vos filtres de recherche
            </p>
            <Button className="mt-4" onClick={() => { setSearchQuery(''); setSelectedDepartment('Tous'); setSelectedStatus('all'); }}>
              Réinitialiser les filtres
            </Button>
          </div>
        )}
      </motion.div>
    </DashboardLayout>
  );
}
