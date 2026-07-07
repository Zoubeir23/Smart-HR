import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import {
  FileText,
  Briefcase,
  Calendar,
  Clock,
  ArrowRight,
  Send,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { recruitmentService } from '@/services/recruitmentService';

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

// Badge helpers — statuts API: pending, reviewing, interview, accepted, rejected
function getStatusBadge(status: string) {
  const s = (status || '').toLowerCase();
  switch (s) {
    case 'pending':
      return <Badge variant="warning">En attente</Badge>;
    case 'reviewing':
      return <Badge variant="secondary">En revue</Badge>;
    case 'interview':
      return <Badge variant="default">Entretien</Badge>;
    case 'accepted':
      return <Badge variant="success">Accepté</Badge>;
    case 'rejected':
      return <Badge variant="destructive">Refusé</Badge>;
    default:
      return <Badge>{status || '—'}</Badge>;
  }
}

const JOB_TYPE_LABELS: Record<string, string> = {
  full_time: 'CDI',
  part_time: 'Temps partiel',
  contract: 'CDD',
  internship: 'Stage',
};

export default function CandidateDashboard() {
  const { user } = useAuth();

  const { data: jobs, isLoading: isLoadingJobs } = useQuery({ queryKey: ['jobs'], queryFn: () => recruitmentService.getJobs() });
  const { data: myApps, isLoading: isLoadingApps } = useQuery({ queryKey: ['my-applications'], queryFn: () => recruitmentService.getApplications() });

  const candidatures = myApps?.results || myApps || [];
  const offresRecommandees = jobs?.results || jobs || [];

  const entretiens = candidatures.filter((c: Record<string, unknown>) => (c.status || c.statut) === 'interview');
  const prochainEntretien = entretiens.length > 0 ? entretiens[0] : null;

  // Stats
  const stats = [
    {
      title: 'Candidatures envoyées',
      value: candidatures.length,
      icon: FileText,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-500/10',
    },
    {
      title: 'Entretiens planifiés',
      value: entretiens.length,
      icon: Calendar,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-500/10',
    },
    {
      title: 'Offres consultées',
      value: offresRecommandees.length,
      icon: Briefcase,
      color: 'text-indigo-600 dark:text-indigo-400',
      bgColor: 'bg-indigo-500/10',
    },
  ];

  if (isLoadingJobs || isLoadingApps) {
    return (
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Chargement...</p>
        </div>
    );
  }

  return (
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-4 sm:space-y-5 md:space-y-6"
      >
        {/* Header */}
        <motion.div variants={itemVariants} className="space-y-1 sm:space-y-2">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            Espace Candidat
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Bienvenue, {user?.first_name || 'Candidat'}. Suivez vos candidatures et
            découvrez de nouvelles opportunités.
          </p>
        </motion.div>

        {/* Stats Row - Responsive: 1 col mobile, 3 col desktop */}
        <motion.div
          variants={containerVariants}
          className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-3"
        >
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <motion.div key={index} variants={itemVariants}>
                <Card className="border border-border shadow-sm">
                  <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 sm:p-4">
                    <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
                      {stat.title}
                    </CardTitle>
                    <div className={`${stat.bgColor} rounded-lg p-2`}>
                      <Icon className={`h-4 w-4 sm:h-5 sm:w-5 ${stat.color}`} />
                    </div>
                  </CardHeader>
                  <CardContent className="p-3 sm:p-4">
                    <div className="text-2xl sm:text-3xl font-bold text-foreground">{stat.value}</div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Mes Candidatures */}
        <motion.div variants={itemVariants} className="space-y-3 sm:space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg sm:text-xl font-bold text-foreground">Mes Candidatures</h2>
            <Button variant="ghost" size="sm" className="text-primary text-xs sm:text-sm h-8 sm:h-9 gap-1" asChild>
              <Link to="/my-applications">
                Voir tout
                <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4" />
              </Link>
            </Button>
          </div>

          <Card className="border border-border shadow-sm">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b bg-muted/50">
                    <tr>
                      <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold text-foreground">
                        Poste
                      </th>
                      <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold text-foreground hidden sm:table-cell">
                        Département
                      </th>
                      <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold text-foreground">
                        Date
                      </th>
                      <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold text-foreground">
                        Statut
                      </th>
                      <th className="px-3 sm:px-6 py-2 sm:py-3 text-right text-xs sm:text-sm font-semibold text-foreground">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {candidatures.map((candidature: Record<string, unknown>) => (
                      <motion.tr
                        key={String(candidature.id)}
                        variants={itemVariants}
                        className="transition-colors hover:bg-muted/50"
                      >
                        <td className="px-3 sm:px-6 py-2 sm:py-4">
                          <div className="flex items-center gap-2 min-w-0">
                            <Briefcase className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
                            <span className="font-medium text-foreground text-xs sm:text-sm truncate">
                              {(candidature.job_title ?? candidature.poste) as string}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 sm:px-6 py-2 sm:py-4 text-xs sm:text-sm text-muted-foreground hidden sm:table-cell">
                          {(candidature.job_department ?? (candidature.job_offer as { department?: string })?.department ?? candidature.departement) ?? '—'}
                        </td>
                        <td className="px-3 sm:px-6 py-2 sm:py-4 text-xs sm:text-sm text-muted-foreground">
                          {new Date((candidature.created_at ?? candidature.date_candidature) as string).toLocaleDateString('fr-FR')}
                        </td>
                        <td className="px-3 sm:px-6 py-2 sm:py-4">
                          {getStatusBadge((candidature.status ?? candidature.statut) as string)}
                        </td>
                        <td className="px-3 sm:px-6 py-2 sm:py-4 text-right">
                          <Button variant="ghost" size="sm" className="text-xs sm:text-sm h-8 sm:h-9" asChild>
                            <Link to="/my-applications">Voir</Link>
                          </Button>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Offres recommandées */}
        <motion.div variants={itemVariants} className="space-y-3 sm:space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg sm:text-xl font-bold text-foreground">Offres recommandées</h2>
            <Button variant="outline" size="sm" className="text-xs sm:text-sm h-8 sm:h-9" asChild>
              <Link to="/jobs">Toutes les offres</Link>
            </Button>
          </div>

          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {offresRecommandees.map((offre: Record<string, unknown>) => (
              <motion.div
                key={String(offre.id)}
                variants={itemVariants}
                whileHover={{ y: -4 }}
                transition={{ type: 'spring', stiffness: 300 }}
              >
                <Card className="h-full border border-border shadow-sm transition-shadow hover:shadow-md">
                  <CardHeader className="p-3 sm:p-4">
                    <div className="space-y-2">
                      <CardTitle className="text-base sm:text-lg">{(offre.title ?? offre.titre) as string}</CardTitle>
                      <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                        <Briefcase className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                        {(offre.department ?? offre.departement) as string}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Badge variant={(offre.job_type ?? offre.contrat) === 'full_time' ? 'default' : 'secondary'}>
                        {JOB_TYPE_LABELS[(offre.job_type ?? offre.contrat) as string] ?? (offre.contrat as string) ?? '—'}
                      </Badge>
                    </div>

                    {offre.matching_score != null && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Compatibilité</span>
                          <span className="font-bold">{(offre.matching_score ?? offre.matching) as number}%</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-muted">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${(offre.matching_score ?? offre.matching) ?? 0}%` }}
                            transition={{ duration: 0.8, ease: 'easeOut' }}
                            className="h-full rounded-full bg-primary"
                          />
                        </div>
                      </div>
                    )}

                    <Button className="w-full" asChild>
                      <Link to={`/jobs/${offre.id}/apply`}>
                        <Send className="mr-2 h-4 w-4" />
                        Postuler
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Prochains entretiens */}
        <motion.div variants={itemVariants} className="space-y-4">
          <h2 className="text-xl font-bold text-foreground">Prochains entretiens</h2>

          {prochainEntretien ? (
            <Card className="border border-border shadow-sm">
              <CardContent className="p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-secondary/10">
                      <Calendar className="h-6 w-6 text-primary" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-semibold text-foreground">
                        {(prochainEntretien as Record<string, unknown>).job_title ?? (prochainEntretien as Record<string, unknown>).poste}
                      </h3>
                      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                        {((prochainEntretien as Record<string, unknown>).interview_date ?? (prochainEntretien as Record<string, unknown>).created_at) && (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            <span>
                              {new Date(
                                ((prochainEntretien as Record<string, unknown>).interview_date ?? (prochainEntretien as Record<string, unknown>).created_at) as string
                              ).toLocaleDateString('fr-FR', {
                                weekday: 'long',
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric',
                              })}
                            </span>
                          </div>
                        )}
                        {(prochainEntretien as Record<string, unknown>).interview_time && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            <span>{(prochainEntretien as Record<string, unknown>).interview_time as string}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/my-applications">
                      Voir les détails
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border border-border shadow-sm">
              <CardContent className="p-6 text-center text-muted-foreground">
                Aucun entretien planifié pour le moment.
              </CardContent>
            </Card>
          )}
        </motion.div>
      </motion.div>
  );
}
