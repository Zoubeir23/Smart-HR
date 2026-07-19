import { useState } from 'react';
import { motion } from 'framer-motion';
import { FileSpreadsheet, FileText, RefreshCw } from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import PageHeader from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { departmentService } from '@/services/departmentService';
import { ANALYTICS_PERIODS, ANALYTICS_TABS, type AnalyticsActiveTab } from '@/components/analytics/analyticsConstants';
import { generateAnalyticsPdf } from '@/components/analytics/analyticsPdfExport';
import { EngagementTab } from '@/components/analytics/EngagementTab';
import { OverviewTab } from '@/components/analytics/OverviewTab';
import { PayrollAnalyticsTab } from '@/components/analytics/PayrollAnalyticsTab';
import { PerformanceTab } from '@/components/analytics/PerformanceTab';
import { RecruitmentTab } from '@/components/analytics/RecruitmentTab';
import { TalentsTab } from '@/components/analytics/TalentsTab';
import { TrainingTab } from '@/components/analytics/TrainingTab';
import { WorkforceTab } from '@/components/analytics/WorkforceTab';
import { analyticsService, AnalyticsPeriod } from '@/services/analyticsService';

export default function AnalyticsPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<AnalyticsActiveTab>('overview');
  const [departmentId, setDepartmentId] = useState<number | null>(null);
  const [period, setPeriod] = useState<AnalyticsPeriod>('1y');

  const { data: departmentsData } = useQuery({
    queryKey: ['departments'],
    queryFn: departmentService.getAll,
  });
  const departments: { id: number; name: string }[] = departmentsData?.results ?? departmentsData ?? [];

  const filters = { departmentId, period };
  const { data, isLoading, refetch, dataUpdatedAt } = useQuery({
    queryKey: ['hr-analytics-overview', departmentId, period],
    queryFn: () => analyticsService.getOverview(filters),
    staleTime: 5 * 60 * 1000,
  });

  const exportExcelMutation = useMutation({
    mutationFn: () => analyticsService.exportOverviewExcel(filters),
    onError: () => {
      toast({ title: 'Erreur', description: "Impossible d'exporter en Excel.", variant: 'destructive' });
    },
  });

  const handleExportPdf = () => {
    if (!data) return;
    generateAnalyticsPdf(data);
  };

  const lastUpdated = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-6"
      >
        <PageHeader
          title="People Analytics"
          description="Tableaux de bord et indicateurs RH — fini le reporting manuel"
          actions={
            <div className="flex flex-wrap items-center gap-3">
              <Select
                value={departmentId ? String(departmentId) : 'all'}
                onValueChange={(value) => setDepartmentId(value === 'all' ? null : Number(value))}
              >
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les départements</SelectItem>
                  {departments.map((department) => (
                    <SelectItem key={department.id} value={String(department.id)}>
                      {department.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex gap-1 rounded-lg border bg-muted/40 p-1">
                {ANALYTICS_PERIODS.map(([value, label]) => (
                  <button
                    key={value}
                    onClick={() => setPeriod(value)}
                    className={cn(
                      'rounded-md px-3 py-1 text-xs font-medium transition-all',
                      period === value ? 'bg-background text-foreground shadow' : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {lastUpdated && (
                <span className="text-xs text-muted-foreground">Actualisé à {lastUpdated}</span>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportExcelMutation.mutate()}
                disabled={exportExcelMutation.isPending}
              >
                <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" />
                Excel
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportPdf} disabled={!data}>
                <FileText className="mr-1.5 h-3.5 w-3.5" />
                PDF
              </Button>
              <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
                <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                Actualiser
              </Button>
            </div>
          }
        />

        {/* Onglets */}
        <div className="flex flex-wrap gap-1 rounded-lg border bg-muted/40 p-1">
          {ANALYTICS_TABS.map(([tab, label]) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'rounded-md px-4 py-1.5 text-sm font-medium transition-all',
                activeTab === tab ? 'bg-background text-foreground shadow' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && <OverviewTab data={data} isLoading={isLoading} />}
        {activeTab === 'workforce' && <WorkforceTab data={data} isLoading={isLoading} />}
        {activeTab === 'performance' && <PerformanceTab data={data} isLoading={isLoading} />}
        {activeTab === 'talents' && <TalentsTab data={data} isLoading={isLoading} />}
        {activeTab === 'training' && <TrainingTab data={data} isLoading={isLoading} />}
        {activeTab === 'engagement' && <EngagementTab data={data} isLoading={isLoading} />}
        {activeTab === 'recruitment' && <RecruitmentTab data={data} isLoading={isLoading} />}
        {activeTab === 'payroll' && <PayrollAnalyticsTab data={data} isLoading={isLoading} />}
      </motion.div>
  );
}
