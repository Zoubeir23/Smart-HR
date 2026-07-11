import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { taskService } from '@/services/taskService';
import { employeeService } from '@/services/employeeService';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import SearchableSelect from '@/components/common/SearchableSelect';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Plus, MoreVertical, Calendar, Flag, Loader2, GripVertical } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

type TaskStatus = 'todo' | 'in_progress' | 'in_review' | 'done';
type TaskPriority = 'low' | 'medium' | 'high';

interface Task {
  id: string;
  title: string;
  assignee: string;
  assigneeInitials: string;
  priority: TaskPriority;
  dueDate: string;
  status: TaskStatus;
  description: string;
}

const columnConfig: Record<TaskStatus, { title: string; color: string; accent: string; dotColor: string }> = {
  todo:        { title: 'À faire',   color: 'bg-muted/60',      accent: 'border-t-slate-400',    dotColor: 'bg-slate-400' },
  in_progress: { title: 'En cours',  color: 'bg-blue-500/5',    accent: 'border-t-blue-500',     dotColor: 'bg-blue-500' },
  in_review:   { title: 'En revue',  color: 'bg-amber-500/5',   accent: 'border-t-amber-500',    dotColor: 'bg-amber-500' },
  done:        { title: 'Terminée',  color: 'bg-emerald-500/5', accent: 'border-t-emerald-500',  dotColor: 'bg-emerald-500' },
};

