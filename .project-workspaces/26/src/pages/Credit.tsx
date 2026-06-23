import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Helmet } from 'react-helmet-async';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { PageHeroHeader } from '@/components/navigation/PageHeroHeader';
import CurrentScoresSummary from '@/components/credit/CurrentScoresSummary';
import CreditScoreHero from '@/components/credit/CreditScoreHero';
import CreditScoreChart from '@/components/credit/CreditScoreChart';
import AddCreditScoreModal from '@/components/credit/AddCreditScoreModal';
import CreditScoreHistory from '@/components/credit/CreditScoreHistory';
import CreditScoreSimulator from '@/components/credit/CreditScoreSimulator';
import CreditScoreAlerts from '@/components/credit/CreditScoreAlerts';
import CreditScoreGoalTracker from '@/components/credit/CreditScoreGoalTracker';
import { CreditUtilizationTracker } from '@/components/credit/CreditUtilizationTracker';
import CreditBureauLinks from '@/components/credit/CreditBureauLinks';
import CreditPremiumFeatures from '@/components/credit/CreditPremiumFeatures';
import { BarChart3, Target, Gauge, Sliders, Bell, ExternalLink, Crown, CreditCard } from 'lucide-react';

interface CreditScore {
  id: string;
  score: number;
  bureau: string;
  score_date: string;
  notes: string | null;
  created_at: string;
}

