import { Handle, Position } from '@xyflow/react';
import { Building2, ChevronDown, ChevronRight, Crown, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { OrganigrammeDepartment } from '@/services/departmentService';

const UNIT_TYPE_COLORS: Record<string, string> = {
  pca: 'border-t-purple-600 bg-purple-600/10 text-purple-700 dark:text-purple-400',
  vice_president: 'border-t-indigo-600 bg-indigo-600/10 text-indigo-700 dark:text-indigo-400',
  dg: 'border-t-primary bg-primary/10 text-primary',
  dga: 'border-t-orange-600 bg-orange-600/10 text-orange-700 dark:text-orange-400',
  central_direction: 'border-t-amber-600 bg-amber-600/10 text-amber-700 dark:text-amber-400',
  direction: 'border-t-blue-600 bg-blue-600/10 text-blue-700 dark:text-blue-400',
  department: 'border-t-teal-600 bg-teal-600/10 text-teal-700 dark:text-teal-400',
  service: 'border-t-slate-500 bg-slate-500/10 text-slate-700 dark:text-slate-400',
};

export interface OrganigrammeDepartmentNodeData {
  department: OrganigrammeDepartment;
  hasChildren: boolean;
  isCollapsed: boolean;
  isMatch: boolean;
  isDimmed: boolean;
  onToggleCollapse: (departmentId: number) => void;
  [key: string]: unknown;
}

export default function OrganigrammeDepartmentNode({ data }: { data: OrganigrammeDepartmentNodeData }) {
  const { department, hasChildren, isCollapsed, isMatch, isDimmed, onToggleCollapse } = data;
  const colorClass = UNIT_TYPE_COLORS[department.unit_type] ?? UNIT_TYPE_COLORS.service;

  return (
    <div
      className={cn(
        'w-[220px] rounded-xl border border-t-4 bg-card shadow-sm transition-opacity',
        colorClass,
        isMatch && 'ring-2 ring-secondary',
        isDimmed && 'opacity-30'
      )}
    >
      <Handle type="target" position={Position.Top} className="!bg-border" />

      <div className="flex items-start gap-2 p-3">
        <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', colorClass)}>
          <Building2 className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <h4 className="truncate text-sm font-semibold text-foreground">{department.name}</h4>
          </div>
          <span className="text-[10px] font-medium uppercase text-muted-foreground">
            {department.unit_type_display}
          </span>
          {department.manager_name && (
            <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
              <Crown className="h-3 w-3 shrink-0" />
              {department.manager_name}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-border px-3 py-1.5">
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <Users className="h-3 w-3" />
          {department.employee_count} employé(s)
        </span>
        {hasChildren && (
          <button
            onClick={() => onToggleCollapse(department.id)}
            className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label={isCollapsed ? 'Déplier' : 'Replier'}
            title={isCollapsed ? 'Déplier' : 'Replier'}
          >
            {isCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-border" />
    </div>
  );
}
