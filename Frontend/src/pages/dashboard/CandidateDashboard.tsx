import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import {
  FileText,
  Briefcase,
  Calendar,
  TrendingUp,
  Clock,
  ArrowRight,
  Send,
} from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
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

// Badge helpers
function getStatusBadge(status: string) {
  switch (status) {
    case 'EN_ATTENTE':
      return <Badge variant="warning">En attente</Badge>;
    case 'ENTRETIEN':
      return <Badge variant="default">Entretien</Badge>;
    case 'ACCEPTE':
      return <Badge variant="success">Accepté</Badge>;
    case 'REFUSE':
      return <Badge variant="destructive">Refusé</Badge>;
    default:
      return <Badge>{status}</Badge>;
  }
}

function getMatchingColor(score: number) {
  if (score >= 90) return 'text-success';
  if (score >= 80) return 'text-primary';
  return 'text-warning';
}

function getMatchingBgColor(score: number) {
  if (score >= 90) return 'bg-success';
  if (score >= 80) return 'bg-primary';
  return 'bg-warning';
}

export default function CandidateDashboard() {
  const { user } = useAuth();

  const { data: jobs, isLoading: isLoadingJobs } = useQuery({ queryKey: ['jobs'], queryFn: () => recruitmentService.getJobs() });
  const { data: myApps, isLoading: isLoadingApps } = useQuery({ queryKey: ['my-applications'], queryFn: () => recruitmentService.getApplications() });

  const candidatures = myApps?.results || myApps || [];
  const offresRecommandees = jobs?.results || jobs || [];

  const entretiens = candidatures.filter((c: Record<string, unknown>) => c.statut === 'ENTRETIEN');
  const mockEntretien = entretiens.length > 0 ? entretiens[0] : null;

  // Stats
  const stats = [
    {
      title: 'Candidatures envoyées',
      value: candidatures.length,
      icon: FileText,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Entretiens planifiés',
      value: entretiens.length,
      icon: Calendar,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Offres consultées',
      value: offresRecommandees.length,
      icon: Briefcase,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
    },
  ];

  if (isLoadingJobs || isLoadingApps) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-6"
      >
        {/* Header */}
        <motion.div variants={itemVariants} className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
            Espace Candidat
          </h1>
          <p className="text-muted-foreground">
            Bienvenue, {user?.first_name || 'Candidat'}. Suivez vos candidatures et
            découvrez de nouvelles opportunités.
          </p>
        </motion.div>

        {/* Stats Row */}
        <motion.div
          variants={containerVariants}
          className="grid gap-4 sm:grid-cols-3"
        >
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <motion.div key={index} variants={itemVariants}>
                <Card className="border border-border shadow-sm">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {stat.title}
                    </CardTitle>
                    <div className={`${stat.bgColor} rounded-lg p-2`}>
                      <Icon className={`h-5 w-5 ${stat.color}`} />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-foreground">{stat.value}</div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Mes Candidatures */}
        <motion.div variants={itemVariants} className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-foreground">Mes Candidatures</h2>
            <Button variant="ghost" size="sm" className="text-primary">
              Voir tout
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </div>

          <Card className="border border-border shadow-sm">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b bg-muted/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">
                        Poste
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">
                        Département
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">
                        Statut
                      </th>
                      <th className="px-6 py-3 text-right text-sm font-semibold text-foreground">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {candidatures.map((candidature) => (
                      <motion.tr
                        key={candidature.id}
                        variants={itemVariants}
                        className="transition-colors hover:bg-muted/50"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Briefcase className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium text-foreground">
                              {candidature.poste}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-muted-foreground">
                          {candidature.departement}
                        </td>
                        <td className="px-6 py-4 text-sm text-muted-foreground">
                          {new Date(candidature.date_candidature).toLocaleDateString('fr-FR')}
                        </td>
                        <td className="px-6 py-4">
                          {getStatusBadge(candidature.statut)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Button variant="ghost" size="sm">
                            Voir détails
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
        <motion.div variants={itemVariants} className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-foreground">Offres recommandées</h2>
            <Button variant="outline" size="sm">
              Toutes les offres
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {offresRecommandees.map((offre) => (
              <motion.div
                key={offre.id}
                variants={itemVariants}
                whileHover={{ y: -4 }}
                transition={{ type: 'spring', stiffness: 300 }}
              >
                <Card className="h-full border border-border shadow-sm transition-shadow hover:shadow-md">
                  <CardHeader>
                    <div className="space-y-2">
                      <CardTitle className="text-lg">{offre.titre}</CardTitle>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Briefcase className="h-4 w-4" />
                        {offre.departement}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Badge variant={offre.contrat === 'CDI' ? 'default' : 'secondary'}>
                        {offre.contrat}
                      </Badge>
                    </div>

                    {/* Matching score */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <TrendingUp className="h-4 w-4" />
                          <span>Compatibilité</span>
                        </div>
                        <span className={`font-bold ${getMatchingColor(offre.matching)}`}>
                          {offre.matching}%
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${offre.matching}%` }}
                          transition={{ duration: 0.8, ease: 'easeOut' }}
                          className={`h-full rounded-full ${getMatchingBgColor(offre.matching)}`}
                        />
                      </div>
                    </div>

                    <Button className="w-full">
                      <Send className="mr-2 h-4 w-4" />
                      Postuler
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

          {mockEntretien ? (
            <Card className="border border-border shadow-sm">
              <CardContent className="p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                      <Calendar className="h-6 w-6 text-primary" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-semibold text-foreground">{mockEntretien.poste}</h3>
                      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                        {mockEntretien.date && (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            <span>
                              {new Date(mockEntretien.date).toLocaleDateString('fr-FR', {
                                weekday: 'long',
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric',
                              })}
                            </span>
                          </div>
                        )}
                        {mockEntretien.heure && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            <span>{mockEntretien.heure}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        {mockEntretien.type && <Badge variant="secondary">{mockEntretien.type}</Badge>}
                        {mockEntretien.lieu && <span className="text-sm text-muted-foreground">{mockEntretien.lieu}</span>}
                      </div>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    Voir les détails
                    <ArrowRight className="ml-2 h-4 w-4" />
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
    </DashboardLayout>
  );
}