const Credit = () => {
  const { user } = useAuth();
  const [creditScores, setCreditScores] = useState<CreditScore[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  const fetchCreditScores = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('credit_scores')
        .select('*')
        .eq('user_id', user.id)
        .order('score_date', { ascending: false });

      if (error) throw error;
      setCreditScores(data || []);
    } catch (error) {
      console.error('Error fetching credit scores:', error);
      toast.error('Failed to load credit scores');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCreditScores();

    // Set up real-time subscription for credit scores
    if (!user) return;
    
    const channel = supabase
      .channel('credit-scores-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'credit_scores',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('Credit score change:', payload);
          fetchCreditScores();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const latestScore = creditScores[0];
  const previousScore = creditScores[1];
  const scoreChange = latestScore && previousScore 
    ? latestScore.score - previousScore.score 
    : 0;

  return (
    <>
      <Helmet>
        <title>Credit Score | CoinsBloom</title>
        <meta name="description" content="Track your credit scores, view trends, simulate changes, and access credit resources." />
      </Helmet>
      
      <div className="min-h-screen bg-background">
        <DashboardHeader />
        
        <PageHeroHeader
          title="Credit Score"
          subtitle="Track your scores, set goals, and monitor credit health"
          icon={<CreditCard className="h-6 w-6 text-white" />}
          colorScheme="blue"
        />

        <main className="container mx-auto px-4 pt-0 pb-6 max-w-6xl">
          <p className="text-xs text-muted-foreground italic px-1 mt-3">
            Scores are self-reported — update anytime using your credit bureau reports. Need help? Ask Bloom!
          </p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-6"
          >

            {/* Credit Score Content */}
            <div className="space-y-6 mt-6">
                {/* Current Scores Summary */}
                <CurrentScoresSummary 
                  creditScores={creditScores}
                  isLoading={isLoading}
                />

                {/* Credit Score Hero */}
                <CreditScoreHero 
                  latestScore={latestScore}
                  scoreChange={scoreChange}
                  isLoading={isLoading}
                  onAddScore={() => setShowAddModal(true)}
                />

                {/* Credit Score Trend Chart - positioned before tabs like other pages */}
                <CreditScoreChart 
                  creditScores={creditScores}
                  isLoading={isLoading}
                />

                {/* Score Sub-Tabs */}
                <Tabs defaultValue="overview" className="w-full">
                  <TabsList className="grid w-full grid-cols-4 md:grid-cols-7 h-auto gap-1 p-1.5 bg-muted/50 border border-primary/30 dark:border-cyan-500/30 rounded-xl">
                    <TabsTrigger value="overview" className="py-2 px-1 flex flex-col items-center gap-0.5 border border-transparent data-[state=active]:border-blue-400/40 data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-400 rounded-lg">
                      <BarChart3 className="h-4 w-4" />
                      <span className="text-[10px] leading-tight">Overview</span>
                    </TabsTrigger>
                    <TabsTrigger value="goals" className="py-2 px-1 flex flex-col items-center gap-0.5 border border-transparent data-[state=active]:border-emerald-400/40 data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400 rounded-lg">
                      <Target className="h-4 w-4" />
                      <span className="text-[10px] leading-tight">Goals</span>
                    </TabsTrigger>
                    <TabsTrigger value="utilization" className="py-2 px-1 flex flex-col items-center gap-0.5 border border-transparent data-[state=active]:border-amber-400/40 data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400 rounded-lg">
                      <Gauge className="h-4 w-4" />
                      <span className="text-[10px] leading-tight">Utilization</span>
                    </TabsTrigger>
                    <TabsTrigger value="simulator" className="py-2 px-1 flex flex-col items-center gap-0.5 border border-transparent data-[state=active]:border-violet-400/40 data-[state=active]:bg-violet-500/20 data-[state=active]:text-violet-400 rounded-lg">
                      <Sliders className="h-4 w-4" />
                      <span className="text-[10px] leading-tight">Simulator</span>
                    </TabsTrigger>
                    <TabsTrigger value="alerts" className="py-2 px-1 flex flex-col items-center gap-0.5 border border-transparent data-[state=active]:border-rose-400/40 data-[state=active]:bg-rose-500/20 data-[state=active]:text-rose-400 rounded-lg">
                      <Bell className="h-4 w-4" />
                      <span className="text-[10px] leading-tight">Alerts</span>
                    </TabsTrigger>
                    <TabsTrigger value="resources" className="py-2 px-1 flex flex-col items-center gap-0.5 border border-transparent data-[state=active]:border-cyan-400/40 data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400 rounded-lg">
                      <ExternalLink className="h-4 w-4" />
                      <span className="text-[10px] leading-tight">Resources</span>
                    </TabsTrigger>
                    <TabsTrigger value="premium" className="py-2 px-1 flex flex-col items-center gap-0.5 border border-transparent data-[state=active]:border-purple-400/40 data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-400 rounded-lg">
                      <Crown className="h-4 w-4" />
                      <span className="text-[10px] leading-tight">Premium</span>
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="overview" className="space-y-6 mt-6">
                    <CreditScoreHistory
                      creditScores={creditScores}
                      isLoading={isLoading}
                      onRefresh={fetchCreditScores}
                    />
                  </TabsContent>

                  <TabsContent value="goals" className="mt-6">
                    <CreditScoreGoalTracker 
                      currentScore={latestScore?.score || 670}
                    />
                  </TabsContent>

                  <TabsContent value="utilization" className="mt-6">
                    <CreditUtilizationTracker />
                  </TabsContent>

                  <TabsContent value="simulator" className="mt-6">
                    <CreditScoreSimulator 
                      currentScore={latestScore?.score || 670}
                    />
                  </TabsContent>

                  <TabsContent value="alerts" className="mt-6">
                    <CreditScoreAlerts 
                      creditScores={creditScores}
                    />
                  </TabsContent>

                  <TabsContent value="resources" className="mt-6">
                    <CreditBureauLinks />
                  </TabsContent>

                  <TabsContent value="premium" className="mt-6">
                    <CreditPremiumFeatures />
                  </TabsContent>
                </Tabs>
            </div>
          </motion.div>
        </main>

        <AddCreditScoreModal 
          open={showAddModal}
          onOpenChange={setShowAddModal}
          onSuccess={fetchCreditScores}
          previousScore={previousScore?.score}
          significantChangeThreshold={20}
        />
      </div>
    </>
  );
};

export default Credit;
