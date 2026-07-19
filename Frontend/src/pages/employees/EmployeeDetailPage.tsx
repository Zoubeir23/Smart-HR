import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { ArrowLeft, Loader2, Mail, Pencil } from 'lucide-react';
import { employeeService } from '@/services/employeeService';
import { documentService } from '@/services/documentService';
import OnboardingProgramsCard from '@/components/employees/OnboardingProgramsCard';
import ObjectivesCard from '@/components/employees/ObjectivesCard';
import { EmployeeChurnRiskCard } from '@/components/employees/EmployeeChurnRiskCard';
import { EmployeeContractCard } from '@/components/employees/EmployeeContractCard';
import { EmployeeDocumentsCard } from '@/components/employees/EmployeeDocumentsCard';
import { EmployeeEditDialog, type EditEmployeeForm } from '@/components/employees/EmployeeEditDialog';
import { EmployeeFamilyCard, type FamilyMemberFormValues } from '@/components/employees/EmployeeFamilyCard';
import { EmployeeLeavesCard } from '@/components/employees/EmployeeLeavesCard';
import { EmployeePerformanceCard } from '@/components/employees/EmployeePerformanceCard';
import { EmployeeProfileCard } from '@/components/employees/EmployeeProfileCard';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

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
    mutationFn: (values: FamilyMemberFormValues) => employeeService.addFamilyMember({
      employee: Number(id),
      relationship: values.relationship,
      first_name: values.first_name,
      last_name: values.last_name,
      date_of_birth: values.date_of_birth || undefined,
      gender: values.gender || undefined,
    }),
    onSuccess: () => {
      refetchFamilyMembers();
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

        <EmployeeEditDialog
          isOpen={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          form={editForm}
          onFormChange={setEditForm}
          departments={departments as Array<{ id: number; name: string }>}
          positions={positions as Array<{ id: number; title: string; department: number }>}
          isPending={updateMutation.isPending}
          onSubmit={handleEditSubmit}
        />

        {/* Main Layout */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column: Profile Card */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <EmployeeProfileCard employee={employee} />
          </motion.div>

          {/* Right Column */}
          <div className="space-y-6 lg:col-span-2">
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
              <EmployeeContractCard employee={employee} />
            </motion.div>

            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
              <EmployeePerformanceCard evaluations={evaluations} />
            </motion.div>

            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}>
              <EmployeeLeavesCard leaves={leaves} />
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

            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.45 }}>
              <EmployeeFamilyCard
                familyMembers={familyMembers}
                isAddPending={addFamilyMemberMutation.isPending}
                onAdd={(values) => addFamilyMemberMutation.mutate(values)}
                onDelete={(memberId) => deleteFamilyMemberMutation.mutate(memberId)}
              />
            </motion.div>

            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }}>
              <EmployeeDocumentsCard
                documents={documents}
                onUpload={handleDocumentUpload}
                onDelete={(documentId) => deleteDocumentMutation.mutate(documentId)}
              />
            </motion.div>

            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }}>
              <EmployeeChurnRiskCard churnRisk={employee?.churn_risk ?? 0} churnMainReason={employee?.churn_main_reason} />
            </motion.div>
          </div>
        </div>
      </motion.div>
  );
}
