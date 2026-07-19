import { Calendar, FileText, Mail, MapPin, Phone } from 'lucide-react';
import {
  formatLocalDate,
  getAvatarColor,
  statusLabels,
  statusStyles,
} from '@/components/employees/employeeDetailHelpers';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface EmployeeProfileCardProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  employee: any;
}

export function EmployeeProfileCard({ employee }: EmployeeProfileCardProps) {
  const fullName = `${employee?.user?.first_name ?? ''} ${employee?.user?.last_name ?? ''}`.trim();
  const avatarBg = getAvatarColor(`${employee?.user?.first_name ?? ''}${employee?.user?.last_name ?? ''}`);

  return (
    <Card className="border border-border shadow-sm">
      <CardContent className="flex flex-col items-center p-6">
        {/* Large Avatar */}
        <div
          className={cn(
            'flex h-24 w-24 items-center justify-center rounded-full text-3xl font-bold text-white',
            avatarBg
          )}
        >
          {employee?.user?.first_name?.[0] ?? ''}
          {employee?.user?.last_name?.[0] ?? ''}
        </div>

        {/* Name and Position */}
        <h2 className="mt-4 text-xl font-bold text-foreground">{fullName}</h2>
        <p className="text-sm text-muted-foreground">{employee?.position_title ?? 'Non disponible'}</p>
        <p className="text-sm text-muted-foreground">{employee?.department_name ?? 'Non disponible'}</p>

        {/* Status Badge */}
        <Badge
          variant="outline"
          className={cn('mt-3', statusStyles[employee?.status as keyof typeof statusStyles] ?? statusStyles.active)}
        >
          {statusLabels[employee?.status as keyof typeof statusLabels] ?? 'Inconnu'}
        </Badge>

        {/* Matricule + CNSS */}
        {(employee?.matricule || employee?.cnss_number) && (
          <div className="mt-3 flex flex-wrap gap-2 justify-center">
            {employee?.matricule && (
              <Badge variant="secondary" className="font-mono text-xs">
                {employee.matricule}
              </Badge>
            )}
            {employee?.cnss_number && (
              <Badge variant="outline" className="font-mono text-xs">
                CNSS {employee.cnss_number}
              </Badge>
            )}
          </div>
        )}

        {/* Contact Info */}
        <div className="mt-6 w-full space-y-3 border-t border-border pt-6">
          <div className="flex items-center gap-3 text-sm">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span className="truncate text-foreground">{employee?.user?.email ?? 'Non disponible'}</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <span className="text-foreground">{employee?.user?.tel ?? 'Non disponible'}</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span className="text-foreground">{employee?.address ?? employee?.department_name ?? 'Non disponible'}</span>
          </div>
          {employee?.cin && (
            <div className="flex items-center gap-3 text-sm">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-foreground">CIN : {employee.cin}</span>
            </div>
          )}
          <div className="flex items-center gap-3 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-foreground">
              Embauché le {employee?.hire_date ? formatLocalDate(employee.hire_date) : 'Non disponible'}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
