import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Search,
  Briefcase,
  MapPin,
  Clock,
  Users,
  Plus,
  Loader2,
} from 'lucide-react';
import { recruitmentService } from '@/services/recruitmentService';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';

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

export default function JobOfferListPage() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<string>('Toutes');

  const isRHOrAdmin = user?.role === 'RH' || user?.role === 'ADMIN';
  const isCandidate = user?.role === 'CANDIDATE';

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
    <DashboardLayout>
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
            <Button className="bg-primary text-primary-foreground">
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
              className="border border-border shadow-sm transition-all hover:border-primary"
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
              <CardContent className="space-y-3">
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

                <div className="pt-2">
                  {isCandidate ? (
                    <Button className="w-full bg-primary text-primary-foreground">
                      Postuler
                    </Button>
                  ) : (
                    <Button variant="outline" className="w-full">
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
      </motion.div>
    </DashboardLayout>
  );
}
