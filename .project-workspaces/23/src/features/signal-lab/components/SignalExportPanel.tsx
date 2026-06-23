import { useState, useCallback } from 'react';
import { Download, Copy, Check, FileText, Sparkles, Loader2, Share2, FileDown, Link2, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { callQuinnStream, extractJSON } from './SignalAIHelper';
import { supabase } from '@/integrations/supabase/client';
import type { SignalOutputs } from '../hooks/use-signal-lab';
import BlueprintVersionsDialog, { type BlueprintSnapshot } from './BlueprintVersionsDialog';

interface StyleData {
  palette?: string[];
  fonts?: { heading?: string; body?: string };
  mood?: string;
  direction?: string;
}

interface HooksData {
  instagram?: string[];
  linkedin?: string[];
  emailSubjects?: string[];
  adHeadlines?: string[];
}

interface PersonaData {
  name?: string;
  role?: string;
  frustrations?: string[];
  desires?: string[];
  language?: string[];
  objections?: string[];
}

interface Props {
  outputs: SignalOutputs;
  projectName?: string;
  projectId?: string;
}

export default function SignalExportPanel({ outputs, projectName, projectId }: Props) {
  const [copied, setCopied] = useState(false);
  const [styleData, setStyleData] = useState<StyleData | null>(null);
  const [hooksData, setHooksData] = useState<HooksData | null>(null);
  const [personaData, setPersonaData] = useState<PersonaData | null>(null);
  const [loading, setLoading] = useState(false);
  const [enriched, setEnriched] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const snapshotBlueprint = useCallback(async (source: string) => {
    try {
      const { data: userData } = await supabase.auth.getSession();
      if (!userData.session) return;
      const { data: user } = await supabase.from('users').select('org_id').eq('id', userData.session.user.id).single();
      if (!user) return;
      await supabase.from('blueprint_versions' as any).insert({
        org_id: user.org_id,
        project_id: projectId || null,
        project_name: projectName || null,
        blueprint_data: getBlueprintPayload(),
        source,
        created_by: userData.session.user.id,
      } as any);
    } catch {
      // Non-blocking — snapshot failures shouldn't interrupt exports
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, projectName, styleData, hooksData, personaData, outputs]);

  const restoreFromSnapshot = (snap: BlueprintSnapshot) => {
    if (snap.style) { setStyleData(snap.style); setEnriched(true); }
    if (snap.hooks) { setHooksData(snap.hooks); setEnriched(true); }
    if (snap.persona) { setPersonaData(snap.persona); setEnriched(true); }
  };
  const enrichBlueprint = useCallback(async () => {
    if (enriched || loading) return;
    setLoading(true);
    try {
      const context = `One-Liner: ${outputs.oneLiner}\nElevator Pitch: ${outputs.elevatorPitch}\nSocial Bio: ${outputs.socialBio}`;
      const prompt = `You are MarQ, a brand strategist. Given this brand signal, generate a complete blueprint with ALL sections.

## Brand Signal
${context}

Return ONLY valid JSON (no markdown, no code fences):
{
  "style": {
    "palette": ["#hex1","#hex2","#hex3","#hex4","#hex5"],
    "fonts": {"heading":"Font Name","body":"Font Name"},
    "mood": "2-3 word mood",
    "direction": "One sentence visual direction"
  },
  "hooks": {
    "instagram": ["hook1","hook2","hook3"],
    "linkedin": ["hook1","hook2"],
    "emailSubjects": ["subject1","subject2","subject3"],
    "adHeadlines": ["headline1","headline2"]
  },
  "persona": {
    "name": "Persona name",
    "role": "Their role/title",
    "frustrations": ["frustration1","frustration2","frustration3"],
    "desires": ["desire1","desire2","desire3"],
    "language": ["phrase they use 1","phrase 2"],
    "objections": ["objection1","objection2"]
  }
}`;
      const raw = await callQuinnStream(prompt, projectId || 'signal-export');
      const parsed = extractJSON<{ style: StyleData; hooks: HooksData; persona: PersonaData }>(raw);
      if (parsed) {
        setStyleData(parsed.style);
        setHooksData(parsed.hooks);
        setPersonaData(parsed.persona);
        setEnriched(true);
      }
    } catch {
      toast.error('Failed to enrich blueprint. Try again.');
    } finally {
      setLoading(false);
    }
  }, [outputs, projectId, enriched, loading]);

  const getBlueprintPayload = () => ({
    outputs: { oneLiner: outputs.oneLiner, elevatorPitch: outputs.elevatorPitch, socialBio: outputs.socialBio },
    ...(styleData && { style: styleData }),
    ...(hooksData && { hooks: hooksData }),
    ...(personaData && { persona: personaData }),
  });

  const buildBlueprint = () => {
    const lines = [
      `# Signal Blueprint${projectName ? ` — ${projectName}` : ''}`,
      `Generated ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`,
      '', '---', '',
      '## 🎯 Core Message', '',
      `**One-Liner:** ${outputs.oneLiner}`, '',
      `**Elevator Pitch:** ${outputs.elevatorPitch}`, '',
      `**Social Bio:** ${outputs.socialBio}`,
    ];
    if (styleData) {
      lines.push('', '---', '', '## 🎨 Style Signal', '');
      if (styleData.palette?.length) lines.push(`**Palette:** ${styleData.palette.join(', ')}`);
      if (styleData.fonts) lines.push(`**Typography:** ${styleData.fonts.heading} / ${styleData.fonts.body}`);
      if (styleData.mood) lines.push(`**Mood:** ${styleData.mood}`);
      if (styleData.direction) lines.push(`**Direction:** ${styleData.direction}`);
    }
    if (hooksData) {
      lines.push('', '---', '', '## 📣 Signal Hooks', '');
      if (hooksData.instagram?.length) { lines.push('**Instagram/X:**'); hooksData.instagram.forEach(h => lines.push(`- ${h}`)); }
      if (hooksData.linkedin?.length) { lines.push('', '**LinkedIn:**'); hooksData.linkedin.forEach(h => lines.push(`- ${h}`)); }
      if (hooksData.emailSubjects?.length) { lines.push('', '**Email Subjects:**'); hooksData.emailSubjects.forEach(h => lines.push(`- ${h}`)); }
      if (hooksData.adHeadlines?.length) { lines.push('', '**Ad Headlines:**'); hooksData.adHeadlines.forEach(h => lines.push(`- ${h}`)); }
    }
    if (personaData) {
      lines.push('', '---', '', '## 👤 Signal Persona', '');
      if (personaData.name) lines.push(`**Name:** ${personaData.name}`);
      if (personaData.role) lines.push(`**Role:** ${personaData.role}`);
      if (personaData.frustrations?.length) { lines.push('', '**Frustrations:**'); personaData.frustrations.forEach(f => lines.push(`- ${f}`)); }
      if (personaData.desires?.length) { lines.push('', '**Desires:**'); personaData.desires.forEach(d => lines.push(`- ${d}`)); }
      if (personaData.language?.length) { lines.push('', '**Language They Use:**'); personaData.language.forEach(l => lines.push(`- "${l}"`)); }
      if (personaData.objections?.length) { lines.push('', '**Common Objections:**'); personaData.objections.forEach(o => lines.push(`- ${o}`)); }
    }
    lines.push('', '---', '', '*Powered by Signal Lab — From Into Innovations*');
    return lines.join('\n');
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(buildBlueprint());
    setCopied(true);
    toast.success('Blueprint copied to clipboard');
    snapshotBlueprint('copy');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadMd = () => {
    const blob = new Blob([buildBlueprint()], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `signal-blueprint${projectName ? `-${projectName.toLowerCase().replace(/\s+/g, '-')}` : ''}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Blueprint downloaded');
    snapshotBlueprint('markdown');
  };

  const handleShare = async () => {
    setSharing(true);
    try {
      const { data: userData } = await supabase.auth.getSession();
      if (!userData.session) { toast.error('Please sign in to share.'); return; }

      const { data: user } = await supabase.from('users').select('org_id').eq('id', userData.session.user.id).single();
      if (!user) { toast.error('Could not find your organization.'); return; }

      const { data: row, error } = await supabase
        .from('shared_blueprints' as any)
        .insert({ org_id: user.org_id, project_name: projectName || null, blueprint_data: getBlueprintPayload() } as any)
        .select('share_token')
        .single();

      if (error || !row) { toast.error('Failed to create share link.'); return; }

      const url = `${window.location.origin}/blueprint/${(row as any).share_token}`;
      setShareUrl(url);
      await navigator.clipboard.writeText(url);
      toast.success('Share link copied to clipboard!');
      snapshotBlueprint('share');
    } catch {
      toast.error('Failed to generate share link.');
    } finally {
      setSharing(false);
    }
  };

  const handleDownloadPdf = async () => {
    setGeneratingPdf(true);
    try {
      const { default: jsPDF } = await import('jspdf');
      const doc = new jsPDF({ unit: 'mm', format: 'a4' });
      const pageW = doc.internal.pageSize.getWidth();
      const margin = 20;
      const contentW = pageW - margin * 2;
      let y = 25;

      const checkPage = (needed: number) => {
        if (y + needed > 270) { doc.addPage(); y = 25; }
      };

      // Title
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text(`Signal Blueprint`, margin, y);
      y += 8;
      if (projectName) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(120, 120, 120);
        doc.text(projectName, margin, y);
        y += 6;
      }
      doc.setFontSize(9);
      doc.setTextColor(160, 160, 160);
      doc.text(`Generated ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, margin, y);
      y += 10;
      doc.setDrawColor(220, 220, 220);
      doc.line(margin, y, pageW - margin, y);
      y += 10;

      const sectionTitle = (title: string) => {
        checkPage(20);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(40, 40, 40);
        doc.text(title, margin, y);
        y += 8;
      };

      const fieldBlock = (label: string, value: string) => {
        checkPage(16);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(100, 100, 100);
        doc.text(label.toUpperCase(), margin, y);
        y += 5;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(30, 30, 30);
        const lines = doc.splitTextToSize(value, contentW);
        checkPage(lines.length * 5);
        doc.text(lines, margin, y);
        y += lines.length * 5 + 4;
      };

      const listBlock = (label: string, items: string[]) => {
        checkPage(10 + items.length * 5);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(80, 80, 80);
        doc.text(label, margin, y);
        y += 5;
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(40, 40, 40);
        items.forEach(item => {
          checkPage(6);
          const lines = doc.splitTextToSize(`• ${item}`, contentW - 4);
          doc.text(lines, margin + 4, y);
          y += lines.length * 5;
        });
        y += 3;
      };

      // Core Message
      sectionTitle('🎯 Core Message');
      fieldBlock('One-Liner', outputs.oneLiner);
      fieldBlock('Elevator Pitch', outputs.elevatorPitch);
      fieldBlock('Social Bio', outputs.socialBio);

      // Style
      if (styleData) {
        doc.line(margin, y, pageW - margin, y); y += 10;
        sectionTitle('🎨 Style Signal');
        if (styleData.palette?.length) {
          const swatchSize = 10;
          styleData.palette.forEach((hex, i) => {
            const r = parseInt(hex.slice(1, 3), 16);
            const g = parseInt(hex.slice(3, 5), 16);
            const b = parseInt(hex.slice(5, 7), 16);
            doc.setFillColor(r, g, b);
            doc.roundedRect(margin + i * (swatchSize + 3), y, swatchSize, swatchSize, 2, 2, 'F');
          });
          y += 14;
          doc.setFontSize(7);
          doc.setTextColor(140, 140, 140);
          doc.text(styleData.palette.join('  '), margin, y);
          y += 6;
        }
        if (styleData.fonts) fieldBlock('Typography', `${styleData.fonts.heading} / ${styleData.fonts.body}`);
        if (styleData.mood) fieldBlock('Mood', styleData.mood);
        if (styleData.direction) fieldBlock('Direction', styleData.direction);
      }

      // Hooks
      if (hooksData) {
        doc.line(margin, y, pageW - margin, y); y += 10;
        sectionTitle('📣 Signal Hooks');
        if (hooksData.instagram?.length) listBlock('Instagram/X', hooksData.instagram);
        if (hooksData.linkedin?.length) listBlock('LinkedIn', hooksData.linkedin);
        if (hooksData.emailSubjects?.length) listBlock('Email Subjects', hooksData.emailSubjects);
        if (hooksData.adHeadlines?.length) listBlock('Ad Headlines', hooksData.adHeadlines);
      }

      // Persona
      if (personaData) {
        doc.line(margin, y, pageW - margin, y); y += 10;
        sectionTitle('👤 Signal Persona');
        if (personaData.name) fieldBlock('Name', `${personaData.name}${personaData.role ? ` — ${personaData.role}` : ''}`);
        if (personaData.frustrations?.length) listBlock('Frustrations', personaData.frustrations);
        if (personaData.desires?.length) listBlock('Desires', personaData.desires);
        if (personaData.language?.length) listBlock('Language They Use', personaData.language.map(l => `"${l}"`));
        if (personaData.objections?.length) listBlock('Objections', personaData.objections);
      }

      // Footer
      checkPage(15);
      y += 5;
      doc.line(margin, y, pageW - margin, y); y += 8;
      doc.setFontSize(8);
      doc.setTextColor(160, 160, 160);
      doc.text('Powered by Signal Lab — From Into Innovations', pageW / 2, y, { align: 'center' });

      doc.save(`signal-blueprint${projectName ? `-${projectName.toLowerCase().replace(/\s+/g, '-')}` : ''}.pdf`);
      toast.success('PDF downloaded');
      snapshotBlueprint('pdf');
    } catch (err) {
      console.error('PDF generation failed:', err);
      toast.error('Failed to generate PDF.');
    } finally {
      setGeneratingPdf(false);
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
      <div className="rounded-2xl border border-border/20 bg-card/30 p-4 sm:p-5 backdrop-blur-sm">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 shrink-0">
            <FileText className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-foreground truncate" style={{ fontFamily: 'var(--font-heading)' }}>
              Signal Blueprint
            </h3>
            <p className="text-xs text-muted-foreground">
              {enriched ? 'Full blueprint with all 4 signals.' : 'Core message ready. Enrich to add all signals.'}
            </p>
          </div>
          <button
            onClick={() => setHistoryOpen(true)}
            className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 px-2 py-1 rounded-md hover:bg-muted/40 shrink-0"
            aria-label="Version history"
          >
            <History className="h-3.5 w-3.5" />
            History
          </button>
        </div>

        {!enriched && (
          <Button onClick={enrichBlueprint} disabled={loading} variant="outline" size="sm" className="w-full gap-2 mb-4">
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            {loading ? 'Generating full blueprint...' : 'Enrich with Style, Hooks & Persona'}
          </Button>
        )}

        {/* Preview */}
        <div className="rounded-xl bg-background/50 border border-border/10 p-3 sm:p-4 space-y-3 mb-4 max-h-[50vh] overflow-y-auto">
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-primary/70">One-Liner</span>
            <p className="text-sm text-foreground mt-0.5">{outputs.oneLiner}</p>
          </div>
          <div className="border-t border-border/10 pt-3">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-primary/70">Elevator Pitch</span>
            <p className="text-sm text-foreground mt-0.5">{outputs.elevatorPitch}</p>
          </div>
          <div className="border-t border-border/10 pt-3">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-primary/70">Social Bio</span>
            <p className="text-sm text-foreground mt-0.5">{outputs.socialBio}</p>
          </div>
          {styleData && (
            <div className="border-t border-border/10 pt-3">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-primary/70">Style Signal</span>
              {styleData.palette && (
                <div className="flex gap-1.5 mt-2">
                  {styleData.palette.map((c, i) => (
                    <div key={i} className="h-6 w-6 rounded-md border border-border/20" style={{ backgroundColor: c }} title={c} />
                  ))}
                </div>
              )}
              {styleData.fonts && <p className="text-xs text-muted-foreground mt-1">{styleData.fonts.heading} / {styleData.fonts.body}</p>}
              {styleData.mood && <p className="text-xs text-foreground mt-1">Mood: {styleData.mood}</p>}
            </div>
          )}
          {hooksData && (
            <div className="border-t border-border/10 pt-3">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-primary/70">Signal Hooks</span>
              <div className="mt-1 space-y-1">
                {hooksData.instagram?.slice(0, 2).map((h, i) => (
                  <p key={i} className="text-xs text-muted-foreground">• {h}</p>
                ))}
                {(hooksData.emailSubjects?.length || 0) > 0 && (
                  <p className="text-xs text-muted-foreground">+ {hooksData.emailSubjects?.length} email subjects, {hooksData.adHeadlines?.length} ad headlines</p>
                )}
              </div>
            </div>
          )}
          {personaData && (
            <div className="border-t border-border/10 pt-3">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-primary/70">Signal Persona</span>
              {personaData.name && <p className="text-sm text-foreground mt-1">{personaData.name} — {personaData.role}</p>}
              <p className="text-xs text-muted-foreground mt-1">{personaData.frustrations?.length} frustrations, {personaData.desires?.length} desires</p>
            </div>
          )}
        </div>

        {/* Share URL display */}
        {shareUrl && (
          <div className="rounded-lg bg-primary/5 border border-primary/15 p-3 mb-4 flex items-center gap-2">
            <Link2 className="h-3.5 w-3.5 text-primary shrink-0" />
            <p className="text-xs text-foreground truncate flex-1 font-mono">{shareUrl}</p>
            <button
              onClick={() => { navigator.clipboard.writeText(shareUrl); toast.success('Link copied!'); }}
              className="text-xs text-primary hover:underline shrink-0"
            >
              Copy
            </button>
          </div>
        )}

        {/* Actions */}
        <div className="grid grid-cols-2 gap-2">
          <Button onClick={handleCopy} variant="outline" size="sm" className="gap-1.5">
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? 'Copied' : 'Copy'}
          </Button>
          <Button onClick={handleDownloadMd} variant="outline" size="sm" className="gap-1.5">
            <Download className="h-3.5 w-3.5" />
            .md
          </Button>
          <Button onClick={handleDownloadPdf} disabled={generatingPdf} variant="outline" size="sm" className="gap-1.5">
            {generatingPdf ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileDown className="h-3.5 w-3.5" />}
            PDF
          </Button>
          <Button onClick={handleShare} disabled={sharing} size="sm" className="gap-1.5">
            {sharing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Share2 className="h-3.5 w-3.5" />}
            Share Link
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground/60 justify-center">
        <Sparkles className="h-3 w-3" />
        <span>Powered by Signal Lab — From Into Innovations</span>
      </div>

      <BlueprintVersionsDialog
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        projectId={projectId}
        onRestore={restoreFromSnapshot}
      />
    </div>
  );
}
