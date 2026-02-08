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
import { employeeService } from '@/services/employeeService';
import { useQuery } from '@tanstack/react-query';

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

  const { data: employeesData, isLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: () => employeeService.getAll(),
  });
  const employees: Employee[] = employeesData?.results || employeesData || [];

  // Filtrer les employés
  const filteredEmployees = employees.filter((employee) => {
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
    total: employees.length,
    active: employees.filter((e) => e.status === 'active').length,
    inactive: employees.filter((e) => e.status === 'inactive').length,
    onLeave: employees.filter((e) => e.status === 'on_leave').length,
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

        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <div className="text-center space-y-3">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
              <p className="text-muted-foreground">Chargement...</p>
            </div>
          </div>
        )}

        {!isLoading && <>
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
        </>}
      </motion.div>
    </DashboardLayout>
  );
}
