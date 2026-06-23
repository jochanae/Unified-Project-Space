import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';
import type { Connection } from '@/hooks/useProfile';
import { avatarImages } from '@/lib/avatarImages';
import { logger } from '@/utils/logger';

/**
 * Try to recover a persistent avatar URL from storage.
 * First checks if the file already exists in the companion-avatars bucket
 * (e.g. uploaded by a previous session or another user connecting the same Browse companion).
 * Falls back to attempting a fetch+upload of the local URL (works in dev, not prod).
 */
async function recoverAvatarFromStorage(memberId: string, localUrl: string): Promise<string | null> {
  try {
    // Extract the base companion ID (strip "created-" prefix and timestamp suffix)
    const baseId = memberId.replace(/^created-/, '').replace(/-\d+$/, '');

    // Check common storage paths for this companion
    for (const candidate of [`browse/${memberId}.jpg`, `browse/${memberId}.png`, `browse/${baseId}.jpg`, `browse/${baseId}.png`]) {
      const { data } = await supabase.storage.from('companion-avatars').list('browse', {
        search: candidate.replace('browse/', ''),
      });
      if (data && data.length > 0) {
        const match = data.find(f => candidate.endsWith(f.name));
        if (match) {
          const { data: urlData } = supabase.storage.from('companion-avatars').getPublicUrl(`browse/${match.name}`);
          return urlData.publicUrl;
        }
      }
    }

    // Fallback: try to fetch the local URL (works in dev only)
    const response = await fetch(localUrl);
    if (!response.ok) return null;
    const blob = await response.blob();
    const ext = blob.type === 'image/png' ? 'png' : 'jpg';
    const path = `browse/${memberId}.${ext}`;
    const { error } = await supabase.storage.from('companion-avatars').upload(path, blob, { upsert: true, contentType: blob.type });
    if (error) return null;
    const { data: pubUrl } = supabase.storage.from('companion-avatars').getPublicUrl(path);
    return pubUrl.publicUrl;
  } catch {
    return null;
  }
}

/**
 * On every login, reconcile orphaned companion data and patch missing avatars.
 * This prevents the "Marcus vanishes" bug when switching auth providers.
 */
