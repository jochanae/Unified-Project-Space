import { useState } from 'react';
import { Beaker, ChevronDown, ChevronRight } from 'lucide-react';
import { ABTestReport } from './ABTestReport';

interface ExperimentDashboardProps {
  projectId: string;
}

export function ExperimentDashboard({ projectId }: ExperimentDashboardProps) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="space-y-3">
      {/* Header */}
      <button
        className="w-full flex items-center gap-2 text-left"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Beaker className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold tracking-tight">Experiments</h3>
          <p className="text-xs text-muted-foreground">A/B test results & winners</p>
        </div>
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {expanded && (
        <div className="min-h-[200px]">
          <ABTestReport projectId={projectId} />
        </div>
      )}
    </div>
  );
}
