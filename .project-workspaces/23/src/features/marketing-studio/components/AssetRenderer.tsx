import { forwardRef } from 'react';
import { ObsidianTile } from './templates/ObsidianTile';
import { GoldFlyer } from './templates/GoldFlyer';
import { CinematicStory } from './templates/CinematicStory';
import type { AssetConfig, TemplateId } from '../types';

interface Props {
  templateId: TemplateId;
  config: AssetConfig;
  qrDataUrl?: string;
}

/** Routes a templateId to its renderer; forwards the ref for export. */
export const AssetRenderer = forwardRef<HTMLDivElement, Props>(
  ({ templateId, config, qrDataUrl }, ref) => {
    if (templateId === 'gold-flyer') return <GoldFlyer ref={ref} config={config} qrDataUrl={qrDataUrl} />;
    if (templateId === 'cinematic-story') return <CinematicStory ref={ref} config={config} qrDataUrl={qrDataUrl} />;
    return <ObsidianTile ref={ref} config={config} qrDataUrl={qrDataUrl} />;
  },
);
AssetRenderer.displayName = 'AssetRenderer';
