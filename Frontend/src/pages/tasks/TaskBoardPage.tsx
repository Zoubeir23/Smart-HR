import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { taskService } from '@/services/taskService';
import { employeeService } from '@/services/employeeService';
import { useToast } from '@/hooks/use-toast';
import DashboardLayout from '@/components/layout/DashboardLayout';
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
import { Plus, MoreVertical, Calendar, Flag, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done';
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

const columnConfig = {
  todo: { title: 'À faire', color: 'bg-muted' },
  in_progress: { title: 'En cours', color: 'bg-secondary/10' },
  review: { title: 'En revue', color: 'bg-warning/10' },
  done: { title: 'Terminée', color: 'bg-success/10' },
};

const priorityConfig = {
  low: { label: 'Faible', className: 'bg-muted text-muted-foreground' },
  medium: { label: 'Moyen', className: 'bg-warning text-warning-foreground' },
  high: { label: 'Élevé', className: 'bg-destructive text-destructive-foreground' },
};

const TaskBoardPage = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    assignee: '',
    priority: 'medium' as TaskPriority,
    due_date: '',
  });

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
    status: (t.status as TaskStatus) || 'todo',
    description: (t.description as string) || '',
  }));

  const employees = employeesData?.results || employeesData || [];

  const createTaskMutation = useMutation({
    mutationFn: (taskData: Record<string, unknown>) => taskService.create(taskData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setIsDialogOpen(false);
      setNewTask({ title: '', description: '', assignee: '', priority: 'medium', due_date: '' });
      toast({
        title: 'Tâche créée',
        description: 'La tâche a été créée avec succès.',
      });
    },
    onError: () => {
      toast({
        title: 'Erreur',
        description: 'Impossible de créer la tâche. Veuillez réessayer.',
        variant: 'destructive',
      });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      taskService.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast({
        title: 'Statut mis à jour',
        description: 'Le statut de la tâche a été modifié.',
      });
    },
  });

  const getTasksByStatus = (status: TaskStatus) => {
    return tasks.filter(task => task.status === status);
  };

  const moveTask = (taskId: string, newStatus: TaskStatus) => {
    updateStatusMutation.mutate({ id: Number(taskId), status: newStatus });
  };

  const TaskCard = ({ task }: { task: Task }) => (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer">
        <div className="flex items-start justify-between mb-3">
          <h3 className="font-semibold text-sm text-foreground line-clamp-2">
            {task.title}
          </h3>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Déplacer vers</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {Object.entries(columnConfig).map(([status, config]) => (
                <DropdownMenuItem
                  key={status}
                  onClick={() => moveTask(task.id, status as TaskStatus)}
                  disabled={task.status === status}
                >
                  {config.title}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center gap-2 mb-3">
          <Avatar className="h-6 w-6">
            <AvatarFallback className="text-xs bg-primary text-primary-foreground">
              {task.assigneeInitials}
            </AvatarFallback>
          </Avatar>
          <span className="text-xs text-muted-foreground">{task.assignee}</span>
        </div>

        <div className="flex items-center justify-between">
          <Badge className={priorityConfig[task.priority].className}>
            <Flag className="mr-1 h-3 w-3" />
            {priorityConfig[task.priority].label}
          </Badge>
          <div className="flex items-center text-xs text-muted-foreground">
            <Calendar className="mr-1 h-3 w-3" />
            {new Date(task.dueDate).toLocaleDateString('fr-FR', {
              day: '2-digit',
              month: 'short',
            })}
          </div>
        </div>
      </Card>
    </motion.div>
  );

  return (
    <DashboardLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-6"
      >
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Tableau des Tâches</h1>
            <p className="text-muted-foreground mt-1">
              Gérez vos tâches avec une vue Kanban
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary text-primary-foreground">
                <Plus className="mr-2 h-4 w-4" />
                Nouvelle tâche
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Créer une nouvelle tâche</DialogTitle>
                <DialogDescription>
                  Remplissez les informations de la tâche
                </DialogDescription>
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
                    <Select
                      value={newTask.assignee}
                      onValueChange={(value) => setNewTask({ ...newTask, assignee: value })}
                    >
                      <SelectTrigger id="assignee">
                        <SelectValue placeholder="Sélectionner" />
                      </SelectTrigger>
                      <SelectContent>
                        {employees.map((emp: { id: number; user: { first_name: string; last_name: string } }) => (
                          <SelectItem key={emp.id} value={String(emp.id)}>
                            {emp.user?.first_name} {emp.user?.last_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                <Button
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Annuler
                </Button>
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
        </div>

        {/* Kanban Board */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-3 text-muted-foreground">Chargement des tâches...</span>
          </div>
        ) : null}
        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 ${isLoading ? 'hidden' : ''}`}>
          {Object.entries(columnConfig).map(([status, config]) => {
            const columnTasks = getTasksByStatus(status as TaskStatus);
            return (
              <div key={status} className="flex flex-col">
                <div className={`${config.color} rounded-t-lg p-4 border border-border`}>
                  <div className="flex items-center justify-between">
                    <h2 className="font-semibold text-foreground">{config.title}</h2>
                    <Badge variant="secondary" className="bg-card">
                      {columnTasks.length}
                    </Badge>
                  </div>
                </div>
                <div className="flex-1 border-l border-r border-b border-border rounded-b-lg p-4 bg-card space-y-3 min-h-[400px]">
                  {columnTasks.map(task => (
                    <TaskCard key={task.id} task={task} />
                  ))}
                  {columnTasks.length === 0 && (
                    <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                      Aucune tâche
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>
    </DashboardLayout>
  );
};

export default TaskBoardPage;
