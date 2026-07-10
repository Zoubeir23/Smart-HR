import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Search,
  Briefcase,
  MapPin,
  Clock,
  Users,
  Plus,
  Loader2,
  Sparkles,
  Paperclip,
  X,
  FileText,
} from 'lucide-react';
import { recruitmentService, type GeneratedJobOfferDraft } from '@/services/recruitmentService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

type ContractType = 'CDI' | 'CDD' | 'Stage';

interface JobOffer {
  id: number;
  title: string;
  department: string;
  location: string;
  contractType: ContractType;
  postedDate: string;
  applications: number;
  description: string;
}

const contractTabs = ['Toutes', 'CDI', 'CDD', 'Stage'] as const;

const contractBadgeStyles: Record<ContractType, string> = {
  CDI: 'bg-success/20 text-success border-success/30',
  CDD: 'bg-warning/20 text-warning border-warning/30',
  Stage: 'bg-secondary/20 text-primary border-secondary/30',
};

interface NewOfferForm {
  title: string;
  department: string;
  location: string;
  job_type: string;
  description: string;
  requirements: string;
  salary_range: string;
}

const JOB_TYPE_OPTIONS = [
  { value: 'full_time', label: 'Temps plein' },
  { value: 'part_time', label: 'Temps partiel' },
  { value: 'contract', label: 'Contrat' },
  { value: 'internship', label: 'Stage' },
];

