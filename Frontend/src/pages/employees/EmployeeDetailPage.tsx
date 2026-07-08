import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Briefcase,
  Star,
  AlertTriangle,
  Loader2,
  Pencil,
  Users,
  FileText,
  Plus,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { employeeService } from '@/services/employeeService';
import { documentService } from '@/services/documentService';
import OnboardingProgramsCard from '@/components/employees/OnboardingProgramsCard';
import ObjectivesCard from '@/components/employees/ObjectivesCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

// Deterministic corporate avatar colors from name
const avatarColors = [
  'bg-blue-600',
  'bg-indigo-600',
  'bg-teal-600',
  'bg-emerald-600',
  'bg-sky-600',
  'bg-slate-600',
];

function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return avatarColors[Math.abs(hash) % avatarColors.length];
}

const statusStyles = {
  active: 'bg-success/20 text-success border-success/30',
  inactive: 'bg-destructive/20 text-destructive border-destructive/30',
  on_leave: 'bg-warning/20 text-warning border-warning/30',
};

const statusLabels = {
  active: 'Actif',
  inactive: 'Inactif',
  on_leave: 'En congé',
};

const leaveStatusStyles: Record<string, string> = {
  approved: 'bg-success/20 text-success border-success/30',
  pending: 'bg-warning/20 text-warning border-warning/30',
  rejected: 'bg-destructive/20 text-destructive border-destructive/30',
};

const leaveStatusLabels: Record<string, string> = {
  approved: 'Approuvé',
  pending: 'En attente',
  rejected: 'Refusé',
};

// new Date("YYYY-MM-DD") is parsed as UTC midnight, causing a -1 day shift in UTC-
// negative timezones. Passing year/month/day separately uses the local clock instead.
function formatLocalDate(dateString: string): string {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('fr-FR');
}

function getRiskLevel(score: number) {
  if (score < 30) return { label: 'Faible', color: 'text-success', bgColor: 'bg-success' };
  if (score < 60) return { label: 'Modéré', color: 'text-warning', bgColor: 'bg-warning' };
  return { label: 'Élevé', color: 'text-destructive', bgColor: 'bg-destructive' };
}

interface EditEmployeeForm {
  department: string;
  position: string;
  salary: string;
  status: string;
  address: string;
}

