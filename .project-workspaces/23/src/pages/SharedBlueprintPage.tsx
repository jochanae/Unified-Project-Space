import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Sparkles, Palette, Megaphone, Users, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface BlueprintData {
  outputs: { oneLiner: string; elevatorPitch: string; socialBio: string };
  style?: { palette?: string[]; fonts?: { heading?: string; body?: string }; mood?: string; direction?: string };
  hooks?: { instagram?: string[]; linkedin?: string[]; emailSubjects?: string[]; adHeadlines?: string[] };
  persona?: { name?: string; role?: string; frustrations?: string[]; desires?: string[]; language?: string[]; objections?: string[] };
}

export default function SharedBlueprintPage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<{ project_name: string | null; blueprint_data: BlueprintData } | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!token) return;
    supabase
      .rpc('get_shared_blueprint', { _token: token })
      .single()
      .then(({ data: row, error }) => {
        if (error || !row) {
          setNotFound(true);
        } else {
          setData(row as any);
        }
        setLoading(false);
      });
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground text-sm">Loading blueprint…</div>
      </div>
    );
  }

  if (notFound || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-3">
        <FileText className="h-10 w-10 text-muted-foreground/40" />
        <p className="text-muted-foreground text-sm">Blueprint not found or link has expired.</p>
      </div>
    );
  }

  const bp = data.blueprint_data;
  const { outputs, style, hooks, persona } = bp;

  return (
    <div className="min-h-screen bg-background">
      <div
        className="max-w-2xl mx-auto px-6 py-12 space-y-8"
        style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 3rem)' }}
      >
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-medium text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            Signal Blueprint
          </div>
          {data.project_name && (
            <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>
              {data.project_name}
            </h1>
          )}
        </div>

        {/* Core Message */}
        <Section icon={<Sparkles className="h-4 w-4" />} title="Core Message">
          <Field label="One-Liner" value={outputs.oneLiner} />
          <Field label="Elevator Pitch" value={outputs.elevatorPitch} />
          <Field label="Social Bio" value={outputs.socialBio} />
        </Section>

        {/* Style */}
        {style && (
          <Section icon={<Palette className="h-4 w-4" />} title="Style Signal">
            {style.palette && (
              <div className="flex gap-2 mb-3">
                {style.palette.map((c, i) => (
                  <div key={i} className="h-8 w-8 rounded-lg border border-border/20" style={{ backgroundColor: c }} title={c} />
                ))}
              </div>
            )}
            {style.fonts && <p className="text-sm text-muted-foreground">Typography: {style.fonts.heading} / {style.fonts.body}</p>}
            {style.mood && <p className="text-sm text-muted-foreground">Mood: {style.mood}</p>}
            {style.direction && <p className="text-sm text-foreground mt-1">{style.direction}</p>}
          </Section>
        )}

        {/* Hooks */}
        {hooks && (
          <Section icon={<Megaphone className="h-4 w-4" />} title="Signal Hooks">
            {hooks.instagram?.length ? <ListBlock label="Instagram/X" items={hooks.instagram} /> : null}
            {hooks.linkedin?.length ? <ListBlock label="LinkedIn" items={hooks.linkedin} /> : null}
            {hooks.emailSubjects?.length ? <ListBlock label="Email Subjects" items={hooks.emailSubjects} /> : null}
            {hooks.adHeadlines?.length ? <ListBlock label="Ad Headlines" items={hooks.adHeadlines} /> : null}
          </Section>
        )}

        {/* Persona */}
        {persona && (
          <Section icon={<Users className="h-4 w-4" />} title="Signal Persona">
            {persona.name && <p className="text-sm text-foreground font-medium">{persona.name} — {persona.role}</p>}
            {persona.frustrations?.length ? <ListBlock label="Frustrations" items={persona.frustrations} /> : null}
            {persona.desires?.length ? <ListBlock label="Desires" items={persona.desires} /> : null}
            {persona.language?.length ? <ListBlock label="Language They Use" items={persona.language.map(l => `"${l}"`)} /> : null}
            {persona.objections?.length ? <ListBlock label="Objections" items={persona.objections} /> : null}
          </Section>
        )}

        {/* Footer */}
        <div className="border-t border-border/20 pt-8 flex flex-col items-center gap-4 text-center">
          <div className="flex items-center gap-2 text-xs text-muted-foreground/50">
            <Sparkles className="h-3 w-3" />
            <span>Built with Signal Lab — by Into Innovations</span>
          </div>
          <div className="glass rounded-2xl border border-primary/20 p-5 max-w-sm w-full">
            <p className="text-sm font-medium text-foreground">Want a blueprint like this?</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Build your brand signal, funnel strategy, and landing pages — free to start.
            </p>
            <a
              href="/login"
              className="mt-3 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Start building free
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border/20 bg-card/30 p-5 backdrop-blur-sm space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">{icon}</div>
        <h2 className="text-sm font-semibold text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>{title}</h2>
      </div>
      {children}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-t border-border/10 pt-3 first:border-0 first:pt-0">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-primary/70">{label}</span>
      <p className="text-sm text-foreground mt-0.5">{value}</p>
    </div>
  );
}

function ListBlock({ label, items }: { label: string; items: string[] }) {
  return (
    <div className="mt-2">
      <span className="text-xs font-medium text-muted-foreground">{label}:</span>
      <ul className="mt-1 space-y-0.5">
        {items.map((item, i) => (
          <li key={i} className="text-sm text-foreground">• {item}</li>
        ))}
      </ul>
    </div>
  );
}
