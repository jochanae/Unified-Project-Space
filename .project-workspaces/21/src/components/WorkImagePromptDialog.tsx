/**
 * WorkImagePromptDialog — small modal that collects a prompt + visual kind
 * and calls the generate-work-image edge function via useWorkImage.
 *
 * Triggered from the ArtifactsDrawer "+ New → Generate Visual" menu.
 */
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Wand2 } from 'lucide-react';
import { useWorkImage, type WorkVisualKind } from '@/hooks/useWorkImage';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  memberId?: string;
  projectId?: string | null;
  onGenerated?: () => void;
}

const KINDS: { value: WorkVisualKind; label: string }[] = [
  { value: 'diagram', label: 'Diagram' },
  { value: 'flowchart', label: 'Flowchart' },
  { value: 'mockup', label: 'Mockup' },
  { value: 'wireframe', label: 'Wireframe' },
  { value: 'chart', label: 'Chart / graph' },
  { value: 'moodboard', label: 'Mood board' },
  { value: 'sketch', label: 'Sketch' },
  { value: 'reference', label: 'Reference image' },
  { value: 'other', label: 'Other' },
];

export default function WorkImagePromptDialog({ open, onOpenChange, memberId, projectId, onGenerated }: Props) {
  const [prompt, setPrompt] = useState('');
  const [title, setTitle] = useState('');
  const [visualKind, setVisualKind] = useState<WorkVisualKind>('diagram');
  const { generate, loading } = useWorkImage();

  const reset = () => { setPrompt(''); setTitle(''); setVisualKind('diagram'); };

  const submit = async () => {
    if (!prompt.trim()) {
      toast.error('Describe what you want me to sketch');
      return;
    }
    const result = await generate({
      prompt: prompt.trim(),
      title: title.trim() || undefined,
      visualKind,
      memberId,
      projectId: projectId ?? null,
    });
    if (result) {
      toast.success('Visual ready in your Workbench');
      reset();
      onOpenChange(false);
      onGenerated?.();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!loading) { onOpenChange(v); if (!v) reset(); } }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-4 w-4" />
            Generate a work visual
          </DialogTitle>
          <DialogDescription>
            Diagrams, mockups, charts, mood boards — anything strategic. Saved to your Workbench.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="wi-kind">Type</Label>
            <Select value={visualKind} onValueChange={(v) => setVisualKind(v as WorkVisualKind)}>
              <SelectTrigger id="wi-kind"><SelectValue /></SelectTrigger>
              <SelectContent>
                {KINDS.map(k => <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="wi-title">Title <span className="text-muted-foreground">(optional)</span></Label>
            <Input
              id="wi-title"
              placeholder="e.g. Onboarding funnel v1"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="wi-prompt">Describe it</Label>
            <Textarea
              id="wi-prompt"
              placeholder="A clean flowchart showing user → signup → onboarding → first message, with drop-off rates labeled at each step. Minimal, light background."
              rows={5}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={loading}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
          <Button onClick={submit} disabled={loading || !prompt.trim()}>
            {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating…</> : <>Generate</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
