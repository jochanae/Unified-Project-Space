import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { usePlan, PlanItem } from '@/hooks/usePlan';
import { PlanSection } from '@/components/plan/PlanSection';
import { PlanStats } from '@/components/plan/PlanStats';
import { PlanEmptyState } from '@/components/plan/PlanEmptyState';
import { AddSectionDialog } from '@/components/plan/AddSectionDialog';
import { PlanOnboardingModal } from '@/components/plan/PlanOnboardingModal';
import { PlanShareMenu } from '@/components/plan/PlanShareMenu';
import { PlanSelector } from '@/components/plan/PlanSelector';
import { AddPlanDialog } from '@/components/plan/AddPlanDialog';
import { TradingPlanTab } from '@/components/plan/TradingPlanTab';
import { Button } from '@/components/ui/button';
import { Loader2, Plus, Sparkles, Wallet, BarChart2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type PlanTab = 'money' | 'trading';

export default function Plan() {
  const navigate = useNavigate();
  const {
    plans,
    activePlan,
    activePlanId,
    selectPlan,
    addPlan,
    deletePlan,
    sectionsWithItems,
    stats,
    isLoading,
    addSection,
    updateSection,
    deleteSection,
    addItem,
    updateItem,
    deleteItem,
    archiveItem,
  } = usePlan();

  const [showAddSection, setShowAddSection] = useState(false);
  const [showAddPlan, setShowAddPlan] = useState(false);
  const [activeTab, setActiveTab] = useState<PlanTab>('money');

  const handleAskQuinn = (item?: PlanItem) => {
    if (item) {
      navigate('/mentor', {
        state: {
          prefillMessage: `Let's revisit my plan item: "${item.title}"${item.description ? ` - ${item.description}` : ''}`,
        },
      });
    } else {
      const context = activeTab === 'trading' ? 'my trading plan' : 'my financial plan';
      navigate('/mentor', {
        state: {
          prefillMessage: `I'd like help building ${context}. What should I focus on first?`,
        },
      });
    }
  };

  const handleDeletePlan = async (planId: string) => {
    if (confirm('Are you sure you want to delete this plan? All sections and items will be removed.')) {
      await deletePlan(planId);
    }
  };

  const hasItems = stats.total > 0;

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 space-y-5 pb-20">
        {/* Page title */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">My Plans</h1>
          <div className="flex items-center gap-2">
            <PlanShareMenu sectionsWithItems={sectionsWithItems} stats={stats} />
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAskQuinn()}
              className="gap-2"
            >
              <Sparkles className="h-4 w-4 text-chart-3" />
              Ask Quinn
            </Button>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 p-1 rounded-lg bg-muted/50 border border-border/50">
          <button
            onClick={() => setActiveTab('money')}
            className={cn(
              'flex items-center gap-2 flex-1 px-4 py-2.5 rounded-md text-sm font-medium transition-all',
              activeTab === 'money'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
            )}
          >
            <Wallet className="h-4 w-4" />
            My Money Plan
          </button>
          <button
            onClick={() => setActiveTab('trading')}
            className={cn(
              'flex items-center gap-2 flex-1 px-4 py-2.5 rounded-md text-sm font-medium transition-all',
              activeTab === 'trading'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
            )}
          >
            <BarChart2 className="h-4 w-4" />
            My Trading Plan
          </button>
        </div>

        {/* Money Plan tab */}
        {activeTab === 'money' && (
          <div className="space-y-5">
            {/* Plan selector row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <PlanSelector
                  plans={plans}
                  activePlan={activePlan}
                  onSelectPlan={selectPlan}
                  onAddPlan={() => setShowAddPlan(true)}
                  onDeletePlan={handleDeletePlan}
                />
                {activePlan?.description && (
                  <p className="text-sm text-muted-foreground whitespace-nowrap truncate hidden sm:block">
                    {activePlan.description}
                  </p>
                )}
              </div>
              <Button
                size="sm"
                onClick={() => setShowAddSection(true)}
                className="gap-2 shrink-0"
              >
                <Plus className="h-4 w-4" />
                Add Section
              </Button>
            </div>

            {/* Plan Progress Summary */}
            <PlanStats stats={stats} />

            {/* Sections or Empty State */}
            {sectionsWithItems.length === 0 ? (
              <PlanEmptyState onAskQuinn={() => handleAskQuinn()} />
            ) : (
              <div className="space-y-4">
                {sectionsWithItems.map((section) => (
                  <PlanSection
                    key={section.id}
                    section={section}
                    onUpdateSection={(id, updates) => updateSection({ id, ...updates })}
                    onDeleteSection={deleteSection}
                    onUpdateItem={(id, updates) => updateItem({ id, ...updates })}
                    onDeleteItem={deleteItem}
                    onArchiveItem={archiveItem}
                    onAddItem={addItem}
                    onAskQuinn={handleAskQuinn}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Trading Plan tab */}
        {activeTab === 'trading' && (
          <TradingPlanTab />
        )}

        {/* Add Section Dialog */}
        <AddSectionDialog
          open={showAddSection}
          onOpenChange={setShowAddSection}
          onSubmit={addSection}
        />

        {/* Add Plan Dialog */}
        <AddPlanDialog
          open={showAddPlan}
          onOpenChange={setShowAddPlan}
          onSubmit={addPlan}
        />

        {/* First-time onboarding modal */}
        <PlanOnboardingModal onComplete={() => toast.success('Welcome to My Plans! 🎯')} />
      </div>
    </DashboardLayout>
  );
}
