import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { motion } from 'framer-motion';
import { AlertCircle, TrendingUp } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface RetentionChartProps {
  data?: { month: string; retention: number; turnover: number }[];
  isLoading?: boolean;
  isError?: boolean;
}

function ChartShell({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-lg border border-border bg-card p-6 shadow-sm"
    >
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Taux de rétention</h3>
          <p className="text-sm text-muted-foreground">Évolution sur 12 mois</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-primary" />
            <span className="text-sm text-muted-foreground">Rétention</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-destructive" />
            <span className="text-sm text-muted-foreground">Turnover</span>
          </div>
        </div>
      </div>
      {children}
    </motion.div>
  );
}

export default function RetentionChart({ data, isLoading = false, isError = false }: RetentionChartProps) {
  if (isLoading) {
    return (
      <ChartShell>
        <Skeleton className="h-72 w-full rounded-lg" />
      </ChartShell>
    );
  }

  if (isError) {
    return (
      <ChartShell>
        <div className="flex h-72 flex-col items-center justify-center gap-2 text-center" role="alert">
          <AlertCircle className="h-8 w-8 text-destructive/60" />
          <p className="text-sm font-medium">Impossible de charger le taux de rétention</p>
          <p className="text-xs text-muted-foreground">Réessayez dans quelques instants.</p>
        </div>
      </ChartShell>
    );
  }

  if (!data || data.length === 0) {
    return (
      <ChartShell>
        <div className="flex h-72 flex-col items-center justify-center gap-2 text-center">
          <TrendingUp className="h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm font-medium">Pas encore de données de rétention</p>
          <p className="text-xs text-muted-foreground">L'historique apparaîtra ici dès les premiers mois de suivi.</p>
        </div>
      </ChartShell>
    );
  }

  return (
    <ChartShell>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="retentionGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="turnoverGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              domain={[0, 100]}
              tickFormatter={(value) => `${value}%`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
              labelStyle={{ color: 'hsl(var(--foreground))' }}
            />
            <Area
              type="monotone"
              dataKey="retention"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              fill="url(#retentionGradient)"
              name="Rétention"
            />
            <Area
              type="monotone"
              dataKey="turnover"
              stroke="hsl(var(--destructive))"
              strokeWidth={2}
              fill="url(#turnoverGradient)"
              name="Turnover"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </ChartShell>
  );
}
