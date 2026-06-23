import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, MapPin, Calendar, Flag, ShieldOff } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { postImages } from '@/lib/postImages';

interface PublicProfile {
  userName: string;
  username: string | null;
  bio: string | null;
  vibe: string | null;
  avatarUrl: string | null;
  createdAt: string;
}

interface UserPost {
  id: string;
  content: string;
  imageUrl: string | null;
  createdAt: string;
  circle: string | null;
}

export default function PublicProfilePage() {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [posts, setPosts] = useState<UserPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!username) return;
    (async () => {
      // Fetch profile by username
      const { data: profileData } = await supabase
        .from('profiles')
        .select('user_name, username, bio, vibe, created_at, user_reference_image_url')
        .eq('username', username)
        .maybeSingle();

      if (profileData) {
        // Try to get avatar from profile or user_posts
        let avatarUrl: string | null = (profileData as any).user_reference_image_url || null;
        if (!avatarUrl) {
          // Fallback: check user_posts for avatar_url
          const { data: postWithAvatar } = await supabase
            .from('user_posts')
            .select('avatar_url')
            .eq('username', username)
            .not('avatar_url', 'is', null)
            .limit(1)
            .maybeSingle();
          avatarUrl = postWithAvatar?.avatar_url || null;
        }
        setProfile({
          userName: profileData.user_name,
          username: profileData.username,
          bio: profileData.bio,
          vibe: profileData.vibe,
          avatarUrl,
          createdAt: profileData.created_at,
        });

        // Fetch their posts
        const { data: postData } = await supabase
          .from('user_posts')
          .select('id, content, image_url, created_at, circle')
          .eq('username', username)
          .order('created_at', { ascending: false })
          .limit(20);

        if (postData) {
          setPosts(postData.map((p) => ({
            id: p.id,
            content: p.content,
            imageUrl: p.image_url,
            createdAt: p.created_at,
            circle: p.circle,
          })));
        }
      }
      setLoading(false);
    })();
  }, [username]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 px-4">
        <p className="text-lg font-display font-bold text-foreground">User not found</p>
        <p className="text-sm text-muted-foreground">@{username} doesn't exist or hasn't set up their profile.</p>
        <button onClick={() => window.history.length > 1 ? navigate(-1) : navigate('/')} className="rounded-xl bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground">
          Go Back
        </button>
      </div>
    );
  }

  const joinDate = new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border/40 bg-card/80 px-4 py-3 backdrop-blur-md">
        <button onClick={() => window.history.length > 1 ? navigate(-1) : navigate('/')} className="rounded-full p-1.5 hover:bg-secondary transition-colors">
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <div>
          <h1 className="font-display text-base font-bold text-foreground">{profile.userName}</h1>
          {profile.username && <p className="text-xs text-muted-foreground">@{profile.username}</p>}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-lg">
          {/* Profile info */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="px-5 pt-6 pb-4 space-y-4"
          >
            <div className="flex items-center gap-4">
              {profile.avatarUrl ? (
                <img src={profile.avatarUrl} alt={profile.userName} className="h-16 w-16 rounded-full object-cover ring-2 ring-primary/20" />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary font-display text-2xl font-bold">
                  {profile.userName.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex-1">
                <h2 className="font-display text-xl font-bold text-foreground">{profile.userName}</h2>
                {profile.username && <p className="text-sm text-muted-foreground">@{profile.username}</p>}
              </div>
            </div>

            {profile.bio && (
              <p className="text-sm leading-relaxed text-foreground/80">{profile.bio}</p>
            )}

            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              {profile.vibe && (
                <span className="rounded-full bg-primary/10 px-3 py-1 text-primary font-medium">
                  {profile.vibe}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Joined {joinDate}
              </span>
            </div>
          </motion.div>

          {/* Posts */}
          <div className="border-t border-border/40 px-5 py-4">
            <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Posts ({posts.length})
            </p>
            {posts.length === 0 ? (
              <p className="text-sm text-muted-foreground italic py-8 text-center">No posts yet</p>
            ) : (
              <div className="space-y-3">
                {posts.map((post) => (
                  <motion.div
                    key={post.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl border border-border/30 bg-card p-4"
                  >
                    <p className="text-sm leading-relaxed text-foreground/85">{post.content}</p>
                    {post.imageUrl && (
                      <img src={post.imageUrl} alt="" className="mt-2 w-full rounded-lg object-cover max-h-48" loading="lazy" />
                    )}
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      {new Date(post.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                    </p>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
