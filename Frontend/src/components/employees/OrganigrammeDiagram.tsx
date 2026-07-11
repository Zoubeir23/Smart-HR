import { useMemo, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Briefcase, Building2, RefreshCw, Search, Users, UserRoundCog } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { OrganigrammeDepartment } from '@/services/departmentService';
import OrganigrammeDepartmentNode, {
  type OrganigrammeDepartmentNodeData,
} from './OrganigrammeDepartmentNode';

interface OrganigrammeDiagramProps {
  departments: OrganigrammeDepartment[];
}

const NODE_WIDTH = 220;
const NODE_HEIGHT = 120;
const HORIZONTAL_GAP = 40;
const VERTICAL_GAP = 90;

const nodeTypes = { department: OrganigrammeDepartmentNode };

function countLeaves(department: OrganigrammeDepartment, collapsed: Set<number>): number {
  if (collapsed.has(department.id) || department.children.length === 0) return 1;
  return department.children.reduce((sum, child) => sum + countLeaves(child, collapsed), 0);
}

function countAllDepartments(departments: OrganigrammeDepartment[]): number {
  return departments.reduce((sum, dept) => sum + 1 + countAllDepartments(dept.children), 0);
}

function sumEmployeeCount(departments: OrganigrammeDepartment[]): number {
  return departments.reduce((sum, dept) => sum + dept.employee_count + sumEmployeeCount(dept.children), 0);
}

function countManagers(departments: OrganigrammeDepartment[]): number {
  return departments.reduce(
    (sum, dept) => sum + (dept.manager_name ? 1 : 0) + countManagers(dept.children),
    0
  );
}

function collectAllIds(departments: OrganigrammeDepartment[]): number[] {
  return departments.flatMap((dept) => [dept.id, ...collectAllIds(dept.children)]);
}

function collectIdsWithChildren(departments: OrganigrammeDepartment[]): number[] {
  return departments.flatMap((dept) =>
    dept.children.length > 0 ? [dept.id, ...collectIdsWithChildren(dept.children)] : []
  );
}

function buildLayout(
  roots: OrganigrammeDepartment[],
  collapsed: Set<number>,
  searchTerm: string,
  onToggleCollapse: (departmentId: number) => void
): { nodes: Node<OrganigrammeDepartmentNodeData>[]; edges: Edge[] } {
  const nodes: Node<OrganigrammeDepartmentNodeData>[] = [];
  const edges: Edge[] = [];
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const hasSearch = normalizedSearch.length > 0;
  let cursor = 0;

  function place(
    department: OrganigrammeDepartment,
    depth: number,
    parentId?: string
  ): { x: number; hasMatchInSubtree: boolean } {
    const isCollapsed = collapsed.has(department.id);
    const children = isCollapsed ? [] : department.children;
    const isMatch = hasSearch && department.name.toLowerCase().includes(normalizedSearch);

    let x: number;
    let descendantHasMatch = false;
    if (children.length === 0) {
      x = cursor * (NODE_WIDTH + HORIZONTAL_GAP);
      cursor += 1;
    } else {
      const childResults = children.map((child) => place(child, depth + 1, String(department.id)));
      x = (childResults[0].x + childResults[childResults.length - 1].x) / 2;
      descendantHasMatch = childResults.some((result) => result.hasMatchInSubtree);
    }

    // Un ancêtre d'une unité trouvée reste pleinement visible (non estompé)
    // pour conserver le contexte hiérarchique du résultat de recherche.
    const hasMatchInSubtree = isMatch || descendantHasMatch;

    nodes.push({
      id: String(department.id),
      type: 'department',
      position: { x, y: depth * (NODE_HEIGHT + VERTICAL_GAP) },
      data: {
        department,
        hasChildren: department.children.length > 0,
        isCollapsed,
        isMatch,
        isDimmed: hasSearch && !hasMatchInSubtree,
        onToggleCollapse,
      },
    });

    if (parentId) {
      edges.push({
        id: `${parentId}-${department.id}`,
        source: parentId,
        target: String(department.id),
        type: 'smoothstep',
        style: { stroke: 'hsl(var(--border))', strokeWidth: 1.5 },
      });
    }

    return { x, hasMatchInSubtree };
  }

  roots.forEach((root) => place(root, 0));
  return { nodes, edges };
}

