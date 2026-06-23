import { useMemo } from 'react';
import type { FunnelLeak } from '../components/LeakRecoveryPanel';

interface StepMetrics {
  id: string;
  title: string;
  step_type: string;
  views: number;
  leads: number;
  rate: number;
}

const CRITICAL_THRESHOLD = 80; // drop-off > 80%
const WARNING_THRESHOLD = 60;  // drop-off > 60%
const MIN_VIEWS = 3;           // minimum views to trigger detection

export function useLeakDetection(nodes: StepMetrics[]): FunnelLeak[] {
  return useMemo(() => {
    if (nodes.length < 2) return [];

    const leaks: FunnelLeak[] = [];

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      if (node.views < MIN_VIEWS) continue;

      // Check conversion rate leak (high views, low leads)
      const dropOff = node.views > 0 ? ((node.views - node.leads) / node.views) * 100 : 0;

      if (dropOff >= WARNING_THRESHOLD) {
        leaks.push({
          stepId: node.id,
          stepTitle: node.title,
          stepType: node.step_type,
          views: node.views,
          leads: node.leads,
          conversionRate: node.rate,
          dropOffPercent: dropOff,
          severity: dropOff >= CRITICAL_THRESHOLD ? 'critical' : dropOff >= WARNING_THRESHOLD ? 'warning' : 'mild',
        });
      }
    }

    // Sort by severity (critical first) then by drop-off
    return leaks.sort((a, b) => {
      const severityOrder = { critical: 0, warning: 1, mild: 2 };
      if (severityOrder[a.severity] !== severityOrder[b.severity]) {
        return severityOrder[a.severity] - severityOrder[b.severity];
      }
      return b.dropOffPercent - a.dropOffPercent;
    });
  }, [nodes]);
}
