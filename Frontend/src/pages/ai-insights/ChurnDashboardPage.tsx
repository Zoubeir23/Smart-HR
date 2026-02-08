import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import ChurnGauge from '@/components/charts/ChurnGauge';
import { AlertTriangle, TrendingUp, Calendar, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { churnService } from '@/services/churnService';

type RiskLevel = 'low' | 'medium' | 'high';

interface Employee {
  id: string;
  name: string;
  initials: string;
  department: string;
  tenure: string;
  riskScore: number;
  riskLevel: RiskLevel;
  mainReason: string;
  riskFactors: Array<{ factor: string; impact: string }>;
}

const riskLevelConfig = {
  low: {
    label: 'Faible',
    className: 'bg-success text-success-foreground',
  },
  medium: {
    label: 'Modéré',
    className: 'bg-warning text-warning-foreground',
  },
  high: {
    label: 'Élevé',
    className: 'bg-destructive text-destructive-foreground',
  },
};

const ChurnDashboardPage = () => {
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  const { data: predictions, isLoading } = useQuery({ queryKey: ['churn-predictions'], queryFn: churnService.getAllPredictions });
  const { data: highRisk } = useQuery({ queryKey: ['high-risk'], queryFn: churnService.getHighRisk });

  const employees: Employee[] = predictions?.results || predictions || [];
  const highRiskEmployees: Employee[] = highRisk?.results || highRisk || [];

  // Sort employees by risk score descending
  const sortedEmployees = [...employees].sort((a, b) => b.riskScore - a.riskScore);

  const getRiskColor = (score: number): string => {
    if (score < 30) return 'bg-success';
    if (score < 60) return 'bg-warning';
    return 'bg-destructive';
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
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Prédiction du Turnover</h1>
          <p className="text-muted-foreground">
            Identifiez les employés à risque de départ grâce à l'intelligence artificielle
          </p>
          <div className="flex items-center gap-2 mt-4 p-4 bg-primary/10 border border-primary/20 rounded-lg">
            <TrendingUp className="h-5 w-5 text-primary" />
            <span className="text-sm text-foreground">
              <strong>{highRiskEmployees.length} employé{highRiskEmployees.length > 1 ? 's' : ''}</strong> présentent un risque élevé de départ imminent
            </span>
          </div>
        </div>

        {/* Employee Table */}
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Employé</TableHead>
                  <TableHead>Département</TableHead>
                  <TableHead>Ancienneté</TableHead>
                  <TableHead>Score de risque</TableHead>
                  <TableHead>Niveau</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedEmployees.map((employee) => (
                  <TableRow
                    key={employee.id}
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => setSelectedEmployee(employee)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                            {employee.initials}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{employee.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>{employee.department}</TableCell>
                    <TableCell>{employee.tenure}</TableCell>
                    <TableCell>
                      <div className="space-y-2 min-w-[200px]">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{employee.riskScore}%</span>
                        </div>
                        <Progress
                          value={employee.riskScore}
                          className="h-2"
                          indicatorClassName={getRiskColor(employee.riskScore)}
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={riskLevelConfig[employee.riskLevel].className}>
                        {riskLevelConfig[employee.riskLevel].label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEmployee(employee);
                        }}
                      >
                        Voir détails
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>

        {/* Detail Panel */}
        <AnimatePresence>
          {selectedEmployee && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
              onClick={() => setSelectedEmployee(null)}
            >
              <Card
                className="max-w-3xl w-full max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-6 space-y-6">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-16 w-16">
                        <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                          {selectedEmployee.initials}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h2 className="text-2xl font-bold text-foreground">
                          {selectedEmployee.name}
                        </h2>
                        <p className="text-muted-foreground">
                          {selectedEmployee.department} • {selectedEmployee.tenure}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedEmployee(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Churn Gauge */}
                  <div className="flex justify-center py-4">
                    <ChurnGauge score={selectedEmployee.riskScore} />
                  </div>

                  {/* Main Reason */}
                  <div className="bg-muted/50 rounded-lg p-4 border border-border">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-warning mt-0.5" />
                      <div>
                        <h3 className="font-semibold text-foreground mb-1">
                          Raison principale
                        </h3>
                        <p className="text-muted-foreground">
                          {selectedEmployee.mainReason}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Risk Factors */}
                  <div>
                    <h3 className="font-semibold text-foreground mb-3">
                      Facteurs de risque identifiés
                    </h3>
                    <div className="space-y-2">
                      {selectedEmployee.riskFactors.map((factor, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 bg-card border border-border rounded-lg"
                        >
                          <span className="text-foreground">{factor.factor}</span>
                          <Badge
                            variant="secondary"
                            className={
                              factor.impact.includes('élevé')
                                ? 'bg-destructive/20 text-destructive'
                                : factor.impact.includes('moyen')
                                ? 'bg-warning/20 text-warning'
                                : 'bg-success/20 text-success'
                            }
                          >
                            {factor.impact}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Action Button */}
                  <Button
                    className="w-full bg-primary text-primary-foreground"
                    size="lg"
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    Planifier un entretien de rétention
                  </Button>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </DashboardLayout>
  );
};

export default ChurnDashboardPage;
