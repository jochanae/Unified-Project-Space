/**
 * StudioEngineDialog — modal wrapper used by secondary surfaces
 * (Campaign Bundle, Social Export, Quick Flyer, etc.) in Phase 2.
 */

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { StudioEngine } from './StudioEngine';
import type { StudioMode } from '../types';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mode?: StudioMode;
  defaultPrompt?: string;
  title?: string;
}

export function StudioEngineDialog({ open, onOpenChange, mode, defaultPrompt, title }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title ?? 'Studio'}</DialogTitle>
        </DialogHeader>
        <StudioEngine mode={mode} defaultPrompt={defaultPrompt} lockMode={!!mode} />
      </DialogContent>
    </Dialog>
  );
}
