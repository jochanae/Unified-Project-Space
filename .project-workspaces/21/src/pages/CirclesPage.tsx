import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, LogIn, Copy, Trash2, ChevronRight, Users, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '@/contexts/AppContext';
import { useCircles } from '@/hooks/useCircles';
import { useCircleUnread } from '@/hooks/useCircleUnread';
import { toast } from 'sonner';
import CircleCompanionChooser from '@/components/CircleCompanionChooser';
import CircleArchitectWizard from '@/components/circle/CircleArchitectWizard';
import type { Connection } from '@/hooks/useProfile';
import { getAmbientStyles } from '@/lib/ambientBackgrounds';
import { treatAsMinor } from '@/lib/ageUtils';
import { useAdminSetting } from '@/hooks/useAdminSettings';
import { supabase } from '@/integrations/supabase/client';

export default function CirclesPage() {
  const { user, profile, connections } = useAppContext();
  const { circles, loading, createCircle, joinByCode, deleteCircle } = useCircles(user?.id);
  const navigate = useNavigate();
  const circleIds = useMemo(() => circles.map(c => c.id), [circles]);
  const { unreadMap, previewMap } = useCircleUnread(circleIds);
  const circlesDisabled = useAdminSetting('circles_disabled');

  // Check admin status for bypass
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    if (!user?.id) return;
    supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' }).then(({ data }) => setIsAdmin(!!data));
  }, [user?.id]);

  const isKid = treatAsMinor(profile?.dateOfBirth);

  // Gate: redirect if circles are disabled (kids and admins can always access)
  useEffect(() => {
    if (!circlesDisabled.loading && circlesDisabled.value && !isAdmin && !isKid) {
      toast.info('🚧 Circles is under construction', { description: 'This feature is coming soon!' });
      navigate('/', { replace: true });
    }
  }, [circlesDisabled.value, circlesDisabled.loading, isAdmin, isKid]);

  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [pendingCircleId, setPendingCircleId] = useState<string | null>(null);
  const [wizardCreatedId, setWizardCreatedId] = useState<string | null>(null);

  const handleWizardSubmit = async (data: { name: string; emoji: string; description: string; circleType: string; defaultLayout?: string; roomType?: string }) => {
    const circle = await createCircle(data.name, data.emoji, data.description, data.circleType, data.defaultLayout || 'grid', data.roomType || 'spatial');
    toast.success(`${data.emoji} ${data.name} created!`);
    setWizardCreatedId(circle.id);
    return circle;
  };

  const handleJoin = async () => {
    if (!joinCode.trim()) return;
    setSubmitting(true);
    try {
      const circle = await joinByCode(joinCode.trim());
      setJoinCode('');
      setShowJoin(false);
      toast.success(`Joined ${circle.emoji} ${circle.name}!`);
      navigate(`/circles/${circle.id}`);
    } catch (e: any) {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Invite code copied!');
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this Circle? All messages will be lost.')) return;
    try {
      await deleteCircle(id);
      toast.success('Circle deleted');
    } catch {
      toast.error('Failed to delete');
    }
  };

  if (!user || !profile) return null;

  const ambient = getAmbientStyles(treatAsMinor(profile?.dateOfBirth));

  return (
    <div className="relative flex flex-col h-full min-h-[100dvh]" style={{ background: '#0f1221' }}>
      {/* Deep theatre background with subtle purple leak */}
      <div
        className="fixed inset-0 z-0 opacity-30"
        style={{ backgroundImage: 'radial-gradient(ellipse at 30% 20%, hsl(260 40% 15% / 0.6) 0%, transparent 60%), radial-gradient(ellipse at 70% 80%, hsl(240 30% 12% / 0.4) 0%, transparent 60%)' }}
      />

      {/* Header */}
      <div className="relative z-10 flex items-center gap-3 px-4 py-3"
        style={{ borderBottom: '1px solid hsl(250 15% 18% / 0.5)', background: 'hsl(245 25% 10% / 0.8)', backdropFilter: 'blur(12px)' }}
      >
        <button onClick={() => navigate('/messages')} className="rounded-full p-1.5 hover:bg-white/5 transition-colors">
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <div>
          <h1 className="font-display text-lg font-bold text-foreground">Circles</h1>
          <p className="text-[11px] text-muted-foreground">Private spaces for you & friends</p>
        </div>
      </div>

      <div className="relative z-10 flex flex-col flex-1 px-4 py-5 pb-24">
        <div className="mx-auto w-full max-w-lg">

          {/* Action buttons */}
          <div className="flex gap-2 mb-5">
            <button
              onClick={() => setShowCreate(true)}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl gradient-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:scale-[1.02] active:scale-95"
            >
              <Plus className="h-4 w-4" /> Create Circle
            </button>
            <button
              onClick={() => setShowJoin(true)}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-foreground transition-all hover:scale-[1.02] active:scale-95 border"
              style={{ background: 'hsl(245 25% 10%)', borderColor: 'hsl(250 15% 18%)' }}
            >
              <LogIn className="h-4 w-4" /> Join with Code
            </button>
          </div>

          {/* Circle list — horizontal glass cards */}
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : circles.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl p-8 text-center border border-dashed" style={{ background: 'hsl(245 25% 10% / 0.5)', borderColor: 'hsl(250 15% 18%)' }}>
              <span className="text-3xl">🫧</span>
              <p className="text-sm font-semibold text-foreground">No Circles yet</p>
              <p className="text-xs text-muted-foreground">Create one to chat with your companion and invite friends.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {circles.map((circle) => {
                const isOwner = circle.creator_id === user.id;
                const hasUnread = unreadMap[circle.id];
                const preview = previewMap[circle.id];
                return (
                  <motion.div
                    key={circle.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={() => {
                      if (connections.length > 1) {
                        setPendingCircleId(circle.id);
                      } else {
                        navigate(`/circles/${circle.id}/lobby`);
                      }
                    }}
                    className={`group flex items-center gap-4 w-full rounded-2xl p-4 text-left transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer border ${
                      hasUnread ? 'shadow-[0_0_16px_2px_hsl(var(--primary)/0.1)]' : ''
                    }`}
                    style={{
                      background: 'hsl(245 25% 10% / 0.6)',
                      borderColor: hasUnread ? 'hsl(var(--primary) / 0.4)' : 'hsl(250 15% 18% / 0.5)',
                      backdropFilter: 'blur(8px)',
                    }}
                  >
                    {/* Emoji + unread dot */}
                    <div className="relative flex h-12 w-12 items-center justify-center rounded-xl shrink-0" style={{ background: 'hsl(250 20% 14%)' }}>
                      <span className="text-2xl">{circle.emoji}</span>
                      {hasUnread && (
                        <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-primary ring-2 ring-background" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-foreground">{circle.name}</p>
                        {isOwner && (
                          <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">Owner</span>
                        )}
                        {(circle as any).circle_type === 'fireside' || (circle as any).circle_type === 'service' || (circle as any).circle_type === 'circle' ? (
                          <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-400">🔥 Fireside</span>
                        ) : (
                          <span className="rounded-full bg-violet-500/15 px-2 py-0.5 text-[10px] font-semibold text-violet-400">🌌 Hangout</span>
                        )}
                        {(circle as any).circle_type === 'kids' && (
                          <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-500">🏁 Kids</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{circle.description}</p>
                      {preview && (
                        <p className={`mt-1 text-[11px] truncate ${hasUnread ? 'font-semibold text-secondary-foreground' : 'text-muted-foreground'}`}>
                          <span className="font-medium">{preview.senderName}:</span>{' '}
                          {preview.content.length > 50 ? preview.content.slice(0, 50) + '…' : preview.content}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      {isOwner && (
                        <>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleCopyCode(circle.invite_code); }}
                            className="rounded-full p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                            title="Copy invite code"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={(e) => handleDelete(circle.id, e)}
                            className="rounded-full p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                            title="Delete circle"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </>
                      )}
                      <ChevronRight className="h-4 w-4 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Circle Architect Wizard */}
      <CircleArchitectWizard
        open={showCreate}
        onClose={() => {
          setShowCreate(false);
          if (wizardCreatedId) {
            navigate(`/circles/${wizardCreatedId}/lobby`);
            setWizardCreatedId(null);
          }
        }}
        onSubmit={handleWizardSubmit}
      />

      {/* Join Circle Modal */}
      <AnimatePresence>
        {showJoin && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setShowJoin(false)}
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-2xl p-5 shadow-xl border" style={{ background: 'hsl(245 25% 10%)', borderColor: 'hsl(250 15% 18%)' }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-lg font-bold text-foreground">Join a Circle</h3>
                <button onClick={() => setShowJoin(false)} className="rounded-full p-1.5 hover:bg-secondary transition-colors">
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>

              <p className="text-xs text-muted-foreground mb-4">
                Enter the invite code shared by a friend to join their Circle.
              </p>

              <input
                type="text" value={joinCode} onChange={(e) => setJoinCode(e.target.value)}
                placeholder="Paste invite code" maxLength={20}
                className="w-full rounded-xl px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 mb-4 font-mono tracking-wider text-center border" style={{ background: 'hsl(250 20% 14%)', borderColor: 'hsl(250 15% 18%)' }}
              />

              <button
                onClick={handleJoin}
                disabled={!joinCode.trim() || submitting}
                className="w-full flex items-center justify-center gap-2 rounded-xl gradient-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
              >
                {submitting ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                ) : 'Join Circle'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Companion Chooser for Circles */}
      <CircleCompanionChooser
        open={!!pendingCircleId}
        connections={connections}
        onSelect={(result) => {
          // Store the chosen companion(s), vibe, and atmosphere for this circle session
          if (pendingCircleId) {
            localStorage.setItem(`circle-companion-${pendingCircleId}`, result.companions.length > 0 ? result.companions.map(c => c.memberId).join(',') : 'none');
            localStorage.setItem(`circle-vibe-${pendingCircleId}`, result.vibe);
            localStorage.setItem(`circle-atmosphere-${pendingCircleId}`, result.atmosphere);
            navigate(`/circles/${pendingCircleId}/lobby`);
          }
          setPendingCircleId(null);
        }}
        onClose={() => setPendingCircleId(null)}
      />
    </div>
  );
}
