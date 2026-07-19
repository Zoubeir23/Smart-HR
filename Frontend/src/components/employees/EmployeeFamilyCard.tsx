import { useState } from 'react';
import { Loader2, Plus, Trash2, Users, X } from 'lucide-react';
import { formatLocalDate } from '@/components/employees/employeeDetailHelpers';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface FamilyMember {
  id: number;
  relationship: string;
  relationship_display: string;
  first_name: string;
  last_name: string;
  date_of_birth: string | null;
  gender: string;
  age: number | null;
}

export interface FamilyMemberFormValues {
  relationship: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: string;
}

const EMPTY_FAMILY_MEMBER_FORM: FamilyMemberFormValues = {
  relationship: 'child',
  first_name: '',
  last_name: '',
  date_of_birth: '',
  gender: '',
};

interface EmployeeFamilyCardProps {
  familyMembers: FamilyMember[];
  isAddPending: boolean;
  onAdd: (values: FamilyMemberFormValues) => void;
  onDelete: (memberId: number) => void;
}

export function EmployeeFamilyCard({ familyMembers, isAddPending, onAdd, onDelete }: EmployeeFamilyCardProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState<FamilyMemberFormValues>(EMPTY_FAMILY_MEMBER_FORM);

  const handleSubmit = () => {
    onAdd(form);
    setShowAddForm(false);
    setForm(EMPTY_FAMILY_MEMBER_FORM);
  };

  return (
    <Card className="border border-border shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Users className="h-5 w-5 text-primary" />
          Situation familiale
        </CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAddForm((previous) => !previous)}
          className="gap-1"
        >
          {showAddForm ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
          {showAddForm ? 'Annuler' : 'Ajouter'}
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {showAddForm && (
          <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs">Lien</Label>
                <Select
                  value={form.relationship}
                  onValueChange={(value) => setForm((previous) => ({ ...previous, relationship: value }))}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="spouse">Conjoint(e)</SelectItem>
                    <SelectItem value="child">Enfant</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Genre</Label>
                <Select
                  value={form.gender}
                  onValueChange={(value) => setForm((previous) => ({ ...previous, gender: value }))}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="M">Masculin</SelectItem>
                    <SelectItem value="F">Féminin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs">Prénom <span className="text-destructive">*</span></Label>
                <Input
                  className="h-8 text-sm"
                  value={form.first_name}
                  onChange={(e) => setForm((previous) => ({ ...previous, first_name: e.target.value }))}
                  placeholder="Prénom"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Nom <span className="text-destructive">*</span></Label>
                <Input
                  className="h-8 text-sm"
                  value={form.last_name}
                  onChange={(e) => setForm((previous) => ({ ...previous, last_name: e.target.value }))}
                  placeholder="Nom"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Date de naissance</Label>
              <Input
                type="date"
                className="h-8 text-sm"
                value={form.date_of_birth}
                onChange={(e) => setForm((previous) => ({ ...previous, date_of_birth: e.target.value }))}
              />
            </div>
            <Button
              size="sm"
              className="w-full"
              disabled={!form.first_name || !form.last_name || isAddPending}
              onClick={handleSubmit}
            >
              {isAddPending && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
              Enregistrer
            </Button>
          </div>
        )}

        {familyMembers.length === 0 && !showAddForm && (
          <p className="py-4 text-center text-sm text-muted-foreground">Aucun membre de la famille enregistré.</p>
        )}

        {familyMembers.map((member) => (
          <div key={member.id} className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
            <div>
              <p className="font-medium text-foreground">
                {member.first_name} {member.last_name}
              </p>
              <p className="text-xs text-muted-foreground">
                {member.relationship_display}
                {member.age !== null ? ` · ${member.age} ans` : ''}
                {member.date_of_birth ? ` · né(e) le ${formatLocalDate(member.date_of_birth)}` : ''}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              onClick={() => onDelete(member.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
