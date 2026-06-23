import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { ArrowLeft, Loader2, Mail, Upload, UserCircle } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { LoadingAppShell } from "@/components/layout/LoadingAppShell";
import { SanctuaryGate } from "@/components/auth/SanctuaryGate";
import { AccountSkeleton } from "@/components/ui/page-skeletons";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/settings/profile")({
  head: () => ({
    meta: [
      { title: "Profile — Settings — SanctumIQ" },
      { name: "description", content: "Edit your SanctumIQ display name, bio, photo, and email." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SettingsProfilePage,
});

function SettingsProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [newEmail, setNewEmail] = useState("");
  const [emailSubmitting, setEmailSubmitting] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    let active = true;
    setLoadingProfile(true);
    supabase
      .from("profiles")
      .select("display_name, avatar_url, bio")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!active) return;
        setDisplayName(
          data?.display_name ??
            (user.user_metadata?.display_name as string | undefined) ??
            (user.user_metadata?.full_name as string | undefined) ??
            user.email?.split("@")[0] ??
            "",
        );
        setBio(data?.bio ?? "");
        setAvatarUrl(
          data?.avatar_url ?? (user.user_metadata?.avatar_url as string | undefined) ?? null,
        );
        setLoadingProfile(false);
      });
    return () => {
      active = false;
    };
  }, [user?.id, user?.email, user?.user_metadata]);

  if (authLoading || (user && loadingProfile)) {
    return (
      <LoadingAppShell pageTitle="Profile">
        <AccountSkeleton text="Opening profile…" />
      </LoadingAppShell>
    );
  }

  if (!user) {
    return (
      <SanctuaryGate
        eyebrow="Profile"
        title="Sign in to edit your profile"
        description="Profile settings are only available to signed-in stewards."
        redirectTo="/settings/profile"
      />
    );
  }

  const initials =
    displayName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || "S";

  const handleAvatarUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      const nextUrl = urlData.publicUrl;
      const { error: profErr } = await supabase
        .from("profiles")
        .upsert({ id: user.id, avatar_url: nextUrl, display_name: displayName, bio });
      if (profErr) throw profErr;
      setAvatarUrl(nextUrl);
      toast.success("Photo updated.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not upload photo.");
    } finally {
      setUploading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = displayName.trim();
    if (!trimmedName) {
      toast.error("Display name cannot be empty.");
      return;
    }
    if (bio.length > 280) {
      toast.error("Bio must be 280 characters or fewer.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      display_name: trimmedName,
      bio: bio.trim() || null,
      avatar_url: avatarUrl,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message || "Could not save profile.");
      return;
    }
    toast.success("Profile saved.");
  };

  const handleChangeEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = newEmail.trim().toLowerCase();
    if (!target || !target.includes("@")) {
      toast.error("Enter a valid email address.");
      return;
    }
    if (target === user.email?.toLowerCase()) {
      toast.error("That's already your email.");
      return;
    }
    setEmailSubmitting(true);
    const { error } = await supabase.auth.updateUser({ email: target });
    setEmailSubmitting(false);
    if (error) {
      toast.error(error.message || "Could not start email change.");
      return;
    }
    setNewEmail("");
    toast.success("Confirmation sent. Check both inboxes to finish the change.");
  };

  return (
    <AppShell pageTitle="Profile">
      <div className="mx-auto max-w-2xl px-6 py-12 space-y-8">
        <Link
          to="/settings"
          className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-muted-foreground hover:text-gold-soft transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Settings
        </Link>

        <div>
          <p className="text-[11px] uppercase tracking-[0.3em] text-gold mb-2">Profile</p>
          <h1 className="font-display text-3xl text-foreground">Your profile</h1>
          <p className="text-sm text-muted-foreground/80 mt-1">How you appear inside SanctumIQ.</p>
        </div>

        <section className="hairline rounded-xl bg-obsidian-elevated/30 p-6 space-y-6">
          <div className="flex items-center gap-2 mb-1">
            <UserCircle className="h-4 w-4 text-gold/80" />
            <h2 className="font-display text-lg text-foreground">Identity</h2>
          </div>

          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarUpload}
          />

          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 border-2 border-gold/25">
              <AvatarImage src={avatarUrl ?? undefined} alt={displayName} />
              <AvatarFallback className="bg-gold/10 font-display text-lg tracking-[0.2em] text-gold-soft">
                {initials}
              </AvatarFallback>
            </Avatar>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-2 rounded-md hairline bg-obsidian/40 px-4 py-2 text-sm text-foreground hover:bg-gold/5 transition-colors disabled:opacity-50"
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              {uploading ? "Uploading…" : "Change photo"}
            </button>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div>
              <label
                htmlFor="display-name"
                className="block text-[11px] uppercase tracking-[0.2em] text-muted-foreground mb-2"
              >
                Display name
              </label>
              <input
                id="display-name"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={80}
                className="w-full rounded-md hairline bg-obsidian/40 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-gold/40"
                placeholder="How others see you"
              />
            </div>

            <div>
              <label
                htmlFor="bio"
                className="block text-[11px] uppercase tracking-[0.2em] text-muted-foreground mb-2"
              >
                Bio
                <span className="ml-2 normal-case tracking-normal text-muted-foreground/60">
                  {bio.length}/280
                </span>
              </label>
              <textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={280}
                rows={4}
                className="w-full rounded-md hairline bg-obsidian/40 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-gold/40 resize-none"
                placeholder="A short note about your sanctuary."
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center rounded-md bg-gold px-6 py-2.5 text-sm font-medium text-obsidian hover:bg-gold-soft transition-colors disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save profile"}
            </button>
          </form>
        </section>

        <section className="hairline rounded-xl bg-obsidian-elevated/30 p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-gold/80" />
            <h2 className="font-display text-lg text-foreground">Email address</h2>
          </div>

          <div className="text-sm text-muted-foreground">
            Current: <span className="text-foreground">{user.email}</span>
          </div>

          <form onSubmit={handleChangeEmail} className="space-y-4">
            <div>
              <label
                htmlFor="new-email"
                className="block text-[11px] uppercase tracking-[0.2em] text-muted-foreground mb-2"
              >
                New email
              </label>
              <input
                id="new-email"
                type="email"
                autoComplete="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="w-full rounded-md hairline bg-obsidian/40 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-gold/40"
                placeholder="you@example.com"
              />
            </div>

            <button
              type="submit"
              disabled={emailSubmitting}
              className="inline-flex items-center justify-center rounded-md hairline bg-obsidian/40 px-6 py-2.5 text-sm text-foreground hover:bg-gold/5 transition-colors disabled:opacity-50"
            >
              {emailSubmitting ? "Sending…" : "Send confirmation"}
            </button>

            <p className="text-[11px] text-muted-foreground/60">
              We'll email both addresses to confirm the change. Sign-in keeps working until you
              confirm.
            </p>
          </form>
        </section>
      </div>
    </AppShell>
  );
}
