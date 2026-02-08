import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Briefcase,
  MapPin,
  DollarSign,
  Upload,
  CheckCircle,
  Send,
} from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { recruitmentService } from '@/services/recruitmentService';
import { useToast } from '@/hooks/use-toast';

interface FormData {
  lettreMotivation: string;
  cv: File | null;
}

const JOB_TYPE_LABELS: Record<string, string> = {
  full_time: 'Temps plein',
  part_time: 'Temps partiel',
  contract: 'Contrat',
  internship: 'Stage',
};

const ApplyPage = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [formData, setFormData] = useState<FormData>({
    lettreMotivation: '',
    cv: null,
  });

  const [fileName, setFileName] = useState<string>('');
  const [submitted, setSubmitted] = useState(false);

  const { data: jobOffer, isLoading: isLoadingJob, error: jobError } = useQuery({
    queryKey: ['job', jobId],
    queryFn: () => recruitmentService.getJobById(Number(jobId)),
    enabled: !!jobId,
  });

  const applyMutation = useMutation({
    mutationFn: async () => {
      if (!jobId || !formData.cv) throw new Error('Données manquantes');
      const fd = new FormData();
      fd.append('job_offer', jobId);
      fd.append('cv', formData.cv);
      fd.append('cover_letter', formData.lettreMotivation);
      return recruitmentService.apply(fd);
    },
    onSuccess: () => {
      setSubmitted(true);
      queryClient.invalidateQueries({ queryKey: ['my-applications'] });
      toast({
        title: 'Candidature envoyée',
        description: 'Votre candidature a bien été enregistrée.',
      });
      setTimeout(() => navigate('/my-applications'), 3000);
    },
    onError: (err: Error) => {
      toast({
        title: 'Erreur',
        description: err.message || 'Impossible d\'envoyer la candidature.',
        variant: 'destructive',
      });
    },
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, lettreMotivation: e.target.value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        toast({
          title: 'Format invalide',
          description: 'Veuillez sélectionner un fichier PDF.',
          variant: 'destructive',
        });
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: 'Fichier trop volumineux',
          description: 'Le fichier ne doit pas dépasser 5 MB.',
          variant: 'destructive',
        });
        return;
      }
      setFormData((prev) => ({ ...prev, cv: file }));
      setFileName(file.name);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.lettreMotivation || !formData.cv) {
      toast({
        title: 'Champs requis',
        description: 'Veuillez remplir la lettre de motivation et joindre votre CV.',
        variant: 'destructive',
      });
      return;
    }
    applyMutation.mutate();
  };

  if (!jobId) {
    navigate('/jobs');
    return null;
  }

  if (isLoadingJob) {
    return (
      <DashboardLayout>
        <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
          <p className="text-muted-foreground">Chargement de l&apos;offre...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (jobError || !jobOffer) {
    return (
      <DashboardLayout>
        <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center gap-4">
          <p className="text-muted-foreground">Offre non trouvée.</p>
          <Button variant="outline" onClick={() => navigate('/jobs')}>
            Retour aux offres
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const requirements = jobOffer.requirements_list || (jobOffer.requirements ? jobOffer.requirements.split('\n').filter(Boolean) : []);

  if (submitted) {
    return (
      <DashboardLayout>
        <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center"
          >
            <CheckCircle className="mx-auto mb-6 h-24 w-24 text-green-500" />
            <h2 className="mb-4 text-3xl font-bold text-foreground">
              Candidature envoyée avec succès !
            </h2>
            <p className="mb-2 text-muted-foreground">
              Merci pour votre candidature à {jobOffer.title}
            </p>
            <p className="text-sm text-muted-foreground">
              Vous allez être redirigé vers le suivi de votre candidature...
            </p>
          </motion.div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-4xl px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="mb-8">
            <div className="p-6">
              <div className="mb-4 flex flex-wrap gap-4">
                <h1 className="text-3xl font-bold text-foreground">{jobOffer.title}</h1>
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4" />
                    {jobOffer.department}
                  </span>
                  {jobOffer.location && (
                    <span className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      {jobOffer.location}
                    </span>
                  )}
                  {jobOffer.salary_range && (
                    <span className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      {jobOffer.salary_range}
                    </span>
                  )}
                  {jobOffer.job_type && (
                    <span className="rounded-md bg-muted px-2 py-0.5 text-xs">
                      {JOB_TYPE_LABELS[jobOffer.job_type] || jobOffer.job_type}
                    </span>
                  )}
                </div>
              </div>

              {jobOffer.description && (
                <div className="mb-6">
                  <h3 className="mb-2 text-lg font-semibold text-foreground">
                    Description du poste
                  </h3>
                  <p className="leading-relaxed text-muted-foreground">
                    {jobOffer.description}
                  </p>
                </div>
              )}

              {requirements.length > 0 && (
                <div>
                  <h3 className="mb-3 text-lg font-semibold text-foreground">
                    Compétences requises
                  </h3>
                  <ul className="space-y-2">
                    {requirements.map((req: string, index: number) => (
                      <li
                        key={index}
                        className="flex items-start gap-2 text-muted-foreground"
                      >
                        <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                        <span>{req}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </Card>

          <Card>
            <div className="p-6">
              <h2 className="mb-6 text-2xl font-bold text-foreground">
                Formulaire de candidature
              </h2>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">
                    Lettre de motivation <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    name="lettreMotivation"
                    value={formData.lettreMotivation}
                    onChange={handleInputChange}
                    rows={8}
                    className="w-full resize-none rounded-lg border border-border bg-card px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Expliquez pourquoi vous êtes le candidat idéal pour ce poste..."
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">
                    CV (PDF, max 5 MB) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="file"
                    id="cv-upload"
                    accept=".pdf"
                    onChange={handleFileChange}
                    className="hidden"
                    required
                  />
                  <label
                    htmlFor="cv-upload"
                    className="group flex cursor-pointer items-center justify-center gap-3 rounded-lg border-2 border-dashed border-border bg-card px-4 py-8 transition-colors hover:border-primary"
                  >
                    <Upload className="h-8 w-8 text-muted-foreground transition-colors group-hover:text-primary" />
                    <div className="text-center">
                      {fileName ? (
                        <div>
                          <p className="text-sm font-medium text-foreground">{fileName}</p>
                          <p className="mt-1 text-xs text-muted-foreground">Cliquez pour changer</p>
                        </div>
                      ) : (
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            Cliquez pour télécharger votre CV
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Format PDF uniquement, maximum 5 MB
                          </p>
                        </div>
                      )}
                    </div>
                  </label>
                </div>

                <div className="flex justify-end gap-4 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate('/jobs')}
                  >
                    Annuler
                  </Button>
                  <Button
                    type="submit"
                    disabled={applyMutation.isPending}
                    className="flex items-center gap-2"
                  >
                    {applyMutation.isPending ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        Envoi en cours...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        Soumettre ma candidature
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </Card>
        </motion.div>
      </div>
    </DashboardLayout>
  );
};

export default ApplyPage;
