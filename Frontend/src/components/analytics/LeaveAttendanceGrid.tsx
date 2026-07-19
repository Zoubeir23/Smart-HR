interface LeaveAttendanceGridProps {
  leave: { total: number; approved: number; pending: number; rejected: number };
  attendance: { total: number; present: number; absent: number; late: number };
}

export function LeaveAttendanceGrid({ leave, attendance }: LeaveAttendanceGridProps) {
  const attendanceRate =
    attendance.total > 0
      ? Math.round((attendance.present / attendance.total) * 100)
      : 0;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Congés (période sélectionnée)
        </p>
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total</span>
            <span className="font-medium">{leave.total}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-green-600 dark:text-green-400">Approuvés</span>
            <span className="font-medium text-green-600 dark:text-green-400">{leave.approved}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-amber-600 dark:text-amber-400">En attente</span>
            <span className="font-medium text-amber-600 dark:text-amber-400">{leave.pending}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-destructive">Refusés</span>
            <span className="font-medium text-destructive">{leave.rejected}</span>
          </div>
        </div>
      </div>
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Présences (période sélectionnée)
        </p>
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Taux présence</span>
            <span className="font-bold text-primary">{attendanceRate}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-green-600 dark:text-green-400">Présents</span>
            <span className="font-medium text-green-600 dark:text-green-400">{attendance.present}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-destructive">Absents</span>
            <span className="font-medium text-destructive">{attendance.absent}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-amber-600 dark:text-amber-400">Retards</span>
            <span className="font-medium text-amber-600 dark:text-amber-400">{attendance.late}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
