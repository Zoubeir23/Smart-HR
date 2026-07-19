import { Calendar } from 'lucide-react';
import { formatLocalDate, leaveStatusLabels, leaveStatusStyles } from '@/components/employees/employeeDetailHelpers';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface LeaveHistoryEntry {
  type: string;
  start: string;
  end: string;
  status: string;
}

interface EmployeeLeavesCardProps {
  leaves: { balance: number; history: LeaveHistoryEntry[] };
}

export function EmployeeLeavesCard({ leaves }: EmployeeLeavesCardProps) {
  return (
    <Card className="border border-border shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Calendar className="h-5 w-5 text-primary" />
          Congés
        </CardTitle>
        <Badge variant="secondary">{leaves.balance} jours restants</Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        {leaves.history.length === 0 && (
          <p className="text-sm text-muted-foreground py-4 text-center">Non disponible</p>
        )}
        {leaves.history.map((leave, index) => (
          <div
            key={index}
            className="flex items-center justify-between rounded-lg bg-muted/50 p-3"
          >
            <div>
              <p className="font-medium text-foreground">{leave.type}</p>
              <p className="text-sm text-muted-foreground">
                {formatLocalDate(leave.start)} -{' '}
                {formatLocalDate(leave.end)}
              </p>
            </div>
            <Badge variant="outline" className={leaveStatusStyles[leave.status]}>
              {leaveStatusLabels[leave.status]}
            </Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
