import { useEffect, useState } from 'react';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Loader2, Save, UserPlus } from 'lucide-react';
import axios from 'axios';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { employeeService } from '@/services/employeeService';
import { useToast } from '@/hooks/use-toast';

interface AvailableUser {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  role: string;
}

interface Department {
  id: number;
  name: string;
}

interface Position {
  id: number;
  title: string;
  department: number | null;
}

const employeeCreateFormSchema = z.object({
  userId: z.string().min(1, 'Veuillez sélectionner un compte utilisateur.'),
  departmentId: z.string().optional(),
  positionId: z.string().optional(),
  hireDate: z.string().optional().or(z.literal('')),
  salary: z
    .string()
    .trim()
    .min(1, 'Le salaire annuel est requis.')
    .refine(
      (value) =>
        !Number.isNaN(Number(value.replace(',', '.'))) &&
        Number(value.replace(',', '.')) >= 0,
      { message: 'Le salaire annuel doit être un nombre valide.' },
    ),
  status: z.enum(['active', 'inactive', 'on_leave']),
  dateOfBirth: z.string().optional().or(z.literal('')),
  cin: z.string().trim().max(50, 'Le CIN ne peut pas dépasser 50 caractères.').optional().or(z.literal('')),
  address: z.string().trim().max(500, 'L\'adresse est trop longue.').optional().or(z.literal('')),
  emergencyContact: z
    .string()
    .trim()
    .max(200, 'Le contact d\'urgence est trop long.')
    .optional()
    .or(z.literal('')),
});

type EmployeeCreateFormValues = z.infer<typeof employeeCreateFormSchema>;

function getEmployeeFormErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const responseData = error.response?.data;

    if (typeof responseData === 'string') {
      return responseData;
    }

    if (responseData && typeof responseData === 'object') {
      const detail = (responseData as { detail?: unknown }).detail;
      if (typeof detail === 'string' && detail.trim()) {
        return detail;
      }

      const fieldMessages = Object.values(responseData)
        .flatMap((value) => (Array.isArray(value) ? value : [value]))
        .filter((value): value is string => typeof value === 'string' && value.trim().length > 0);

      if (fieldMessages.length > 0) {
        return fieldMessages[0];
      }
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Impossible de créer l\'employé pour le moment. Vérifiez les champs et réessayez.';
}

function toNullableNumber(value?: string) {
  if (!value || value === '' || value === 'none') return null;
  return Number(value);
}

function toNullableString(value?: string) {
  const trimmedValue = value?.trim();
  return trimmedValue ? trimmedValue : null;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-sm font-medium text-destructive">{message}</p>;
}