/**
 * Diagramme d'organigramme interactif (zoom/pan, déplier/replier, recherche)
 * — remplace l'ancienne grille statique (`OrganigrammeTree`) par un vrai
 * rendu en nœuds reliés, inspiré des SIRH concurrents (TargetYM AI).
 * La disposition (x/y) est calculée côté client par un algorithme récursif
 * simple (moyenne des positions des enfants), sans dépendance de layout
 * externe supplémentaire.
 */
export default function OrganigrammeDiagram({ departments }: OrganigrammeDiagramProps) {
  const [collapsedIds, setCollapsedIds] = useState<Set<number>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');

  const toggleCollapse = (departmentId: number) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(departmentId)) next.delete(departmentId);
      else next.add(departmentId);
      return next;
    });
  };

  const expandAll = () => setCollapsedIds(new Set());
  const collapseAll = () => setCollapsedIds(new Set(collectIdsWithChildren(departments)));

  const { nodes, edges } = useMemo(
    () => buildLayout(departments, collapsedIds, searchTerm, toggleCollapse),
    [departments, collapsedIds, searchTerm]
  );

  const totalUnits = useMemo(() => countAllDepartments(departments), [departments]);
  const totalEmployees = useMemo(() => sumEmployeeCount(departments), [departments]);
  const totalManagers = useMemo(() => countManagers(departments), [departments]);
  const visibleLeaves = useMemo(
    () => departments.reduce((sum, dept) => sum + countLeaves(dept, collapsedIds), 0),
    [departments, collapsedIds]
  );

  if (departments.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-16 text-center">
        <Building2 className="h-8 w-8 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">Aucune unité à afficher.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <Users className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-xl font-bold text-foreground">{totalEmployees}</p>
            <p className="text-xs text-muted-foreground">Collaborateurs</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary/10">
            <Briefcase className="h-4 w-4 text-secondary" />
          </div>
          <div>
            <p className="text-xl font-bold text-foreground">{totalUnits}</p>
            <p className="text-xs text-muted-foreground">Unités</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10">
            <UserRoundCog className="h-4 w-4 text-amber-600" />
          </div>
          <div>
            <p className="text-xl font-bold text-foreground">{totalManagers}</p>
            <p className="text-xs text-muted-foreground">Managers</p>
          </div>
        </div>
      </div>

      {/* Contrôles */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher une unité…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
        <Button variant="outline" size="sm" onClick={expandAll}>
          Déplier tout
        </Button>
        <Button variant="outline" size="sm" onClick={collapseAll}>
          Replier tout
        </Button>
        <Button variant="outline" size="sm" onClick={() => setCollapsedIds(new Set())}>
          <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
          Actualiser
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        {visibleLeaves} unité(s) visible(s) · touchez une carte pour voir le détail · icône pour déplier/replier
      </p>

      {/* Diagramme — hauteur bornée par le viewport pour que les contrôles
          de zoom (bas gauche) et la minimap (bas droite) restent visibles
          sans avoir à faire défiler la page. */}
      <div className="h-[clamp(420px,calc(100vh_-_400px),600px)] w-full overflow-hidden rounded-xl border border-border bg-muted/20">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          minZoom={0.2}
          maxZoom={1.5}
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={16} color="hsl(var(--border))" />
          <Controls showInteractive={false} />
          <MiniMap
            pannable
            zoomable
            className="!bg-card"
            nodeColor="hsl(var(--primary) / 0.35)"
            nodeStrokeColor="hsl(var(--primary))"
            maskColor="hsl(var(--muted) / 0.6)"
          />
        </ReactFlow>
      </div>
    </div>
  );
}
