import { Building2 } from 'lucide-react';
import { DepartmentHierarchyEntry } from '@/services/analyticsService';

interface OrganigrammeSummaryTreeProps {
  data: DepartmentHierarchyEntry[];
}

interface TreeNode extends DepartmentHierarchyEntry {
  children: TreeNode[];
}

function buildTree(entries: DepartmentHierarchyEntry[]): TreeNode[] {
  const nodesById = new Map<number, TreeNode>(entries.map((entry) => [entry.id, { ...entry, children: [] }]));
  const roots: TreeNode[] = [];

  for (const node of nodesById.values()) {
    if (node.parent_id !== null && nodesById.has(node.parent_id)) {
      nodesById.get(node.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

function TreeNodeItem({ node, depth }: { node: TreeNode; depth: number }) {
  return (
    <div>
      <div
        className="flex items-center justify-between gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-sm"
        style={{ marginLeft: depth * 20 }}
      >
        <span className="flex items-center gap-1.5 font-medium text-foreground">
          <Building2 className="h-3.5 w-3.5 text-primary" />
          {node.name}
        </span>
        <span className="text-xs text-muted-foreground">{node.employee_count} employé(s)</span>
      </div>
      {node.children.length > 0 && (
        <div className="mt-1.5 space-y-1.5">
          {node.children.map((child) => (
            <TreeNodeItem key={child.id} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Vue compacte de la structure d'organigramme pour People Analytics —
 * reconstruit l'arbre côté client à partir de `parent_id`, sans dupliquer le
 * rendu détaillé de la page Organigramme dédiée (OrganigrammeTree).
 */
export default function OrganigrammeSummaryTree({ data }: OrganigrammeSummaryTreeProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
        Aucun département disponible
      </div>
    );
  }

  const tree = buildTree(data);

  return (
    <div className="max-h-64 space-y-1.5 overflow-y-auto">
      {tree.map((node) => (
        <TreeNodeItem key={node.id} node={node} depth={0} />
      ))}
    </div>
  );
}