export function useLoginReconciliation(
  user: User | null,
  connections: Connection[],
  addConnection: (conn: any) => Promise<void>,
  updateConnection: (memberId: string, patch: Partial<Connection>) => Promise<void>,
) {
  const hasRun = useRef(false);

  useEffect(() => {
    if (!user?.id || connections === undefined) return;
    // Only run once per session
    if (hasRun.current) return;

    // CRITICAL: Verify the auth session actually matches the user we're reconciling for.
    // Without this, a stale closure from a previous session could reconcile the wrong user's data.
    const runSafe = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || session.user.id !== user.id) {
        console.warn('[Reconciliation] Session mismatch — skipping to prevent cross-user bleed');
        return;
      }
      hasRun.current = true;
      await reconcile();
    };

    const reconcile = async () => {
      try {
        // 1. Find all member_ids that have data but no connection record
        // IMPORTANT: Also fetch archived connections so we don't treat them as orphans
        const [{ data: chatMembers }, { data: milestoneMembers }, { data: feedMembers }, { data: mediaMembers }, { data: allDbConns }] = await Promise.all([
          supabase.from('chat_messages').select('member_id').eq('user_id', user.id),
          supabase.from('companion_milestones').select('member_id').eq('user_id', user.id),
          supabase.from('companion_feed_posts').select('member_id, member_name, member_handle, member_personality, member_bio, member_age, member_gender, member_avatar_url').eq('user_id', user.id),
          supabase.from('companion_media').select('member_id, image_url').eq('user_id', user.id).eq('media_type', 'avatar').order('created_at', { ascending: false }),
          // Fetch ALL connections (including archived) to avoid resurrecting archived companions
          supabase.from('connections').select('member_id, is_archived').eq('user_id', user.id),
        ]);

        // Include both active connections AND archived DB connections
        const knownIds = new Set(connections.map(c => c.memberId));
        for (const row of (allDbConns || [])) knownIds.add(row.member_id);
        const orphanIds = new Set<string>();

        for (const m of (chatMembers || [])) if (!knownIds.has(m.member_id)) orphanIds.add(m.member_id);
        for (const m of (milestoneMembers || [])) if (!knownIds.has(m.member_id)) orphanIds.add(m.member_id);

        // Build a lookup of best metadata per member from feed posts
        const feedLookup = new Map<string, any>();
        for (const p of (feedMembers || [])) {
          if (!feedLookup.has(p.member_id)) feedLookup.set(p.member_id, p);
        }

        // Build a lookup of latest avatar per member from companion_media
        const avatarLookup = new Map<string, string>();
        for (const m of (mediaMembers || [])) {
          if (!avatarLookup.has(m.member_id)) avatarLookup.set(m.member_id, m.image_url);
        }

        // Helper: extract a real name from a created member_id like "created-marcus-1771956719"
        const nameFromId = (id: string): string | null => {
          const match = id.match(/^created-([a-z]+)/i);
          if (match) return match[1].charAt(0).toUpperCase() + match[1].slice(1);
          return null;
        };

        // 2. Restore orphaned companions (only custom ones with "created-" prefix)
        // Browse catalog companions (kael, amara, etc.) use stable IDs and should
        // NOT be auto-restored — the user may have intentionally disconnected them.
        let restored = 0;
        for (const memberId of orphanIds) {
          if (!memberId.startsWith('created-')) continue;
          const post = feedLookup.get(memberId);
          const avatarFromMedia = avatarLookup.get(memberId);
          const avatarUrl = post?.member_avatar_url || avatarFromMedia || undefined;
          const resolvedName = post?.member_name || nameFromId(memberId) || 'Friend';

          await addConnection({
            memberId,
            name: resolvedName,
            connectedAt: new Date().toISOString(),
            lastMessage: 'Reconnected 💛',
            isCreated: true,
            handle: post?.member_handle || undefined,
            personality: post?.member_personality || undefined,
            bio: post?.member_bio || undefined,
            age: post?.member_age || undefined,
            gender: post?.member_gender || undefined,
            avatarUrl,
          });
          restored++;
        }

        if (restored > 0) {
          logger.log(`[Reconciliation] Restored ${restored} orphaned companion(s)`);
        }

        // 3. Patch existing connections that are missing their avatar, have generic names,
        //    or have broken Vite-hashed asset paths or dead Supabase storage URLs
        const isViteHashedPath = (url?: string | null) =>
          !!url && (/^\/assets\/.*-[A-Za-z0-9]{8,}\.\w+$/.test(url) || /^\/src\/assets\//.test(url));

        // Helper: check if a Supabase storage URL is actually accessible
        const isDeadStorageUrl = async (url?: string | null): Promise<boolean> => {
          if (!url || !url.includes('supabase.co/storage')) return false;
          try {
            const res = await fetch(url, { method: 'HEAD' });
            if (!res.ok) return true;
            const cl = res.headers.get('content-length');
            return cl === '0';
          } catch { return true; }
        };

        // Helper: re-upload a bundled Browse avatar to storage
        const reuploadBundledAvatar = async (memberId: string): Promise<string | null> => {
          const baseName = memberId.replace(/^created-/, '').replace(/-\d+$/, '').toLowerCase();
          const bundledSrc = avatarImages[baseName];
          if (!bundledSrc) return null;
          try {
            const resp = await fetch(bundledSrc);
            if (!resp.ok) return null;
            const blob = await resp.blob();
            const ext = blob.type === 'image/png' ? 'png' : 'jpg';
            const path = `browse/${memberId}.${ext}`;
            const { error } = await supabase.storage.from('companion-avatars').upload(path, blob, { upsert: true, contentType: blob.type });
            if (error) return null;
            const { data: urlData } = supabase.storage.from('companion-avatars').getPublicUrl(path);
            return urlData.publicUrl;
          } catch { return null; }
        };

        for (const conn of connections) {
          const patches: Partial<Connection> = {};
          const dbPatches: Record<string, unknown> = {};

          // Fix generic "Companion" name using member_id or feed data
          if (conn.name === 'Companion' || conn.name === 'Friend' || !conn.name) {
            const feedPost = feedLookup.get(conn.memberId);
            const betterName = feedPost?.member_name || nameFromId(conn.memberId);
            if (betterName && betterName !== 'Companion') {
              patches.name = betterName;
              dbPatches.name = betterName;
            }
          }

          // Restore missing avatar OR repair broken Vite-hashed paths OR dead storage URLs
          const needsAvatarRepair = !conn.avatarUrl || isViteHashedPath(conn.avatarUrl) || await isDeadStorageUrl(conn.avatarUrl);
          if (needsAvatarRepair) {
            const mediaAvatar = avatarLookup.get(conn.memberId);
            const feedPost = feedLookup.get(conn.memberId);
            const recoveredAvatar = mediaAvatar || feedPost?.member_avatar_url;

            // Check if recovered URLs are also dead
            let validRecovery: string | null = null;
            if (recoveredAvatar && !isViteHashedPath(recoveredAvatar) && !(await isDeadStorageUrl(recoveredAvatar))) {
              validRecovery = recoveredAvatar;
            }

            if (validRecovery) {
              patches.avatarUrl = validRecovery;
              dbPatches.avatar_url = validRecovery;
            } else {
              // Re-upload from bundled assets or try local recovery
              const uploaded = await reuploadBundledAvatar(conn.memberId) || 
                (conn.avatarUrl && isViteHashedPath(conn.avatarUrl) ? await recoverAvatarFromStorage(conn.memberId, conn.avatarUrl) : null);
              if (uploaded) {
                patches.avatarUrl = uploaded;
                dbPatches.avatar_url = uploaded;
                logger.log(`[Reconciliation] Re-uploaded avatar for ${conn.memberId}`);
              }
            }
          }

          // Auto-set background_url ONLY if completely missing (null/empty).
          // Do NOT overwrite existing custom backdrops — the user may have set them intentionally.
          // Dead backdrop URLs are handled by the GlobalBackdrop fallback chain instead.
          if (!conn.backgroundUrl && (patches.avatarUrl || conn.avatarUrl)) {
            const bgUrl = patches.avatarUrl || conn.avatarUrl;
            patches.backgroundUrl = bgUrl;
            dbPatches.background_url = bgUrl;
          }

          if (Object.keys(patches).length > 0) {
            await updateConnection(conn.memberId, patches);
            await supabase
              .from('connections')
              .update(dbPatches)
              .eq('user_id', user.id)
              .eq('member_id', conn.memberId);
            logger.log(`[Reconciliation] Patched ${conn.memberId}:`, Object.keys(patches));
          }
        }
      } catch (e) {
        console.error('[Reconciliation] Error:', e);
      }
    };

    runSafe();
  }, [user?.id, connections, addConnection, updateConnection]);
}