export default function JobOfferListPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<string>('Toutes');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newOfferForm, setNewOfferForm] = useState<NewOfferForm>({
    title: '',
    department: '',
    location: '',
    job_type: 'full_time',
    description: '',
    requirements: '',
    salary_range: '',
  });

  const [selectedOffer, setSelectedOffer] = useState<JobOffer | null>(null);
  const [rawJobDescription, setRawJobDescription] = useState('');
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [generatedDraft, setGeneratedDraft] = useState<GeneratedJobOfferDraft | null>(null);

  const generateMutation = useMutation({
    mutationFn: () =>
      recruitmentService.generateJobOffer({
        jobDescription: rawJobDescription.trim() || undefined,
        file: attachedFile ?? undefined,
      }),
    onSuccess: (draft) => {
      setGeneratedDraft(draft);
      toast.success('Brouillon généré — relisez avant de l\'insérer.');
    },
    onError: () => {
      toast.error("Impossible de générer l'offre. Réessayez ou complétez le formulaire manuellement.");
    },
  });

  const handleValidateGeneratedDraft = () => {
    if (!generatedDraft) return;
    setNewOfferForm({
      title: generatedDraft.title || '',
      department: generatedDraft.department || '',
      location: generatedDraft.location || '',
      job_type: generatedDraft.job_type || 'full_time',
      description: generatedDraft.description || '',
      requirements: generatedDraft.requirements || '',
      salary_range: generatedDraft.salary_range || '',
    });
    setGeneratedDraft(null);
  };

  const handleDiscardGeneratedDraft = () => {
    setGeneratedDraft(null);
  };

  const isRHOrAdmin = user?.role === 'RH' || user?.role === 'ADMIN';
  const isCandidate = user?.role === 'CANDIDATE';

  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => recruitmentService.createJob(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      toast.success('Offre créée avec succès.');
      setIsCreateDialogOpen(false);
      setNewOfferForm({ title: '', department: '', location: '', job_type: 'full_time', description: '', requirements: '', salary_range: '' });
      setRawJobDescription('');
      setAttachedFile(null);
      setGeneratedDraft(null);
    },
    onError: () => {
      toast.error("Erreur lors de la création de l'offre.");
    },
  });

  const handleCreateSubmit = () => {
    if (!newOfferForm.title || !newOfferForm.department || !newOfferForm.description) {
      toast.error('Le titre, le département et la description sont obligatoires.');
      return;
    }
    createMutation.mutate({ ...newOfferForm });
  };

  const { data: jobsData, isLoading } = useQuery({
    queryKey: ['jobs'],
    queryFn: () => recruitmentService.getJobs(),
  });

  const rawJobs = jobsData?.results || jobsData || [];
  const jobOffers: JobOffer[] = rawJobs.map((j: Record<string, unknown>) => ({
    id: j.id as number,
    title: (j.title as string) || '',
    department: (j.department_name as string) || (j.department as string) || '',
    location: (j.location as string) || '',
    contractType: (j.contract_type as ContractType) || (j.contractType as ContractType) || 'CDI',
    postedDate: (j.posted_date as string) || (j.postedDate as string) || (j.created_at as string) || '',
    applications: (j.applications_count as number) ?? (j.applications as number) ?? 0,
    description: (j.description as string) || '',
  }));

  const filteredOffers = jobOffers.filter((offer) => {
    const matchesSearch =
      offer.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      offer.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
      offer.location.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesTab =
      activeTab === 'Toutes' || offer.contractType === activeTab;

    return matchesSearch && matchesTab;
  });

  return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-6"
      >
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
              Offres d'emploi
            </h1>
            <p className="mt-1 text-muted-foreground">
              Consultez les opportunites disponibles
            </p>
          </div>
          {isRHOrAdmin && (
            <Button className="bg-primary text-primary-foreground" onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Nouvelle offre
            </Button>
          )}
        </div>

        {/* Search + Filter Tabs */}
        <div className="space-y-4">
          <div className="relative sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Rechercher une offre..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="flex items-center gap-2">
            {contractTabs.map((tab) => (
              <Button
                key={tab}
                variant={activeTab === tab ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveTab(tab)}
                className={
                  activeTab === tab ? 'bg-primary text-primary-foreground' : ''
                }
              >
                {tab}
              </Button>
            ))}
          </div>
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-3 text-muted-foreground">Chargement des offres...</span>
          </div>
        )}

        {/* Results count */}
        {!isLoading && (
        <p className="text-sm text-muted-foreground">
          {filteredOffers.length} offre{filteredOffers.length > 1 ? 's' : ''}{' '}
          trouvee{filteredOffers.length > 1 ? 's' : ''}
        </p>
        )}

        {/* Job Offers Grid */}
        {!isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {filteredOffers.map((offer) => (
            <Card
              key={offer.id}
              className="flex flex-col border border-border shadow-sm transition-all hover:border-primary"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-lg text-foreground">
                    {offer.title}
                  </CardTitle>
                  <Badge
                    variant="outline"
                    className={contractBadgeStyles[offer.contractType]}
                  >
                    {offer.contractType}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col flex-1 space-y-3">
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4" />
                    <span>{offer.department}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    <span>{offer.location}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span>
                      Publiee le{' '}
                      {new Date(offer.postedDate).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <span>
                      {offer.applications} candidature
                      {offer.applications > 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                <p className="line-clamp-2 text-sm text-muted-foreground">
                  {offer.description}
                </p>

                <div className="mt-auto pt-2">
                  {isCandidate ? (
                    <Button
                      className="w-full bg-primary text-primary-foreground"
                      onClick={() => navigate(`/jobs/${offer.id}/apply`)}
                    >
                      Postuler
                    </Button>
                  ) : (
                    <Button variant="outline" className="w-full" onClick={() => setSelectedOffer(offer)}>
                      Voir details
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </motion.div>
        )}

        {/* Empty State */}
        {!isLoading && filteredOffers.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16">
            <Briefcase className="h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold text-foreground">
              Aucune offre trouvee
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Essayez de modifier vos criteres de recherche
            </p>
            <Button
              className="mt-4"
              onClick={() => {
                setSearchQuery('');
                setActiveTab('Toutes');
              }}
            >
              Reinitialiser les filtres
            </Button>
          </div>
        )}
        {/* Job Detail Dialog (RH/Admin) */}
        <Dialog open={selectedOffer !== null} onOpenChange={(open) => { if (!open) setSelectedOffer(null); }}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{selectedOffer?.title}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto pr-1">
              <div className="flex flex-wrap items-center gap-2">
                {selectedOffer && (
                  <Badge variant="outline" className={contractBadgeStyles[selectedOffer.contractType]}>
                    {selectedOffer.contractType}
                  </Badge>
                )}
                <span className="text-sm text-muted-foreground">{selectedOffer?.department}</span>
              </div>
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {selectedOffer?.location || '—'}
                </div>
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  {selectedOffer?.applications ?? 0} candidature{(selectedOffer?.applications ?? 0) > 1 ? 's' : ''}
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {selectedOffer?.postedDate ? new Date(selectedOffer.postedDate).toLocaleDateString('fr-FR') : '—'}
                </div>
              </div>
              <div>
                <h4 className="mb-2 font-medium text-foreground">Description</h4>
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">{selectedOffer?.description || '—'}</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedOffer(null)}>Fermer</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Create Offer Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Nouvelle offre d'emploi</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto pr-1">
              <div className="grid gap-2 rounded-lg border border-dashed border-border p-3">
                <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Sparkles className="h-3.5 w-3.5" />
                  Agent IA — Générer un brouillon (optionnel)
                </Label>
                <Textarea
                  value={rawJobDescription}
                  onChange={(e) => setRawJobDescription(e.target.value)}
                  placeholder="Décrivez le poste à créer, ou joignez un PDF/TXT/MD pour donner du contexte..."
                  rows={2}
                />
                {attachedFile && (
                  <div className="flex w-fit items-center gap-2 rounded-md border border-border bg-muted/50 px-2 py-1 text-xs">
                    <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="max-w-[220px] truncate">{attachedFile.name}</span>
                    <button
                      type="button"
                      aria-label="Retirer le fichier joint"
                      className="text-muted-foreground hover:text-foreground"
                      onClick={() => setAttachedFile(null)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <input
                    id="job-offer-generate-file-input"
                    type="file"
                    accept=".pdf,.txt,.md"
                    className="hidden"
                    onChange={(e) => setAttachedFile(e.target.files?.[0] ?? null)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-fit gap-2"
                    onClick={() => document.getElementById('job-offer-generate-file-input')?.click()}
                  >
                    <Paperclip className="h-3.5 w-3.5" />
                    Joindre un fichier
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="w-fit gap-2"
                    disabled={(!rawJobDescription.trim() && !attachedFile) || generateMutation.isPending}
                    onClick={() => generateMutation.mutate()}
                  >
                    {generateMutation.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5" />
                    )}
                    Générer
                  </Button>
                </div>
                {generatedDraft && (
                  <div className="mt-2 grid gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3">
                    <p className="text-sm font-semibold">{generatedDraft.title || 'Sans titre'}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {generatedDraft.location && <Badge variant="outline">{generatedDraft.location}</Badge>}
                      {generatedDraft.job_type && (
                        <Badge variant="outline">
                          {JOB_TYPE_OPTIONS.find((opt) => opt.value === generatedDraft.job_type)?.label ?? generatedDraft.job_type}
                        </Badge>
                      )}
                      {generatedDraft.department && <Badge variant="outline">{generatedDraft.department}</Badge>}
                    </div>
                    {generatedDraft.description && (
                      <p className="line-clamp-3 text-xs text-muted-foreground">{generatedDraft.description}</p>
                    )}
                    {generatedDraft.requirements && (
                      <div className="flex flex-wrap gap-1.5">
                        {generatedDraft.requirements
                          .split('\n')
                          .map((requirement) => requirement.trim())
                          .filter(Boolean)
                          .map((requirement) => (
                            <Badge key={requirement} variant="secondary" className="text-[11px] font-normal">
                              {requirement}
                            </Badge>
                          ))}
                      </div>
                    )}
                    <div className="flex justify-end gap-2 pt-1">
                      <Button type="button" variant="ghost" size="sm" onClick={handleDiscardGeneratedDraft}>
                        <X className="mr-1 h-3.5 w-3.5" />
                        Ignorer le brouillon
                      </Button>
                      <Button type="button" size="sm" onClick={handleValidateGeneratedDraft}>
                        Valider et insérer
                      </Button>
                    </div>
                  </div>
                )}
              </div>
              <div className="grid gap-2">
                <Label>Titre du poste *</Label>
                <Input
                  value={newOfferForm.title}
                  onChange={(e) => setNewOfferForm((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="Ex: Développeur Backend Senior"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Département *</Label>
                  <Input
                    value={newOfferForm.department}
                    onChange={(e) => setNewOfferForm((prev) => ({ ...prev, department: e.target.value }))}
                    placeholder="Ex: Informatique"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Localisation</Label>
                  <Input
                    value={newOfferForm.location}
                    onChange={(e) => setNewOfferForm((prev) => ({ ...prev, location: e.target.value }))}
                    placeholder="Ex: Dakar, Sénégal"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Type de contrat</Label>
                  <Select
                    value={newOfferForm.job_type}
                    onValueChange={(value) => setNewOfferForm((prev) => ({ ...prev, job_type: value }))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {JOB_TYPE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Fourchette salariale</Label>
                  <Input
                    value={newOfferForm.salary_range}
                    onChange={(e) => setNewOfferForm((prev) => ({ ...prev, salary_range: e.target.value }))}
                    placeholder="Ex: 800 000 - 1 200 000 FCFA"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Description *</Label>
                <Textarea
                  value={newOfferForm.description}
                  onChange={(e) => setNewOfferForm((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Décrivez le poste et les missions..."
                  rows={3}
                />
              </div>
              <div className="grid gap-2">
                <Label>Prérequis (un par ligne)</Label>
                <Textarea
                  value={newOfferForm.requirements}
                  onChange={(e) => setNewOfferForm((prev) => ({ ...prev, requirements: e.target.value }))}
                  placeholder="3+ ans d'expérience Django&#10;Maîtrise de PostgreSQL&#10;Connaissance de Docker"
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Annuler</Button>
              <Button onClick={handleCreateSubmit} disabled={createMutation.isPending}>
                {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Publier l'offre
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </motion.div>
  );
}