export default function EmployeeCreatePage() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [availableUsers, setAvailableUsers] = useState<AvailableUser[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(true);

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<EmployeeCreateFormValues>({
    resolver: zodResolver(employeeCreateFormSchema),
    defaultValues: {
      userId: '',
      departmentId: '',
      positionId: '',
      hireDate: '',
      salary: '',
      status: 'active',
      dateOfBirth: '',
      cin: '',
      address: '',
      emergencyContact: '',
    },
  });

  useEffect(() => {
    async function loadOptions() {
      setIsLoadingOptions(true);
      try {
        const [users, depts, pos] = await Promise.all([
          employeeService.getAvailableUsers(),
          employeeService.getDepartments(),
          employeeService.getPositions(),
        ]);
        setAvailableUsers(users);
        setDepartments(depts.results ?? depts);
        setPositions(pos.results ?? pos);
      } catch {
        toast({
          title: 'Chargement partiel',
          description: 'Impossible de charger certaines options. Vérifiez la connexion au serveur.',
          variant: 'destructive',
        });
      } finally {
        setIsLoadingOptions(false);
      }
    }

    loadOptions();
  }, [toast]);

  const watchedDepartmentId = watch('departmentId');

  const filteredPositions =
    watchedDepartmentId && watchedDepartmentId !== ''
      ? positions.filter((position) => String(position.department) === watchedDepartmentId)
      : positions;

  const onSubmit = async (formValues: EmployeeCreateFormValues) => {
    setSubmitError(null);

    try {
      await employeeService.create({
        user: Number(formValues.userId),
        department: toNullableNumber(formValues.departmentId),
        position: toNullableNumber(formValues.positionId),
        hire_date: toNullableString(formValues.hireDate),
        salary: Number(formValues.salary.replace(',', '.')),
        status: formValues.status,
        date_of_birth: toNullableString(formValues.dateOfBirth),
        cin: formValues.cin?.trim() ?? '',
        address: formValues.address?.trim() ?? '',
        emergency_contact: formValues.emergencyContact?.trim() ?? '',
      });

      toast({
        title: 'Employé créé',
        description: 'Le dossier employé a été enregistré avec succès.',
      });

      navigate('/employees');
    } catch (error: unknown) {
      const message = getEmployeeFormErrorMessage(error);
      setSubmitError(message);
      toast({
        title: 'Création impossible',
        description: message,
        variant: 'destructive',
      });
    }
  };

  return (
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto max-w-5xl space-y-6"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="outline" className="gap-1 rounded-full px-3 py-1">
                <UserPlus className="h-3.5 w-3.5" />
                Administration RH
              </Badge>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Créer un employé</h1>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Sélectionnez un compte utilisateur existant et renseignez les informations RH pour créer le profil employé.
            </p>
          </div>

          <Button asChild variant="outline" className="gap-2">
            <Link to="/employees">
              <ArrowLeft className="h-4 w-4" />
              Retour aux employés
            </Link>
          </Button>
        </div>

        <Card className="border-border/70 shadow-sm">
          <CardHeader className="space-y-1">
            <CardTitle>Informations du nouvel employé</CardTitle>
            <CardDescription>
              Seuls les comptes sans profil employé apparaissent dans la liste ci-dessous.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingOptions ? (
              <div className="flex items-center justify-center py-12 gap-3 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                Chargement des options…
              </div>
            ) : (
              <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
                {submitError && (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    {submitError}
                  </div>
                )}

                <div className="grid gap-5 md:grid-cols-2">
                  {/* Compte utilisateur */}
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="userId">Compte utilisateur <span className="text-destructive">*</span></Label>
                    <Controller
                      name="userId"
                      control={control}
                      render={({ field }) => (
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <SelectTrigger id="userId">
                            <SelectValue placeholder={
                              availableUsers.length === 0
                                ? 'Aucun compte disponible'
                                : 'Sélectionner un utilisateur…'
                            } />
                          </SelectTrigger>
                          <SelectContent>
                            {availableUsers.map((user) => (
                              <SelectItem key={user.id} value={String(user.id)}>
                                {user.full_name} — {user.email}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {availableUsers.length === 0 && !isLoadingOptions && (
                      <p className="text-xs text-muted-foreground">
                        Tous les comptes ont déjà un profil employé, ou le serveur est inaccessible.
                      </p>
                    )}
                    <FieldError message={errors.userId?.message} />
                  </div>

                  {/* Statut */}
                  <div className="space-y-2">
                    <Label htmlFor="status">Statut <span className="text-destructive">*</span></Label>
                    <Controller
                      name="status"
                      control={control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger id="status">
                            <SelectValue placeholder="Sélectionner un statut…" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Actif</SelectItem>
                            <SelectItem value="inactive">Inactif</SelectItem>
                            <SelectItem value="on_leave">En congé</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                    <FieldError message={errors.status?.message} />
                  </div>

                  {/* Salaire */}
                  <div className="space-y-2">
                    <Label htmlFor="salary">Salaire annuel (FCFA) <span className="text-destructive">*</span></Label>
                    <Input
                      id="salary"
                      inputMode="decimal"
                      placeholder="1 500 000"
                      {...register('salary')}
                    />
                    <FieldError message={errors.salary?.message} />
                  </div>

                  {/* Département */}
                  <div className="space-y-2">
                    <Label htmlFor="departmentId">Département</Label>
                    <Controller
                      name="departmentId"
                      control={control}
                      render={({ field }) => (
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <SelectTrigger id="departmentId">
                            <SelectValue placeholder="Sélectionner un département…" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">— Aucun département —</SelectItem>
                            {departments.map((dept) => (
                              <SelectItem key={dept.id} value={String(dept.id)}>
                                {dept.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    <FieldError message={errors.departmentId?.message} />
                  </div>

                  {/* Poste */}
                  <div className="space-y-2">
                    <Label htmlFor="positionId">Poste</Label>
                    <Controller
                      name="positionId"
                      control={control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger id="positionId">
                            <SelectValue placeholder="Sélectionner un poste…" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">— Aucun poste —</SelectItem>
                            {filteredPositions.map((position) => (
                              <SelectItem key={position.id} value={String(position.id)}>
                                {position.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    <FieldError message={errors.positionId?.message} />
                  </div>

                  {/* Date d'embauche */}
                  <div className="space-y-2">
                    <Label htmlFor="hireDate">Date d'embauche</Label>
                    <Input id="hireDate" type="date" {...register('hireDate')} />
                    <FieldError message={errors.hireDate?.message} />
                  </div>

                  {/* Date de naissance */}
                  <div className="space-y-2">
                    <Label htmlFor="dateOfBirth">Date de naissance</Label>
                    <Input id="dateOfBirth" type="date" {...register('dateOfBirth')} />
                    <FieldError message={errors.dateOfBirth?.message} />
                  </div>

                  {/* CIN */}
                  <div className="space-y-2">
                    <Label htmlFor="cin">CIN</Label>
                    <Input id="cin" placeholder="SN123456" {...register('cin')} />
                    <FieldError message={errors.cin?.message} />
                  </div>

                  {/* Contact d'urgence */}
                  <div className="space-y-2">
                    <Label htmlFor="emergencyContact">Contact d'urgence</Label>
                    <Input
                      id="emergencyContact"
                      placeholder="Nom : téléphone"
                      {...register('emergencyContact')}
                    />
                    <FieldError message={errors.emergencyContact?.message} />
                  </div>

                  {/* Adresse */}
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="address">Adresse</Label>
                    <Textarea
                      id="address"
                      placeholder="Adresse complète du collaborateur"
                      className="min-h-28"
                      {...register('address')}
                    />
                    <FieldError message={errors.address?.message} />
                  </div>
                </div>

                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <Button type="button" variant="outline" asChild>
                    <Link to="/employees">Annuler</Link>
                  </Button>
                  <Button type="submit" className="gap-2" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Création en cours…
                      </span>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        Créer l'employé
                      </>
                    )}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </motion.div>
  );
}