export default function EmployeeDetailPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState<EditEmployeeForm>({
    department: '',
    position: '',
    salary: '',
    status: '',
    address: '',
  });
  const [showAddFamilyMemberForm, setShowAddFamilyMemberForm] = useState(false);
  const [familyMemberForm, setFamilyMemberForm] = useState({
    relationship: 'child',
    first_name: '',
    last_name: '',
    date_of_birth: '',
    gender: '',
  });

  const { data: employee, isLoading } = useQuery({
    queryKey: ['employee', id],
    queryFn: () => employeeService.getById(Number(id)),
    enabled: !!id,
  });

  const { data: departmentsData } = useQuery({
    queryKey: ['departments'],
    queryFn: employeeService.getDepartments,
    enabled: isEditDialogOpen,
  });

  const { data: positionsData } = useQuery({
    queryKey: ['positions'],
    queryFn: employeeService.getPositions,
    enabled: isEditDialogOpen,
  });

  const departments = departmentsData?.results ?? departmentsData ?? [];
  const positions = positionsData?.results ?? positionsData ?? [];

  const { data: familyMembersData, refetch: refetchFamilyMembers } = useQuery({
    queryKey: ['family-members', id],
    queryFn: () => employeeService.getFamilyMembers(Number(id)),
    enabled: !!id,
  });
  const familyMembers: Array<{
    id: number;
    relationship: string;
    relationship_display: string;
    first_name: string;
    last_name: string;
    date_of_birth: string | null;
    gender: string;
    age: number | null;
  }> = familyMembersData ?? [];

  const { data: employeeDocuments, refetch: refetchDocuments } = useQuery({
    queryKey: ['employee-documents', id],
    queryFn: () => documentService.getAll({ employee: Number(id) }),
    enabled: !!id,
  });
  const documents: Array<{
    id: number;
    name: string;
    document_type: string;
    file: string;
    created_at: string;
  }> = employeeDocuments?.results ?? employeeDocuments ?? [];

  const updateMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => employeeService.update(Number(id), data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee', id] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success('Employé mis à jour avec succès.');
      setIsEditDialogOpen(false);
    },
    onError: () => {
      toast.error('Erreur lors de la mise à jour.');
    },
  });

  const disableMutation = useMutation({
    mutationFn: () => employeeService.update(Number(id), { status: 'inactive' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee', id] });
      toast.success('Employé désactivé.');
    },
    onError: () => {
      toast.error('Erreur lors de la désactivation.');
    },
  });

  const addFamilyMemberMutation = useMutation({
    mutationFn: () => employeeService.addFamilyMember({
      employee: Number(id),
      relationship: familyMemberForm.relationship,
      first_name: familyMemberForm.first_name,
      last_name: familyMemberForm.last_name,
      date_of_birth: familyMemberForm.date_of_birth || undefined,
      gender: familyMemberForm.gender || undefined,
    }),
    onSuccess: () => {
      refetchFamilyMembers();
      setShowAddFamilyMemberForm(false);
      setFamilyMemberForm({ relationship: 'child', first_name: '', last_name: '', date_of_birth: '', gender: '' });
      toast.success('Membre de la famille ajouté.');
    },
    onError: () => toast.error('Erreur lors de l\'ajout.'),
  });

  const deleteFamilyMemberMutation = useMutation({
    mutationFn: (memberId: number) => employeeService.deleteFamilyMember(memberId),
    onSuccess: () => { refetchFamilyMembers(); toast.success('Membre supprimé.'); },
    onError: () => toast.error('Erreur lors de la suppression.'),
  });

  const deleteDocumentMutation = useMutation({
    mutationFn: (docId: number) => documentService.delete(docId),
    onSuccess: () => { refetchDocuments(); toast.success('Document supprimé.'); },
    onError: () => toast.error('Erreur lors de la suppression du document.'),
  });

  const handleDocumentUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('employee', String(id));
    formData.append('name', file.name);
    formData.append('file', file);
    formData.append('document_type', 'other');
    documentService.upload(formData)
      .then(() => { refetchDocuments(); toast.success('Document uploadé.'); })
      .catch(() => toast.error('Erreur lors de l\'upload.'));
  };

  // Ouvre automatiquement la modale d'édition si l'URL contient ?edit=true
  // (déclenché depuis le menu EmployeeCard → "Modifier")
  useEffect(() => {
    if (searchParams.get('edit') === 'true') {
      setIsEditDialogOpen(true);
    }
  }, [searchParams]);

  useEffect(() => {
    if (employee && isEditDialogOpen) {
      setEditForm({
        department: String(employee.department ?? ''),
        position: String(employee.position ?? ''),
        salary: String(employee.salary ?? ''),
        status: employee.status ?? 'active',
        address: employee.address ?? '',
      });
    }
  }, [employee, isEditDialogOpen]);

  const handleEditSubmit = () => {
    if (!editForm.salary || isNaN(Number(editForm.salary))) {
      toast.error('Le salaire doit être un nombre valide.');
      return;
    }
    updateMutation.mutate({
      department: Number(editForm.department),
      position: Number(editForm.position),
      salary: Number(editForm.salary),
      status: editForm.status,
      address: editForm.address,
    });
  };

  if (isLoading) {
    return (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">Chargement du profil...</p>
        </div>
    );
  }

  if (!employee) {
    return (
        <div className="flex flex-col items-center justify-center py-20">
          <h2 className="text-2xl font-bold text-foreground">Employé introuvable</h2>
          <p className="mt-2 text-muted-foreground">
            L'employé avec l'identifiant #{id} n'existe pas.
          </p>
          <Link to="/employees">
            <Button className="mt-6">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour aux employés
            </Button>
          </Link>
        </div>
    );
  }

  const fullName = `${employee?.user?.first_name ?? ''} ${employee?.user?.last_name ?? ''}`.trim();
  const avatarBg = getAvatarColor(`${employee?.user?.first_name ?? ''}${employee?.user?.last_name ?? ''}`);
  const risk = getRiskLevel(employee?.churn_risk ?? 0);
  const evaluations: { year: number; score: number; comment: string }[] = employee?.evaluations ?? [];
  const leaves: { balance: number; history: { type: string; start: string; end: string; status: string }[] } = employee?.leaves ?? { balance: 0, history: [] };

  return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {/* Back button + Actions */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Link to="/employees">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour aux employés
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.href = `mailto:${employee?.user?.email}`}
            >
              <Mail className="mr-2 h-4 w-4" />
              Envoyer un email
            </Button>
            <Button variant="outline" size="sm" onClick={() => setIsEditDialogOpen(true)}>
              <Pencil className="mr-2 h-4 w-4" />
              Modifier
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={disableMutation.isPending || employee?.status === 'inactive'}
              onClick={() => disableMutation.mutate()}
            >
              {disableMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Désactiver
            </Button>
          </div>
        </div>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Modifier l'employé</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="grid gap-2">
                <Label>Département</Label>
                <Select
                  value={editForm.department}
                  onValueChange={(value) => setEditForm((prev) => ({ ...prev, department: value, position: '' }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un département" />
                  </SelectTrigger>
                  <SelectContent>
                    {(departments as Array<{ id: number; name: string }>).map((dept) => (
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
                  value={editForm.position}
                  onValueChange={(value) => setEditForm((prev) => ({ ...prev, position: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un poste" />
                  </SelectTrigger>
                  <SelectContent>
                    {(positions as Array<{ id: number; title: string; department: number }>)
                      .filter((pos) => !editForm.department || String(pos.department) === editForm.department)
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
                  value={editForm.salary}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, salary: e.target.value }))}
                  placeholder="Ex: 1500000"
                />
              </div>
              <div className="grid gap-2">
                <Label>Statut</Label>
                <Select
                  value={editForm.status}
                  onValueChange={(value) => setEditForm((prev) => ({ ...prev, status: value }))}
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
                  value={editForm.address}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, address: e.target.value }))}
                  placeholder="Ex: Dakar, Sénégal"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Annuler
              </Button>
              <Button onClick={handleEditSubmit} disabled={updateMutation.isPending}>
                {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Sauvegarder
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Main Layout */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column: Profile Card */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="border border-border shadow-sm">
              <CardContent className="flex flex-col items-center p-6">
                {/* Large Avatar */}
                <div
                  className={cn(
                    'flex h-24 w-24 items-center justify-center rounded-full text-3xl font-bold text-white',
                    avatarBg
                  )}
                >
                  {employee?.user?.first_name?.[0] ?? ''}
                  {employee?.user?.last_name?.[0] ?? ''}
                </div>

                {/* Name and Position */}
                <h2 className="mt-4 text-xl font-bold text-foreground">{fullName}</h2>
                <p className="text-sm text-muted-foreground">{employee?.position_title ?? 'Non disponible'}</p>
                <p className="text-sm text-muted-foreground">{employee?.department_name ?? 'Non disponible'}</p>

                {/* Status Badge */}
                <Badge
                  variant="outline"
                  className={cn('mt-3', statusStyles[employee?.status as keyof typeof statusStyles] ?? statusStyles.active)}
                >
                  {statusLabels[employee?.status as keyof typeof statusLabels] ?? 'Inconnu'}
                </Badge>

                {/* Matricule + CNSS */}
                {(employee?.matricule || employee?.cnss_number) && (
                  <div className="mt-3 flex flex-wrap gap-2 justify-center">
                    {employee?.matricule && (
                      <Badge variant="secondary" className="font-mono text-xs">
                        {employee.matricule}
                      </Badge>
                    )}
                    {employee?.cnss_number && (
                      <Badge variant="outline" className="font-mono text-xs">
                        CNSS {employee.cnss_number}
                      </Badge>
                    )}
                  </div>
                )}

                {/* Contact Info */}
                <div className="mt-6 w-full space-y-3 border-t border-border pt-6">
                  <div className="flex items-center gap-3 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="truncate text-foreground">{employee?.user?.email ?? 'Non disponible'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-foreground">{employee?.user?.tel ?? 'Non disponible'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-foreground">{employee?.address ?? employee?.department_name ?? 'Non disponible'}</span>
                  </div>
                  {employee?.cin && (
                    <div className="flex items-center gap-3 text-sm">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="text-foreground">CIN : {employee.cin}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-3 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-foreground">
                      Embauché le {employee?.hire_date ? formatLocalDate(employee.hire_date) : 'Non disponible'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Right Column */}
          <div className="space-y-6 lg:col-span-2">
            {/* Contract Info */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="border border-border shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Briefcase className="h-5 w-5 text-primary" />
                    Informations du contrat
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="text-xs text-muted-foreground">Type de contrat</p>
                      <p className="mt-1 font-semibold text-foreground">Non disponible</p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="text-xs text-muted-foreground">Salaire annuel</p>
                      <p className="mt-1 font-semibold text-foreground">
                        {employee?.salary != null ? Number(employee.salary).toLocaleString('fr-FR') : '—'} FCFA
                      </p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="text-xs text-muted-foreground">Date d'embauche</p>
                      <p className="mt-1 font-semibold text-foreground">
                        {employee?.hire_date ? new Date(employee.hire_date).toLocaleDateString('fr-FR') : 'Non disponible'}
                      </p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="text-xs text-muted-foreground">Manager</p>
                      <p className="mt-1 font-semibold text-foreground">Non disponible</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Performance */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="border border-border shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Star className="h-5 w-5 text-primary" />
                    Performance
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {evaluations.length === 0 && (
                    <p className="text-sm text-muted-foreground py-4 text-center">Non disponible</p>
                  )}
                  {evaluations.map((evaluation) => (
                    <div
                      key={evaluation.year}
                      className="flex items-center justify-between rounded-lg bg-muted/50 p-3"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-foreground">{evaluation.year}</span>
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={cn(
                                  'h-4 w-4',
                                  star <= Math.round(evaluation.score)
                                    ? 'fill-warning text-warning'
                                    : 'text-muted-foreground'
                                )}
                              />
                            ))}
                            <span className="ml-2 text-sm font-medium text-foreground">
                              {evaluation.score}/5
                            </span>
                          </div>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">{evaluation.comment}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>

            {/* Leaves */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card className="border border-border shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Calendar className="h-5 w-5 text-primary" />
                    Congés
                  </CardTitle>
                  <Badge variant="secondary">{leaves.balance} jours restants</Badge>
                </CardHeader>
                <CardContent className="space-y-3">
                  {leaves.history.length === 0 && (
                    <p className="text-sm text-muted-foreground py-4 text-center">Non disponible</p>
                  )}
                  {leaves.history.map((leave, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between rounded-lg bg-muted/50 p-3"
                    >
                      <div>
                        <p className="font-medium text-foreground">{leave.type}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatLocalDate(leave.start)} -{' '}
                          {formatLocalDate(leave.end)}
                        </p>
                      </div>
                      <Badge variant="outline" className={leaveStatusStyles[leave.status]}>
                        {leaveStatusLabels[leave.status]}
                      </Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>

            {/* Intégration & départ */}
            {id && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.42 }}>
                <OnboardingProgramsCard employeeId={Number(id)} />
              </motion.div>
            )}

            {/* Objectifs (OKR) */}
            {id && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.44 }}>
                <ObjectivesCard employeeId={Number(id)} />
              </motion.div>
            )}

            {/* Situation familiale */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.45 }}
            >
              <Card className="border border-border shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Users className="h-5 w-5 text-primary" />
                    Situation familiale
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAddFamilyMemberForm((previous) => !previous)}
                    className="gap-1"
                  >
                    {showAddFamilyMemberForm ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                    {showAddFamilyMemberForm ? 'Annuler' : 'Ajouter'}
                  </Button>
                </CardHeader>
                <CardContent className="space-y-3">
                  {showAddFamilyMemberForm && (
                    <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Lien</Label>
                          <Select
                            value={familyMemberForm.relationship}
                            onValueChange={(value) => setFamilyMemberForm((previous) => ({ ...previous, relationship: value }))}
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
                            value={familyMemberForm.gender}
                            onValueChange={(value) => setFamilyMemberForm((previous) => ({ ...previous, gender: value }))}
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
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Prénom <span className="text-destructive">*</span></Label>
                          <Input
                            className="h-8 text-sm"
                            value={familyMemberForm.first_name}
                            onChange={(e) => setFamilyMemberForm((previous) => ({ ...previous, first_name: e.target.value }))}
                            placeholder="Prénom"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Nom <span className="text-destructive">*</span></Label>
                          <Input
                            className="h-8 text-sm"
                            value={familyMemberForm.last_name}
                            onChange={(e) => setFamilyMemberForm((previous) => ({ ...previous, last_name: e.target.value }))}
                            placeholder="Nom"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Date de naissance</Label>
                        <Input
                          type="date"
                          className="h-8 text-sm"
                          value={familyMemberForm.date_of_birth}
                          onChange={(e) => setFamilyMemberForm((previous) => ({ ...previous, date_of_birth: e.target.value }))}
                        />
                      </div>
                      <Button
                        size="sm"
                        className="w-full"
                        disabled={!familyMemberForm.first_name || !familyMemberForm.last_name || addFamilyMemberMutation.isPending}
                        onClick={() => addFamilyMemberMutation.mutate()}
                      >
                        {addFamilyMemberMutation.isPending && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                        Enregistrer
                      </Button>
                    </div>
                  )}

                  {familyMembers.length === 0 && !showAddFamilyMemberForm && (
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
                        onClick={() => deleteFamilyMemberMutation.mutate(member.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>

            {/* GED — Archivage électronique */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Card className="border border-border shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <FileText className="h-5 w-5 text-primary" />
                    Archivage électronique (GED)
                  </CardTitle>
                  <label className="cursor-pointer">
                    <input type="file" className="sr-only" onChange={handleDocumentUpload} />
                    <Button variant="outline" size="sm" className="gap-1 pointer-events-none">
                      <Upload className="h-3.5 w-3.5" />
                      Ajouter
                    </Button>
                  </label>
                </CardHeader>
                <CardContent className="space-y-2">
                  {documents.length === 0 && (
                    <p className="py-4 text-center text-sm text-muted-foreground">Aucun document archivé.</p>
                  )}
                  {documents.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{doc.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(doc.created_at).toLocaleDateString('fr-FR')}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                        onClick={() => deleteDocumentMutation.mutate(doc.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>

            {/* Churn Risk */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Card className="border border-border shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <AlertTriangle className="h-5 w-5 text-primary" />
                    Risque de départ
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:gap-8">
                    {/* Score display */}
                    <div className="flex flex-col items-center">
                      <div className="relative flex h-28 w-28 items-center justify-center rounded-full border-4 border-muted">
                        <motion.div
                          initial={{ opacity: 0, scale: 0.5 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.7, duration: 0.3 }}
                        >
                          <span className={cn('text-3xl font-bold', risk.color)}>
                            {employee?.churn_risk ?? 0}%
                          </span>
                        </motion.div>
                      </div>
                      <span className={cn('mt-2 text-sm font-medium', risk.color)}>
                        Risque {risk.label}
                      </span>
                    </div>

                    {/* Risk bar and details */}
                    <div className="flex-1 space-y-4">
                      {/* Progress bar */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Score de risque</span>
                          <span className={cn('font-medium', risk.color)}>
                            {employee?.churn_risk ?? 0}%
                          </span>
                        </div>
                        <div className="h-3 overflow-hidden rounded-full bg-muted">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${employee?.churn_risk ?? 0}%` }}
                            transition={{ duration: 1, ease: 'easeOut', delay: 0.6 }}
                            className={cn('h-full rounded-full', risk.bgColor)}
                          />
                        </div>
                      </div>

                      {/* Main reason */}
                      <div className="rounded-lg border border-border bg-muted/50 p-3">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className={cn('mt-0.5 h-4 w-4', risk.color)} />
                          <div>
                            <p className="text-sm font-medium text-foreground">Raison principale</p>
                            <p className="text-sm text-muted-foreground">
                              {employee?.churn_main_reason ?? 'Non disponible'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </motion.div>
  );
}
