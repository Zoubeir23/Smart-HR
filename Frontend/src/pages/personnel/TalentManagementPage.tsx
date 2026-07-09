import { useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import CareerPathsTab from '@/components/personnel/CareerPathsTab';
import SuccessionPlansTab from '@/components/personnel/SuccessionPlansTab';
import StrategicObjectivesTab from '@/components/personnel/StrategicObjectivesTab';

type ActiveTab = 'career-paths' | 'succession' | 'strategic-okr';

export default function TalentManagementPage() {
  const { user } = useAuth();
  const canManage = user?.role === 'RH' || user?.role === 'ADMIN';
  const [activeTab, setActiveTab] = useState<ActiveTab>('career-paths');

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Talents & Carrière</h1>
        <p className="mt-1 text-muted-foreground">Parcours de carrière, plans de succession et objectifs stratégiques</p>
      </div>

      <div className="flex gap-1 rounded-lg border bg-muted/40 p-1 w-fit">
        {(
          [
            ['career-paths', 'Parcours de carrière'],
            ['succession', 'Succession'],
            ['strategic-okr', 'Objectifs stratégiques'],
          ] as [ActiveTab, string][]
        ).map(([tab, label]) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'rounded-md px-4 py-1.5 text-sm font-medium transition-all',
              activeTab === tab ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'career-paths' && <CareerPathsTab canManage={canManage} />}
      {activeTab === 'succession' && <SuccessionPlansTab canManage={canManage} />}
      {activeTab === 'strategic-okr' && <StrategicObjectivesTab canManage={canManage} />}
    </motion.div>
  );
}
