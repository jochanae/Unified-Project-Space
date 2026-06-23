import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plane, MapPin, Clock, Sun, Moon, CloudRain, Thermometer, BookOpen, ChevronRight, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface BriefingCardProps {
  userId?: string;
  userName: string;
  companionName: string;
  onDismiss?: () => void;
}

interface TravelEntry {
  city_name: string;
  region?: string;
  country?: string;
  airport_code?: string;
  visited_at: string;
  companion_name?: string;
}

interface KnowledgeSnippet {
  title: string;
  category: string;
  preview: string;
}

export default function BriefingCard({ userId, userName, companionName, onDismiss }: BriefingCardProps) {
  const [latestCity, setLatestCity] = useState<TravelEntry | null>(null);
  const [knowledgeSnippets, setKnowledgeSnippets] = useState<KnowledgeSnippet[]>([]);
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }

    const fetchBriefing = async () => {
      // Get the latest travel entry from the last 48 hours
      const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
      const { data: travelData } = await supabase
        .from('travel_log')
        .select('city_name, region, country, airport_code, visited_at, companion_name')
        .eq('user_id', userId)
        .gte('visited_at', cutoff)
        .order('visited_at', { ascending: false })
        .limit(1);

      if (travelData && travelData.length > 0) {
        setLatestCity(travelData[0]);
      }

      // Get vault snippets relevant to travel/work
      const { data: knowledgeDocs } = await supabase
        .from('knowledge_documents' as any)
        .select('title, category, content_text')
        .eq('user_id', userId)
        .in('category', ['work-rules', 'travel', 'safety'])
        .order('updated_at', { ascending: false })
        .limit(3);

      if (knowledgeDocs && knowledgeDocs.length > 0) {
        setKnowledgeSnippets(
          (knowledgeDocs as any[]).map(d => ({
            title: d.title,
            category: d.category,
            preview: d.content_text?.substring(0, 120) + '...',
          }))
        );
      }

      setLoading(false);
    };

    // Check if already dismissed today
    const dismissKey = `briefing-dismissed-${new Date().toISOString().slice(0, 10)}`;
    if (localStorage.getItem(dismissKey)) {
      setDismissed(true);
      setLoading(false);
      return;
    }

    fetchBriefing();
  }, [userId]);

  const handleDismiss = () => {
    const dismissKey = `briefing-dismissed-${new Date().toISOString().slice(0, 10)}`;
    localStorage.setItem(dismissKey, 'true');
    setDismissed(true);
    onDismiss?.();
  };

  if (loading || dismissed || (!latestCity && knowledgeSnippets.length === 0)) return null;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const TimeIcon = hour < 6 || hour >= 19 ? Moon : Sun;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="relative rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-card/60 to-primary/10 backdrop-blur-xl overflow-hidden"
      >
        {/* Gold accent line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary/60 to-transparent" />

        {/* Dismiss */}
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 p-1 rounded-full bg-secondary/60 text-muted-foreground hover:text-foreground transition-colors z-10"
        >
          <X className="h-3.5 w-3.5" />
        </button>

        <div className="p-4 space-y-3">
          {/* Header */}
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/15">
              <Plane className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <TimeIcon className="h-3 w-3 text-primary/70" />
                {greeting}, {userName}
              </p>
              <p className="text-[10px] text-muted-foreground/70">
                Your daily briefing from {companionName}
              </p>
            </div>
          </div>

          {/* Location */}
          {latestCity && (
            <div className="flex items-start gap-2 rounded-xl bg-secondary/30 border border-border/20 p-3">
              <MapPin className="h-4 w-4 text-primary/70 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground">
                  {latestCity.city_name}{latestCity.airport_code ? ` (${latestCity.airport_code})` : ''}
                </p>
                <p className="text-[10px] text-muted-foreground/60">
                  {latestCity.region && `${latestCity.region}, `}{latestCity.country || 'US'}
                  {' • '}Arrived {new Date(latestCity.visited_at).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                </p>
              </div>
            </div>
          )}

          {/* Knowledge Snippets */}
          {knowledgeSnippets.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] uppercase tracking-wider text-primary/50 font-semibold flex items-center gap-1">
                <BookOpen className="h-3 w-3" /> Your Vault
              </p>
              {knowledgeSnippets.map((snippet, i) => (
                <div key={i} className="flex items-center gap-2 rounded-lg bg-secondary/20 px-2.5 py-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary/40 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-medium text-foreground truncate">{snippet.title}</p>
                  </div>
                  <ChevronRight className="h-3 w-3 text-muted-foreground/40 shrink-0" />
                </div>
              ))}
            </div>
          )}

          {/* Quick tip */}
          <p className="text-[10px] text-muted-foreground/50 italic text-center pt-1">
            Ask {companionName} about your work rules or this city — they've got your vault loaded.
          </p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