const priorityConfig: Record<TaskPriority, { label: string; className: string }> = {
  low:    { label: 'Faible',  className: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' },
  medium: { label: 'Moyen',   className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400' },
  high:   { label: 'Élevé',   className: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400' },
};

/* ─── Draggable TaskCard ─── */
interface TaskCardProps {
  task: Task;
  onMove: (taskId: string, status: TaskStatus) => void;
  isDragging?: boolean;
  isOverlay?: boolean;
}

function TaskCard({ task, onMove, isDragging = false, isOverlay = false }: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isGhosted = isSortableDragging && !isOverlay;

  return (
    <div ref={setNodeRef} style={style}>
      <motion.div
        layout={!isOverlay}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: isGhosted ? 0.35 : 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.18 }}
      >
        <Card
          className={cn(
            'group relative p-3.5 transition-all duration-200',
            isOverlay
              ? 'rotate-[1.5deg] shadow-2xl ring-2 ring-primary/30 scale-[1.02]'
              : 'hover:shadow-md hover:-translate-y-0.5',
            isDragging && !isOverlay && 'opacity-40 scale-[0.98]'
          )}
        >
          {/* Drag handle + menu */}
          <div className="flex items-start justify-between mb-2.5 gap-2">
            <button
              {...attributes}
              {...listeners}
              className="mt-0.5 shrink-0 cursor-grab active:cursor-grabbing rounded p-0.5 text-muted-foreground/30 hover:text-muted-foreground/70 hover:bg-muted transition-colors focus:outline-none"
              aria-label="Déplacer la tâche"
              title="Glisser pour déplacer"
            >
              <GripVertical className="h-4 w-4" />
            </button>

            <h3 className="flex-1 font-semibold text-sm text-foreground line-clamp-2 leading-tight">
              {task.title}
            </h3>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel className="text-xs">Déplacer vers</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {(Object.entries(columnConfig) as [TaskStatus, typeof columnConfig[TaskStatus]][]).map(([status, config]) => (
                  <DropdownMenuItem
                    key={status}
                    onClick={() => onMove(task.id, status)}
                    disabled={task.status === status}
                    className="gap-2 text-sm"
                  >
                    <span className={cn('h-2 w-2 rounded-full', config.dotColor)} />
                    {config.title}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Assignee */}
          <div className="flex items-center gap-2 mb-3">
            <Avatar className="h-5 w-5">
              <AvatarFallback className="text-[10px] font-bold bg-primary/10 text-primary">
                {task.assigneeInitials || '?'}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs text-muted-foreground truncate">{task.assignee || '—'}</span>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between gap-2">
            <Badge className={cn('text-[11px] px-1.5 py-0 h-5 font-medium border-0', priorityConfig[task.priority].className)}>
              <Flag className="mr-1 h-2.5 w-2.5" />
              {priorityConfig[task.priority].label}
            </Badge>
            {task.dueDate && (
              <div className="flex items-center text-[11px] text-muted-foreground gap-1">
                <Calendar className="h-3 w-3 opacity-60" />
                {new Date(task.dueDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
              </div>
            )}
          </div>
        </Card>
      </motion.div>
    </div>
  );
}

/* ─── Drop Column ─── */
interface DropColumnProps {
  status: TaskStatus;
  tasks: Task[];
  onMove: (taskId: string, status: TaskStatus) => void;
  isOver: boolean;
}

function DropColumn({ status, tasks, onMove, isOver }: DropColumnProps) {
  const config = columnConfig[status];

  return (
    <div className="flex flex-col min-w-0">
      {/* Column header */}
      <div className={cn(
        'rounded-t-xl px-4 py-3 border border-b-0 border-border',
        'border-t-[3px]',
        config.accent,
        config.color
      )}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={cn('h-2 w-2 rounded-full', config.dotColor)} />
            <h2 className="font-semibold text-sm text-foreground">{config.title}</h2>
          </div>
          <Badge variant="secondary" className="h-5 min-w-5 text-[11px] px-1.5 tabular-nums">
            {tasks.length}
          </Badge>
        </div>
      </div>

      {/* Drop zone */}
      <div
        className={cn(
          'flex-1 border-l border-r border-b border-border rounded-b-xl p-3 min-h-[420px] transition-colors duration-150',
          isOver
            ? 'bg-primary/[0.04] border-primary/20'
            : 'bg-card'
        )}
      >
        <SortableContext
          items={tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2.5">
            <AnimatePresence mode="popLayout">
              {tasks.map((task) => (
                <TaskCard key={task.id} task={task} onMove={onMove} />
              ))}
            </AnimatePresence>
          </div>
        </SortableContext>

        {tasks.length === 0 && (
          <div className={cn(
            'flex flex-col items-center justify-center h-28 rounded-lg border-2 border-dashed transition-colors duration-150 mt-2',
            isOver ? 'border-primary/40 bg-primary/5' : 'border-border/50'
          )}>
            <span className={cn('h-5 w-5 rounded-full mb-1.5', config.dotColor, 'opacity-25')} />
            <p className="text-xs text-muted-foreground/50">
              {isOver ? 'Déposer ici' : 'Aucune tâche'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════ */
const TaskBoardPage = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  // Seuls RH/Admin créent des tâches ; l'employé déplace ses propres cartes.
  const canManage = user?.role === 'RH' || user?.role === 'ADMIN';
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeDragTask, setActiveDragTask] = useState<Task | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    assignee: '',
    priority: 'medium' as TaskPriority,
    due_date: '',
  });

  // Track optimistic status changes to avoid waiting for server
  const optimisticStatusRef = useRef<Record<string, TaskStatus>>({});

  /* ─── Queries ─── */
  const { data: tasksData, isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => taskService.getAll(),
  });

  const { data: employeesData } = useQuery({
    queryKey: ['employees-list'],
    queryFn: () => employeeService.getAll(),
  });

  const rawTasks = tasksData?.results || tasksData || [];
  const tasks: Task[] = rawTasks.map((t: Record<string, unknown>) => ({
    id: String(t.id),
    title: (t.title as string) || '',
    assignee: (t.assignee_name as string) || (t.assignee as string) || '',
    assigneeInitials: ((t.assignee_name as string) || (t.assignee as string) || '')
      .split(' ')
      .map((n: string) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2),
    priority: (t.priority as TaskPriority) || 'medium',
    dueDate: (t.due_date as string) || (t.dueDate as string) || '',
    status: optimisticStatusRef.current[String(t.id)] ?? ((t.status as TaskStatus) || 'todo'),
    description: (t.description as string) || '',
  }));

  const employees = employeesData?.results || employeesData || [];

  /* ─── Mutations ─── */
  const createTaskMutation = useMutation({
    mutationFn: (taskData: Record<string, unknown>) => taskService.create(taskData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setIsDialogOpen(false);
      setNewTask({ title: '', description: '', assignee: '', priority: 'medium', due_date: '' });
      toast({ title: 'Tâche créée', description: 'La tâche a été ajoutée au tableau.' });
    },
    onError: () => {
      toast({ title: 'Erreur', description: 'Impossible de créer la tâche.', variant: 'destructive' });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      taskService.updateStatus(id, status),
    onSuccess: (_, variables) => {
      delete optimisticStatusRef.current[String(variables.id)];
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast({ title: 'Statut mis à jour', description: `Déplacé vers "${columnConfig[variables.status as TaskStatus]?.title}".` });
    },
    onError: (_, variables) => {
      delete optimisticStatusRef.current[String(variables.id)];
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast({ title: 'Erreur', description: 'Impossible de mettre à jour le statut.', variant: 'destructive' });
    },
  });

  const moveTask = (taskId: string, newStatus: TaskStatus) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === newStatus) return;
    optimisticStatusRef.current[taskId] = newStatus;
    updateStatusMutation.mutate({ id: Number(taskId), status: newStatus });
  };

  const getTasksByStatus = (status: TaskStatus) =>
    tasks.filter((t) => t.status === status);

  /* ─── DnD sensors ─── */
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor)
  );

  const handleDragStart = ({ active }: DragStartEvent) => {
    const task = tasks.find((t) => t.id === active.id);
    if (task) setActiveDragTask(task);
  };

  const handleDragOver = ({ over }: DragOverEvent) => {
    setOverId(over ? String(over.id) : null);
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveDragTask(null);
    setOverId(null);
    if (!over) return;

    const draggedTask = tasks.find((t) => t.id === active.id);
    if (!draggedTask) return;

    // Determine target column: over.id is either a column status or a task id
    const targetStatus = (Object.keys(columnConfig) as TaskStatus[]).find(
      (s) => s === over.id
    ) ?? tasks.find((t) => t.id === over.id)?.status;

    if (targetStatus && targetStatus !== draggedTask.status) {
      moveTask(draggedTask.id, targetStatus);
    }
  };

  /* ─── Helper: is column being dragged over ─── */
  const isColumnOver = (status: TaskStatus) => {
    if (!overId || !activeDragTask) return false;
    if (overId === status) return true;
    const overTask = tasks.find((t) => t.id === overId);
    return overTask?.status === status;
  };

  return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="space-y-6"
      >
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Tableau des Tâches</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Glissez les cartes entre les colonnes ou utilisez le menu <MoreVertical className="inline h-3.5 w-3.5" /> pour changer le statut
            </p>
          </div>

          {canManage && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary text-primary-foreground gap-2">
                <Plus className="h-4 w-4" />
                Nouvelle tâche
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Créer une nouvelle tâche</DialogTitle>
                <DialogDescription>Remplissez les informations de la tâche</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="title">Titre</Label>
                  <Input
                    id="title"
                    placeholder="Titre de la tâche"
                    value={newTask.title}
                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Description détaillée"
                    rows={3}
                    value={newTask.description}
                    onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="assignee">Assigné à</Label>
                    <SearchableSelect
                      id="assignee"
                      value={newTask.assignee}
                      onChange={(value) => setNewTask({ ...newTask, assignee: value })}
                      placeholder="Sélectionner un employé"
                      searchPlaceholder="Rechercher un employé…"
                      emptyText="Aucun employé trouvé."
                      options={employees.map((emp: { id: number; user: { first_name: string; last_name: string } }) => ({
                        value: String(emp.id),
                        label: `${emp.user?.first_name ?? ''} ${emp.user?.last_name ?? ''}`.trim(),
                      }))}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="priority">Priorité</Label>
                    <Select
                      value={newTask.priority}
                      onValueChange={(value) => setNewTask({ ...newTask, priority: value as TaskPriority })}
                    >
                      <SelectTrigger id="priority">
                        <SelectValue placeholder="Sélectionner" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Faible</SelectItem>
                        <SelectItem value="medium">Moyen</SelectItem>
                        <SelectItem value="high">Élevé</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="due-date">Date d'échéance</Label>
                  <Input
                    id="due-date"
                    type="date"
                    value={newTask.due_date}
                    onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Annuler</Button>
                <Button
                  className="bg-primary text-primary-foreground"
                  onClick={() => createTaskMutation.mutate({
                    title: newTask.title,
                    description: newTask.description,
                    assignee: newTask.assignee,
                    priority: newTask.priority,
                    due_date: newTask.due_date,
                    status: 'todo',
                  })}
                  disabled={createTaskMutation.isPending || !newTask.title || !newTask.assignee}
                >
                  {createTaskMutation.isPending ? 'Création...' : 'Créer'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          )}
        </div>

        {/* Kanban board */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-3 text-muted-foreground">Chargement des tâches...</span>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              {(Object.keys(columnConfig) as TaskStatus[]).map((status) => (
                <DropColumn
                  key={status}
                  status={status}
                  tasks={getTasksByStatus(status)}
                  onMove={moveTask}
                  isOver={isColumnOver(status)}
                />
              ))}
            </div>

            <DragOverlay dropAnimation={{ duration: 160, easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)' }}>
              {activeDragTask && (
                <TaskCard
                  task={activeDragTask}
                  onMove={moveTask}
                  isOverlay
                />
              )}
            </DragOverlay>
          </DndContext>
        )}
      </motion.div>
  );
};

export default TaskBoardPage;
