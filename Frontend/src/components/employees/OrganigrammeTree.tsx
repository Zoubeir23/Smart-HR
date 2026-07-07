import { Building2, Users, Crown } from 'lucide-react';
import { OrganigrammeDepartment } from '@/services/departmentService';

interface OrganigrammeTreeProps {
  departments: OrganigrammeDepartment[];
}

/**
 * Rendu visuel automatique de la hiérarchie Département → Service → Poste,
 * dérivé directement de la structure existante (pas de ré-saisie manuelle).
 */
export default function OrganigrammeTree({ departments }: OrganigrammeTreeProps) {
  if (departments.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-16 text-center">
        <Building2 className="h-8 w-8 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">Aucun département à afficher.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {departments.map((department) => (
        <div key={department.id} className="rounded-xl border border-border bg-card shadow-sm">
          {/* Département — racine */}
          <div className="flex items-start justify-between gap-2 border-b border-border bg-primary/5 p-4 rounded-t-xl">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15">
                <Building2 className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">{department.name}</h3>
                {department.manager_name && (
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Crown className="h-3 w-3" />
                    {department.manager_name}
                  </p>
                )}
              </div>
            </div>
            <span className="flex shrink-0 items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              <Users className="h-3 w-3" />
              {department.employee_count}
            </span>
          </div>

          {/* Services + Postes */}
          <div className="space-y-3 p-4">
            {department.services.length === 0 ? (
              <p className="text-xs text-muted-foreground/70 italic">Aucun service rattaché.</p>
            ) : (
              department.services.map((service) => (
                <div key={service.id} className="relative pl-4 before:absolute before:left-0 before:top-2 before:h-[calc(100%-8px)] before:w-px before:bg-border">
                  <div className="relative before:absolute before:-left-4 before:top-3 before:h-px before:w-4 before:bg-border">
                    <div className="flex items-center justify-between gap-2 rounded-lg bg-muted/50 px-3 py-2">
                      <span className="text-sm font-medium text-foreground">{service.name}</span>
                      <span className="text-xs text-muted-foreground">{service.employee_count} employé{service.employee_count > 1 ? 's' : ''}</span>
                    </div>
                  </div>
                  {service.positions.length > 0 && (
                    <ul className="mt-2 space-y-1 pl-4">
                      {service.positions.map((position) => (
                        <li
                          key={position.id}
                          className="relative flex items-center justify-between gap-2 text-xs text-muted-foreground before:absolute before:-left-4 before:top-1/2 before:h-px before:w-4 before:bg-border/70"
                        >
                          <span>{position.title}</span>
                          <span className="shrink-0 rounded-full bg-secondary/10 px-1.5 py-0.5 text-[10px] font-medium text-secondary-foreground">
                            {position.employee_count}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
