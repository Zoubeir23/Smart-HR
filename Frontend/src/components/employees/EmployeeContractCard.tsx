import { Briefcase } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface EmployeeContractCardProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  employee: any;
}

export function EmployeeContractCard({ employee }: EmployeeContractCardProps) {
  return (
    <Card className="border border-border shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Briefcase className="h-5 w-5 text-primary" />
          Informations du contrat
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-xs text-muted-foreground">Type de contrat</p>
            <p className="mt-1 font-semibold text-foreground">Non disponible</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-xs text-muted-foreground">Salaire annuel</p>
            <p className="mt-1 font-semibold text-foreground">
              {employee?.salary != null ? Number(employee.salary).toLocaleString('fr-FR') : '—'} FCFA
            </p>
          </div>
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-xs text-muted-foreground">Date d'embauche</p>
            <p className="mt-1 font-semibold text-foreground">
              {employee?.hire_date ? new Date(employee.hire_date).toLocaleDateString('fr-FR') : 'Non disponible'}
            </p>
          </div>
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-xs text-muted-foreground">Manager</p>
            <p className="mt-1 font-semibold text-foreground">Non disponible</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
