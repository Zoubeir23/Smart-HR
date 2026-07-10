import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { Network } from 'lucide-react';
import OrganigrammeDiagram from '@/components/employees/OrganigrammeDiagram';
import { departmentService } from '@/services/departmentService';

export default function OrganigrammePage() {
  const { data: organigrammeData, isLoading } = useQuery({
    queryKey: ['departments', 'organigramme'],
    queryFn: departmentService.getOrganigramme,
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Network className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Organigramme</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Généré automatiquement à partir des unités organisationnelles — zoom, recherche et
            branches dépliables.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <p className="text-muted-foreground">Génération de l'organigramme…</p>
        </div>
      ) : (
        <OrganigrammeDiagram departments={organigrammeData ?? []} />
      )}
    </motion.div>
  );
}
