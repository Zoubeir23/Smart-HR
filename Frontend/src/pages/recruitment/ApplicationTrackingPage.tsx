import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import {
  Send,
  Brain,
  Calendar,
  CheckCircle,
  Clock,
  Briefcase,
  Mail,
  Phone,
  Loader2,
} from 'lucide-react';
import { recruitmentService } from '@/services/recruitmentService';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';

interface TimelineStep {
  id: string;
  title: string;
  description: string;
  date: string;
  status: 'completed' | 'in_progress' | 'pending';
  icon: React.ElementType;
}

const ApplicationTrackingPage = () => {
  const { data: appsData, isLoading } = useQuery({
    queryKey: ['my-applications'],
    queryFn: () => recruitmentService.getApplications(),
  });

  const applications = appsData?.results || appsData || [];
  const latestApp = applications[0] as Record<string, unknown> | undefined;

  const application = {
    jobTitle: (latestApp?.job_title as string) || (latestApp?.jobTitle as string) || 'Aucune candidature',
    department: (latestApp?.department as string) || (latestApp?.department_name as string) || '',
    submittedDate: latestApp?.submitted_date
      ? new Date(latestApp.submitted_date as string).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
      : (latestApp?.created_at
        ? new Date(latestApp.created_at as string).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
        : ''),
    matchingScore: (latestApp?.matching_score as number) ?? (latestApp?.matchingScore as number) ?? 0,
    candidateName: (latestApp?.candidate_name as string) || (latestApp?.candidateName as string) || '',
    email: (latestApp?.email as string) || '',
    phone: (latestApp?.phone as string) || '',
    status: (latestApp?.status as string) || 'pending',
    aiSummary: (latestApp?.ai_summary as string) || '',
    skillsExtracted: (latestApp?.skills_extracted as string[]) || [],
  };

  const buildTimelineSteps = (): TimelineStep[] => {
    const status = application.status?.toLowerCase() || 'pending';
    const currentIndex = status === 'rejected'
      ? 3
      : status === 'accepted' || status === 'hired'
        ? 3
        : status === 'interview_scheduled' || status === 'interview'
          ? 2
          : status === 'analyzed' || status === 'reviewed'
            ? 1
            : 0;

    return [
      {
        id: '1',
        title: 'Candidature envoyée',
        description: 'Votre candidature a été reçue avec succès',
        date: application.submittedDate || 'En attente',
        status: currentIndex >= 0 ? 'completed' : 'pending',
        icon: Send,
      },
      {
        id: '2',
        title: 'CV analysé par IA',
        description: 'Notre système d\'IA a analysé votre CV et déterminé un score de compatibilité',
        date: currentIndex >= 1 ? application.submittedDate : 'En attente',
        status: currentIndex > 1 ? 'completed' : currentIndex === 1 ? 'in_progress' : 'pending',
        icon: Brain,
      },
      {
        id: '3',
        title: 'Entretien planifié',
        description: 'Un entretien technique via Zoom a été programmé',
        date: currentIndex >= 2 ? 'Planifié' : 'En attente',
        status: currentIndex > 2 ? 'completed' : currentIndex === 2 ? 'in_progress' : 'pending',
        icon: Calendar,
      },
      {
        id: '4',
        title: 'Décision finale',
        description: 'Le comité de recrutement prendra une décision finale',
        date: currentIndex >= 3 ? (status === 'rejected' ? 'Refusé' : 'Accepté') : 'En attente',
        status: currentIndex >= 3 ? 'completed' : 'pending',
        icon: CheckCircle,
      },
    ];
  };

  const timelineSteps = buildTimelineSteps();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500';
      case 'in_progress':
        return 'bg-primary';
      case 'pending':
        return 'bg-muted';
      default:
        return 'bg-muted';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-white" />;
      case 'in_progress':
        return <Clock className="w-5 h-5 text-white animate-pulse" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-muted-foreground" />;
      default:
        return null;
    }
  };

  // Calculate circular progress
  const circumference = 2 * Math.PI * 45;
  const progress = (application.matchingScore / 100) * circumference;

  return (
    <DashboardLayout>
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-3 text-muted-foreground">Chargement du suivi de candidature...</span>
        </div>
      ) : (
      <div className="max-w-5xl mx-auto py-8 px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Suivi de candidature
            </h1>
            <p className="text-muted-foreground">
              Suivez l'évolution de votre candidature en temps réel
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Application Info Card */}
            <Card className="lg:col-span-2">
              <div className="p-6">
                <div className="flex items-start gap-4 mb-6">
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <Briefcase className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-bold text-foreground mb-1">
                      {application.jobTitle}
                    </h2>
                    <p className="text-sm text-muted-foreground mb-3">
                      {application.department}
                    </p>
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-500/10 text-green-600 rounded-full text-sm font-medium">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      Candidature active
                    </div>
                  </div>
                </div>

                <div className="space-y-3 pt-4 border-t border-border">
                  <div className="flex items-center gap-3 text-sm">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span className="text-foreground">{application.email}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span className="text-foreground">{application.phone}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Send className="w-4 h-4 text-muted-foreground" />
                    <span className="text-foreground">
                      Soumis le {application.submittedDate}
                    </span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Matching Score Card */}
            <Card>
              <div className="p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4 text-center">
                  Score de compatibilité IA
                </h3>
                <div className="flex justify-center mb-4">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
                    className="relative w-32 h-32"
                  >
                    <svg className="w-full h-full transform -rotate-90">
                      <circle
                        cx="64"
                        cy="64"
                        r="45"
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="none"
                        className="text-muted"
                      />
                      <motion.circle
                        cx="64"
                        cy="64"
                        r="45"
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="none"
                        strokeDasharray={circumference}
                        initial={{ strokeDashoffset: circumference }}
                        animate={{ strokeDashoffset: circumference - progress }}
                        transition={{ delay: 0.5, duration: 1, ease: 'easeOut' }}
                        className="text-primary"
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-foreground">
                          {application.matchingScore}%
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </div>
                <p className="text-sm text-center text-muted-foreground">
                  Excellent match ! Votre profil correspond très bien aux exigences du poste.
                </p>
              </div>
            </Card>
          </div>

          {/* AI Analysis Section */}
          {(application.aiSummary || application.skillsExtracted.length > 0) && (
            <Card className="mb-8">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-5">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Brain className="w-5 h-5 text-primary" />
                  </div>
                  <h2 className="text-xl font-bold text-foreground">Analyse IA de votre CV</h2>
                </div>

                {application.skillsExtracted.length > 0 && (
                  <div className="mb-5">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                      Compétences détectées
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {application.skillsExtracted.map((skill, index) => (
                        <motion.span
                          key={index}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: index * 0.05 }}
                          className="inline-flex items-center px-3 py-1 bg-primary/10 text-primary text-sm font-medium rounded-full border border-primary/20"
                        >
                          {skill}
                        </motion.span>
                      ))}
                    </div>
                  </div>
                )}

                {application.aiSummary && (
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                      Résumé de l'analyse
                    </h3>
                    <p className="text-sm text-foreground leading-relaxed bg-muted/30 rounded-lg p-4 border border-border">
                      {application.aiSummary}
                    </p>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Timeline */}
          <Card>
            <div className="p-6">
              <h2 className="text-xl font-bold text-foreground mb-6">
                Processus de recrutement
              </h2>

              <div className="relative">
                {/* Vertical line */}
                <div className="absolute left-[23px] top-0 bottom-0 w-0.5 bg-border" />

                {/* Timeline steps */}
                <div className="space-y-8">
                  {timelineSteps.map((step, index) => {
                    const Icon = step.icon;
                    return (
                      <motion.div
                        key={step.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.2 }}
                        className="relative flex gap-6"
                      >
                        {/* Icon circle */}
                        <div className="relative z-10 flex-shrink-0">
                          <div
                            className={`w-12 h-12 rounded-full ${getStatusColor(
                              step.status
                            )} flex items-center justify-center shadow-lg`}
                          >
                            {step.status === 'completed' || step.status === 'in_progress' ? (
                              getStatusIcon(step.status)
                            ) : (
                              <Icon className="w-5 h-5 text-muted-foreground" />
                            )}
                          </div>
                          {step.status === 'in_progress' && (
                            <motion.div
                              className="absolute inset-0 rounded-full bg-primary opacity-30"
                              animate={{ scale: [1, 1.3, 1] }}
                              transition={{ duration: 2, repeat: Infinity }}
                            />
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 pb-8">
                          <div className="bg-card border border-border rounded-lg p-4 hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between mb-2">
                              <h3 className="text-lg font-semibold text-foreground">
                                {step.title}
                              </h3>
                              {step.status === 'in_progress' && (
                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full">
                                  En cours
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mb-3">
                              {step.description}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Clock className="w-3 h-3" />
                              <span>{step.date}</span>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              {/* Next steps info */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                className="mt-8 p-4 bg-primary/5 border border-primary/20 rounded-lg"
              >
                <h4 className="text-sm font-semibold text-foreground mb-2">
                  Prochaines étapes
                </h4>
                <p className="text-sm text-muted-foreground">
                  Vous recevrez un email de confirmation avec le lien Zoom pour votre entretien
                  technique. Préparez-vous à discuter de vos expériences avec Django et Python.
                </p>
              </motion.div>
            </div>
          </Card>
        </motion.div>
      </div>
      )}
    </DashboardLayout>
  );
};

export default ApplicationTrackingPage;
