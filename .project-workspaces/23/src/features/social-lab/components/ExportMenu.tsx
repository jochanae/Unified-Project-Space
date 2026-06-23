import { useState } from 'react';
import { Download, FileText, FileSpreadsheet, FileArchive, Copy, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import type { SocialCampaign } from '../types';
import {
  buildMarkdown,
  buildSchedulerCsv,
  buildPlatformBundleZip,
  downloadBlob,
  copyToClipboard,
} from '../lib/export';

interface Props {
  posts: SocialCampaign[];
}

export function ExportMenu({ posts }: Props) {
  const [busy, setBusy] = useState<null | 'md' | 'csv' | 'zip' | 'copy'>(null);
  const stamp = new Date().toISOString().split('T')[0];
  const disabled = posts.length === 0;

  const guard = async (kind: typeof busy, fn: () => Promise<void> | void) => {
    if (disabled) return toast.error('No posts to export yet.');
    setBusy(kind);
    try {
      await fn();
    } catch (err: any) {
      toast.error(err?.message || 'Export failed');
    } finally {
      setBusy(null);
    }
  };

  const handleCopy = () =>
    guard('copy', async () => {
      await copyToClipboard(buildMarkdown(posts));
      toast.success(`Copied ${posts.length} post${posts.length === 1 ? '' : 's'} as Markdown.`);
    });

  const handleMd = () =>
    guard('md', () => {
      const md = buildMarkdown(posts);
      downloadBlob(new Blob([md], { type: 'text/markdown;charset=utf-8' }), `intoiq-social-${stamp}.md`);
      toast.success('Markdown downloaded.');
    });

  const handleCsv = () =>
    guard('csv', () => {
      const csv = buildSchedulerCsv(posts);
      downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), `intoiq-social-${stamp}.csv`);
      toast.success('CSV ready for Buffer / Hootsuite / Later.');
    });

  const handleZip = () =>
    guard('zip', async () => {
      const blob = await buildPlatformBundleZip(posts);
      downloadBlob(blob, `intoiq-social-bundle-${stamp}.zip`);
      toast.success('Per-platform bundle downloaded.');
    });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5" disabled={disabled || !!busy}>
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
          Export
          <span className="text-[10px] text-muted-foreground ml-1">
            ({posts.length})
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Hand-off · {posts.length} post{posts.length === 1 ? '' : 's'}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={handleCopy} className="gap-2">
          <Copy className="h-4 w-4" />
          <div className="flex flex-col">
            <span>Copy all as Markdown</span>
            <span className="text-[10px] text-muted-foreground">Paste into Notion / Docs</span>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={handleMd} className="gap-2">
          <FileText className="h-4 w-4" />
          <div className="flex flex-col">
            <span>Download Markdown</span>
            <span className="text-[10px] text-muted-foreground">.md file, grouped by platform</span>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={handleCsv} className="gap-2">
          <FileSpreadsheet className="h-4 w-4" />
          <div className="flex flex-col">
            <span>Download CSV</span>
            <span className="text-[10px] text-muted-foreground">Buffer · Hootsuite · Later</span>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={handleZip} className="gap-2">
          <FileArchive className="h-4 w-4" />
          <div className="flex flex-col">
            <span>Download bundle (.zip)</span>
            <span className="text-[10px] text-muted-foreground">One .txt per post, by platform</span>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
