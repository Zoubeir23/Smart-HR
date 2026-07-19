import type { AnalyticsPeriod } from '@/services/analyticsService';

export type AnalyticsActiveTab =
  | 'overview'
  | 'workforce'
  | 'performance'
  | 'talents'
  | 'training'
  | 'engagement'
  | 'recruitment'
  | 'payroll';

export const ANALYTICS_TABS: [AnalyticsActiveTab, string][] = [
  ['overview', "Vue d'ensemble"],
  ['workforce', 'Effectif & Structure'],
  ['performance', 'Performance'],
  ['talents', 'Talents'],
  ['training', 'Formation'],
  ['engagement', 'Engagement'],
  ['recruitment', 'Recrutement'],
  ['payroll', 'Masse Salariale'],
];

export const ANALYTICS_PERIODS: [AnalyticsPeriod, string][] = [
  ['1m', '1M'],
  ['3m', '3M'],
  ['6m', '6M'],
  ['1y', '1A'],
];
