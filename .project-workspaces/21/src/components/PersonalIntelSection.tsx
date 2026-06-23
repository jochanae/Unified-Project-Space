import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronDown, ChevronRight, RefreshCw, MessageCircle, User } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { discoveryTopics, getDiscoveryTopic } from '@/lib/discoveryTopics';
import type { DiscoveryTopic } from '@/lib/discoveryTopics';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import DiscoverySheet from './DiscoverySheet';
import BlueprintAssessment from './BlueprintAssessment';

interface DiscoveryResultRow {
  id: string;
  topic: string;
  result_key: string;
  result_label: string;
  result_emoji: string;
  result_description: string | null;
  secondary_key: string | null;
  secondary_label: string | null;
  completed_at: string;
}

interface PersonalIntelSectionProps {
  userId: string;
  companionName?: string;
  onStartDiscovery?: (topicId: string) => void;
  onDiscoverWithCompanion?: (topicId: string) => void;
}

const PersonalIntelSection: React.FC<PersonalIntelSectionProps> = ({ userId, companionName, onDiscoverWithCompanion }) => {
  const navigate = useNavigate();
  const [sheetTopic, setSheetTopic] = useState<DiscoveryTopic | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [choiceTopicId, setChoiceTopicId] = useState<string | null>(null);
  const [showAssessment, setShowAssessment] = useState(false);

  const { data: results = [], refetch } = useQuery({
    queryKey: ['discovery-results', userId],
    queryFn: async () => {
      const { data } = await supabase
        .from('discovery_results')
        .select('*')
        .eq('user_id', userId)
        .order('completed_at', { ascending: false });
      return (data || []) as unknown as DiscoveryResultRow[];
    },
    enabled: !!userId,
  });

  const completedTopicIds = new Set(results.map((r) => r.topic));

  const deleteResult = async (topicId: string) => {
    await supabase
      .from('discovery_results')
      .delete()
      .eq('user_id', userId)
      .eq('topic', topicId);
    refetch();
  };

  const openSolo = (topicId: string) => {
    const t = getDiscoveryTopic(topicId);
    if (t) {
      setSheetTopic(t);
      setSheetOpen(true);
    }
    setChoiceTopicId(null);
  };

  const openWithCompanion = (topicId: string) => {
    setChoiceTopicId(null);
    onDiscoverWithCompanion?.(topicId);
  };

  const handleTopicTap = (topicId: string) => {
    if (onDiscoverWithCompanion) {
      setChoiceTopicId(topicId);
    } else {
      openSolo(topicId);
    }
  };

  /* Dark-tinted glass style for cards over dynamic backgrounds */
  const darkGlass = {
    background: 'linear-gradient(135deg, rgba(40,40,40,0.45), rgba(20,20,20,0.3))',
    backdropFilter: 'blur(16px) saturate(160%)',
    WebkitBackdropFilter: 'blur(16px) saturate(160%)',
  };

  return (
    <>
      <Collapsible defaultOpen={results.length > 0} className="mb-2">
        <div
          className="rounded-3xl overflow-hidden"
          style={{
            ...darkGlass,
            border: '0.5px solid rgba(255,255,255,0.2)',
            boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.05), 0 0 0 1px rgba(212,175,80,0.25), 0 0 12px rgba(212,175,80,0.08)',
          }}
        >
          <CollapsibleTrigger className="w-full flex items-center justify-between px-4 py-3 text-left group">
            <span
              className="text-[11px] font-semibold tracking-wider uppercase text-subtext-muted"
              style={{ textShadow: '0 1px 4px rgba(0,0,0,0.9), 0 0 12px rgba(0,0,0,0.6)' }}
            >
              🧭 Your Compass
            </span>
            <div className="flex items-center gap-2">
              {results.length > 0 && (
                <button
                  onClick={(e) => { e.stopPropagation(); navigate('/personal-intel'); }}
                  className="text-[10px] text-primary/60 hover:text-primary transition-colors font-medium"
                >
                  View all →
                </button>
              )}
              <ChevronDown className="h-4 w-4 text-subtext-muted transition-transform group-data-[state=open]:rotate-180" />
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="px-4 pb-4 space-y-2">
              {/* Completed discoveries */}
              {results.map((r) => (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl backdrop-blur-sm border-[0.5px] border-white/20 px-4 py-3 flex items-center gap-3"
                  style={{
                    background: 'linear-gradient(135deg, rgba(40,40,40,0.4), rgba(20,20,20,0.25))',
                    boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.05), 0 0 0 1px rgba(212,175,80,0.15), 0 0 8px rgba(212,175,80,0.06)',
                  }}
                >
                  <span className="text-2xl">{r.result_emoji}</span>
                  <div className="flex-1 min-w-0">
                  <p className="text-[10px] uppercase tracking-widest text-primary/50 font-semibold mb-0.5" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.7)' }}>
                      {discoveryTopics.find((t) => t.id === r.topic)?.title || r.topic}
                    </p>
                    <p className="text-sm font-semibold text-foreground" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.9), 0 0 12px rgba(0,0,0,0.6)' }}>{r.result_label}</p>
                    {r.secondary_label && (
                      <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/[0.06] border border-white/[0.1] text-subtext-muted">
                        also {r.secondary_label}
                      </span>
                    )}
                    {r.result_description && (
                      <p className="text-[12px] text-subtext-muted leading-relaxed mt-0.5 line-clamp-2" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>{r.result_description}</p>
                    )}
                  </div>
                  <button
                    onClick={async () => { await deleteResult(r.topic); }}
                    className="p-1.5 rounded-lg hover:bg-white/[0.08] transition-colors text-muted-foreground/40 hover:text-muted-foreground/70"
                    title="Retake"
                  >
                    <RefreshCw size={14} />
                  </button>
                </motion.div>
              ))}

              {/* Available discoveries */}
              {discoveryTopics
                .filter((t) => !completedTopicIds.has(t.id) && t.id !== 'onboarding')
                .map((topic) => (
                  <div key={topic.id} className="relative">
                    <button
                      onClick={() => handleTopicTap(topic.id)}
                      className="w-full rounded-2xl backdrop-blur-sm border-[0.5px] border-white/[0.15] hover:border-primary/30 hover:bg-white/[0.06] px-4 py-3 flex items-center gap-3 transition-all group text-left"
                      style={{ background: 'linear-gradient(135deg, rgba(40,40,40,0.25), rgba(20,20,20,0.15))' }}
                    >
                      <span className="text-2xl opacity-60 group-hover:opacity-100 transition-opacity">{topic.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-subtext group-hover:text-white transition-colors" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.7)' }}>{topic.title}</p>
                        <p className="text-[12px] text-subtext-muted" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>{topic.subtitle}</p>
                      </div>
                      <ChevronRight size={16} className="text-muted-foreground/30 group-hover:text-primary/60 transition-colors" />
                    </button>

                    {/* Choice popover */}
                    {choiceTopicId === topic.id && (
                      <motion.div
                        initial={{ opacity: 0, y: -4, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        className="absolute left-0 right-0 top-full mt-1.5 z-20 rounded-2xl bg-background/95 backdrop-blur-xl border border-white/[0.12] shadow-xl overflow-hidden"
                      >
                        <div className="p-2 space-y-1">
                          <button
                            onClick={() => openSolo(topic.id)}
                            className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-white/[0.08] transition-colors group"
                          >
                            <User size={16} className="text-primary/60" />
                            <div>
                              <p className="text-sm font-medium text-foreground">On my own</p>
                              <p className="text-[11px] text-muted-foreground/50">Quick interactive quiz</p>
                            </div>
                          </button>
                          <button
                            onClick={() => openWithCompanion(topic.id)}
                            className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-white/[0.08] transition-colors group"
                          >
                            <MessageCircle size={16} className="text-primary/60" />
                            <div>
                              <p className="text-sm font-medium text-foreground">With {companionName || 'companion'}</p>
                              <p className="text-[11px] text-muted-foreground/50">Discuss & discover together</p>
                            </div>
                          </button>
                        </div>
                        <button
                          onClick={() => setChoiceTopicId(null)}
                          className="w-full text-center text-[11px] text-muted-foreground/40 py-2 border-t border-white/[0.06] hover:text-muted-foreground/60"
                        >
                          Cancel
                        </button>
                      </motion.div>
                    )}
                  </div>
                ))}

              {results.length === 0 && (
                <div className="text-center py-3">
                  <p className="text-[11px] text-subtext-muted mb-3" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>
                    Help your friend understand you from day one.
                  </p>
                  {/* Shadow pocket for guaranteed CTA readability */}
                  <div
                    className="flex justify-center items-center py-3 mx-auto"
                    style={{
                      background: 'radial-gradient(ellipse, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.15) 50%, transparent 100%)',
                      maxWidth: 260,
                    }}
                  >
                    <button
                      onClick={() => setShowAssessment(true)}
                      className="cta-golden text-[12px]"
                    >
                      → Start your Blueprint
                    </button>
                  </div>
                </div>
              )}
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>

      <DiscoverySheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        topic={sheetTopic}
        userId={userId}
        onComplete={() => refetch()}
      />

      {showAssessment && (
        <BlueprintAssessment
          companionName={companionName}
          onComplete={async (answers) => {
            await supabase.from('discovery_results').upsert([{
              user_id: userId,
              topic: 'onboarding',
              result_key: answers.why,
              result_label: answers.whyMode,
              result_emoji: '🌱',
              result_description: answers.snapshot,
              answers: answers as any,
            }], { onConflict: 'user_id,topic' });

            const bioContext = [
              `Looking for: ${answers.why.replace(/_/g, ' ')}.`,
              `Responds best to: ${answers.support.replace(/_/g, ' ')} energy.`,
              answers.snapshot ? `Important: ${answers.snapshot}` : '',
            ].filter(Boolean).join(' ');

            await supabase.from('profiles')
              .update({ bio: bioContext })
              .eq('user_id', userId);
          }}
          onDismiss={() => {
            setShowAssessment(false);
            refetch();
          }}
          onSkip={() => setShowAssessment(false)}
        />
      )}
    </>
  );
};

export default PersonalIntelSection;
