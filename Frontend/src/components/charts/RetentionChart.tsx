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

interface RetentionChartProps {
  data?: { month: string; retention: number; turnover: number }[];
}

const defaultData = [
  { month: 'Jan', retention: 95, turnover: 5 },
  { month: 'Fév', retention: 94, turnover: 6 },
  { month: 'Mar', retention: 96, turnover: 4 },
  { month: 'Avr', retention: 93, turnover: 7 },
  { month: 'Mai', retention: 95, turnover: 5 },
  { month: 'Juin', retention: 97, turnover: 3 },
  { month: 'Juil', retention: 96, turnover: 4 },
  { month: 'Août', retention: 94, turnover: 6 },
  { month: 'Sep', retention: 95, turnover: 5 },
  { month: 'Oct', retention: 96, turnover: 4 },
  { month: 'Nov', retention: 97, turnover: 3 },
  { month: 'Déc', retention: 98, turnover: 2 },
];

export default function RetentionChart({ data = defaultData }: RetentionChartProps) {
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
    </motion.div>
  );
}
