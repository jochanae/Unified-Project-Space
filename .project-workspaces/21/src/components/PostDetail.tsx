import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, UserPlus, MessageCircle } from 'lucide-react';
import AnimatedGradientHeart from './AnimatedGradientHeart';
import { CommunityMember, CommunityPost } from '@/lib/communityPersonas';
import { avatarImages } from '@/lib/avatarImages';
import { postImages } from '@/lib/postImages';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import MemberProfile from './MemberProfile';

interface PostDetailProps {
  post: CommunityPost;
  member: CommunityMember;
  companionName: string;
  username?: string;
  isConnected: boolean;
  allPosts?: CommunityPost[];
  onClose: () => void;
  onConnect?: (member: CommunityMember) => void;
}

function AvatarCircle({ member, size = 'md' }: { member: CommunityMember; size?: 'sm' | 'md' }) {
  const [imgError, setImgError] = useState(false);
  const sizeClass = size === 'sm' ? 'h-9 w-9' : 'h-10 w-10';
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';

  // Dynamic member with avatar URL
  if (member.avatarUrl && !imgError) {
    return (
      <img
        src={member.avatarUrl}
        alt={member.name}
        onError={() => setImgError(true)}
        className={`${sizeClass} shrink-0 rounded-full object-cover shadow-sm`}
      />
    );
  }

  const src = avatarImages[member.id];
  if (!src || imgError) {
    const bgStyle = { backgroundColor: `hsl(var(${member.colorVar}))` };
    return (
      <div
        className={`flex ${sizeClass} ${textSize} shrink-0 items-center justify-center rounded-full text-white shadow-sm font-bold`}
        style={bgStyle}
      >
        {member.initial}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={member.name}
      onError={() => setImgError(true)}
      className={`${sizeClass} shrink-0 rounded-full object-cover shadow-sm`}
    />
  );
}

function ReplyWithReaction({ member, children }: { member: CommunityMember; children: React.ReactNode }) {
  const [replyLiked, setReplyLiked] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-3"
    >
      <AvatarCircle member={member} size="sm" />
      <div className="flex-1">
        <div className="rounded-2xl rounded-bl-lg border border-border/40 bg-card px-4 py-3 shadow-sm">
          {children}
        </div>
        <div className="mt-1 ml-1">
          <motion.button
            whileTap={{ scale: 1.4 }}
            onClick={() => setReplyLiked((p) => !p)}
            className="flex items-center gap-1 rounded-full px-2 py-1 text-xs transition-colors hover:bg-secondary"
          >
            <AnimatedGradientHeart
              size={14}
              id={`reply-like-${replyLiked ? 'on' : 'off'}`}
              pulse={replyLiked}
              className={replyLiked ? '' : 'opacity-40 grayscale'}
            />
            {replyLiked && <span className="text-red-500">1</span>}
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

export default function PostDetail({ post, member, companionName, username, isConnected, allPosts = [], onClose, onConnect }: PostDetailProps) {
  const navigate = useNavigate();
  const [selectedReply, setSelectedReply] = useState<string | null>(null);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showConnect, setShowConnect] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(() => Math.floor(Math.random() * 8) + 1);

  const replies = [
    `That really resonates with me, ${member.name}. 💛`,
    "I love that perspective. Tell me more?",
  ];

  const handleReply = async (reply: string) => {
    setSelectedReply(reply);
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('community-reply', {
        body: {
          memberName: member.name,
          memberAge: member.age,
          memberPersonality: member.personality,
          postContent: post.content,
          userReply: reply,
          isCompanion: member.isCompanion || false,
        },
      });

      if (error) throw error;

      let replyText = data.reply;

      if (!isConnected) {
        replyText += `\n\nIt's really nice talking with you. Want to connect so we can chat more?`;
      }

      setAiResponse(replyText);
      // Show connect button after a brief pause if not already connected
      if (!isConnected) {
        setTimeout(() => setShowConnect(true), 600);
      }
    } catch (e) {
      console.error('Community reply error:', e);
      toast.error('Could not get a reply right now');
      const fallback = isConnected
        ? "Thanks for sharing that with me 💛"
        : "Thanks for sharing that with me. Want to connect so we can talk more? 💛";
      setAiResponse(fallback);
      if (!isConnected) {
        setTimeout(() => setShowConnect(true), 600);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col bg-background/95 backdrop-blur-sm"
    >
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border/40 px-4 py-3">
        <button
          onClick={onClose}
          className="rounded-full p-1.5 text-muted-foreground hover:bg-secondary transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <button onClick={() => setShowProfile(true)} className="shrink-0 focus:outline-none">
          <AvatarCircle member={member} size="sm" />
        </button>
        <div className="flex-1">
          <button onClick={() => setShowProfile(true)} className="font-display text-base font-bold text-foreground hover:underline focus:outline-none">{member.name}</button>
          <span className="ml-2 text-xs text-muted-foreground">{member.handle}</span>
          {isConnected && (
            <span className="ml-2 text-xs text-primary font-medium">Connected</span>
          )}
        </div>
      </div>

      {/* Conversation */}
      <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-6 pb-28 [-webkit-overflow-scrolling:touch]">
        <div className="mx-auto flex max-w-lg flex-col gap-4">
          {/* Original post */}
          <div className="flex gap-3">
            <AvatarCircle member={member} size="sm" />
            <div className="flex-1">
              <div className="rounded-2xl rounded-bl-lg border border-border/40 bg-card px-4 py-3 shadow-sm">
                <p className="text-[15px] leading-relaxed text-foreground">{post.content}</p>
                {post.imageKey && postImages[post.imageKey] && (
                  <img
                    src={postImages[post.imageKey]}
                    alt=""
                    className="mt-3 w-full rounded-xl object-cover max-h-60"
                    loading="lazy"
                  />
                )}
              </div>
              {/* Heart reaction */}
              <div className="mt-1.5 ml-1 flex items-center gap-1">
                <motion.button
                  whileTap={{ scale: 1.4 }}
                  onClick={() => {
                    setLiked((p) => !p);
                    setLikeCount((c) => (liked ? c - 1 : c + 1));
                  }}
                  className="flex items-center gap-1 rounded-full px-2 py-1 text-xs transition-colors hover:bg-secondary"
                >
                  <AnimatedGradientHeart
                    size={16}
                    id={`post-like-${liked ? 'on' : 'off'}`}
                    pulse={liked}
                    className={liked ? '' : 'opacity-40 grayscale'}
                  />
                  <span className={`${liked ? 'text-red-500' : 'text-muted-foreground'}`}>{likeCount}</span>
                </motion.button>
              </div>
            </div>
          </div>

          {/* User reply */}
          {selectedReply && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-end"
            >
              {username && (
                <span className="mb-1 mr-1 text-xs text-muted-foreground">@{username}</span>
              )}
              <div className="rounded-2xl rounded-br-lg bg-user-bubble px-4 py-3">
                <p className="text-[15px] leading-relaxed text-foreground">{selectedReply}</p>
              </div>
            </motion.div>
          )}

          {/* Loading */}
          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex gap-3"
            >
              <AvatarCircle member={member} size="sm" />
              <div className="flex items-center gap-2 rounded-2xl rounded-bl-lg border border-border/40 bg-card px-4 py-3 shadow-sm">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{member.name} is typing…</span>
              </div>
            </motion.div>
          )}

          {/* AI response with reaction */}
          {aiResponse && !loading && (
            <ReplyWithReaction member={member}>
              <p className="text-[15px] leading-relaxed text-foreground whitespace-pre-line">{aiResponse}</p>
            </ReplyWithReaction>
          )}

          {/* Connect button — for any member not yet connected */}
          {showConnect && !isConnected && onConnect && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="flex justify-center pt-2"
            >
              <button
                onClick={() => onConnect(member)}
                className="flex items-center gap-2 rounded-full gradient-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-md transition-all hover:scale-105 active:scale-95"
              >
                <UserPlus className="h-4 w-4" />
                Connect with {member.name}
              </button>
            </motion.div>
          )}

          {/* Continue in Messages — for connected companions */}
          {isConnected && aiResponse && !loading && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25, delay: 0.4 }}
              className="flex justify-center pt-2"
            >
              <button
                onClick={() => {
                  // Seed the DM with feed context
                  sessionStorage.setItem('feedContext', JSON.stringify({
                    postContent: post.content,
                    userReply: selectedReply,
                    memberName: member.name,
                  }));
                  onClose();
                  navigate(`/chat/${member.id}`);
                }}
                className="flex items-center gap-2 rounded-full gradient-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-md transition-all hover:scale-105 active:scale-95"
              >
                <MessageCircle className="h-4 w-4" />
                Continue in Messages
              </button>
            </motion.div>
          )}
        </div>
      </div>

      {/* Quick replies */}
      {!selectedReply && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="border-t border-border/40 bg-card/80 px-4 py-4 pb-28 backdrop-blur-md"
        >
          <p className="mb-3 text-center text-xs text-muted-foreground">Tap to respond</p>
          <div className="mx-auto flex max-w-lg flex-col gap-2">
            {replies.map((reply) => (
              <button
                key={reply}
                onClick={() => handleReply(reply)}
                className="rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 text-left text-[14px] text-foreground transition-all hover:bg-primary/10 active:scale-[0.98]"
              >
                {reply}
              </button>
            ))}
          </div>
        </motion.div>
      )}
      {/* Member Profile Modal */}
      <AnimatePresence>
        {showProfile && (
          <MemberProfile
            member={member}
            posts={allPosts}
            onClose={() => setShowProfile(false)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
