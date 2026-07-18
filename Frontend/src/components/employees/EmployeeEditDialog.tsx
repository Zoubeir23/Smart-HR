import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface EditEmployeeForm {
  department: string;
  position: string;
  salary: string;
  status: string;
  address: string;
}

interface EmployeeEditDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  form: EditEmployeeForm;
  onFormChange: (form: EditEmployeeForm) => void;
  departments: Array<{ id: number; name: string }>;
  positions: Array<{ id: number; title: string; department: number }>;
  isPending: boolean;
  onSubmit: () => void;
}

export function EmployeeEditDialog({
  isOpen,
  onOpenChange,
  form,
  onFormChange,
  departments,
  positions,
  isPending,
  onSubmit,
}: EmployeeEditDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Modifier l'employé</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid gap-2">
            <Label>Département</Label>
            <Select
              value={form.department}
              onValueChange={(value) => onFormChange({ ...form, department: value, position: '' })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un département" />
              </SelectTrigger>
              <SelectContent>
                {departments.map((dept) => (
                  <SelectItem key={dept.id} value={String(dept.id)}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Poste</Label>
            <Select
              value={form.position}
              onValueChange={(value) => onFormChange({ ...form, position: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un poste" />
              </SelectTrigger>
              <SelectContent>
                {positions
                  .filter((pos) => !form.department || String(pos.department) === form.department)
                  .map((pos) => (
                    <SelectItem key={pos.id} value={String(pos.id)}>
                      {pos.title}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Salaire (FCFA)</Label>
            <Input
              type="number"
              value={form.salary}
              onChange={(e) => onFormChange({ ...form, salary: e.target.value })}
              placeholder="Ex: 1500000"
            />
          </div>
          <div className="grid gap-2">
            <Label>Statut</Label>
            <Select
              value={form.status}
              onValueChange={(value) => onFormChange({ ...form, status: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Actif</SelectItem>
                <SelectItem value="inactive">Inactif</SelectItem>
                <SelectItem value="on_leave">En congé</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Adresse</Label>
            <Input
              value={form.address}
              onChange={(e) => onFormChange({ ...form, address: e.target.value })}
              placeholder="Ex: Dakar, Sénégal"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={onSubmit} disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Sauvegarder
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
