import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Palette } from 'lucide-react';
import { CanvasElement } from './LogoCanvas';

export interface BrandTemplate {
  name: string;
  description: string;
  backgroundColor: string;
  previewColors: string[];
  elements: Omit<CanvasElement, 'id'>[];
}

const TEMPLATES: BrandTemplate[] = [
  {
    name: 'Premium Real Estate',
    description: 'Navy + gold serif, luxury feel',
    backgroundColor: '#0f1b3d',
    previewColors: ['#0f1b3d', '#c9a84c', '#f5f0e0'],
    elements: [
      {
        type: 'text', x: 100, y: 180, text: 'LUXE',
        fontSize: 80, fontFamily: 'Playfair Display', fontStyle: 'bold',
        fillLinearGradient: { colors: ['#c9a84c', '#f0d78c'], direction: 'vertical' },
        baselineGroup: 'brand',
      },
      {
        type: 'text', x: 100, y: 280, text: 'PROPERTIES',
        fontSize: 20, fontFamily: 'Inter', fontStyle: 'normal',
        fill: '#e8edf3', letterSpacing: 12,
        baselineGroup: 'tagline',
      },
    ],
  },
  {
    name: 'Tech Startup',
    description: 'Dark + neon mint, modern sans',
    backgroundColor: '#0d1b2a',
    previewColors: ['#0d1b2a', '#2dd4a8', '#73ffb8'],
    elements: [
      {
        type: 'text', x: 80, y: 190, text: 'NOVA',
        fontSize: 84, fontFamily: 'Inter', fontStyle: 'bold',
        fillLinearGradient: { colors: ['#2dd4a8', '#73ffb8'], direction: 'horizontal' },
        baselineGroup: 'brand',
      },
      {
        type: 'text', x: 82, y: 285, text: 'Build the future',
        fontSize: 18, fontFamily: 'Inter', fontStyle: 'normal',
        fill: '#94a3b8',
        baselineGroup: 'tagline',
      },
    ],
  },
  {
    name: 'Wellness Coach',
    description: 'Sage + cream, serene & organic',
    backgroundColor: '#f5f0e8',
    previewColors: ['#f5f0e8', '#a8c0a0', '#7d9b76'],
    elements: [
      {
        type: 'text', x: 100, y: 180, text: 'Bloom',
        fontSize: 76, fontFamily: 'Playfair Display', fontStyle: 'italic',
        fill: '#4a6741',
        baselineGroup: 'brand',
      },
      {
        type: 'text', x: 102, y: 272, text: 'WELLNESS STUDIO',
        fontSize: 16, fontFamily: 'Inter', fontStyle: 'normal',
        fill: '#7d9b76', letterSpacing: 8,
        baselineGroup: 'tagline',
      },
    ],
  },
  {
    name: 'Creative Agency',
    description: 'Coral + dark, bold & energetic',
    backgroundColor: '#1a1a1a',
    previewColors: ['#1a1a1a', '#ff6b6b', '#ee5a70'],
    elements: [
      {
        type: 'text', x: 80, y: 170, text: 'SPARK',
        fontSize: 90, fontFamily: 'Inter', fontStyle: 'bold',
        fillLinearGradient: { colors: ['#ff6b6b', '#c44569'], direction: 'vertical' },
        baselineGroup: 'brand',
      },
      {
        type: 'text', x: 82, y: 280, text: 'CREATIVE CO.',
        fontSize: 18, fontFamily: 'Inter', fontStyle: 'normal',
        fill: '#a0aec0', letterSpacing: 6,
        baselineGroup: 'tagline',
      },
    ],
  },
  {
    name: 'Luxury Fashion',
    description: 'Noir + gold, high-end editorial',
    backgroundColor: '#0d0d0d',
    previewColors: ['#0d0d0d', '#c9a84c', '#f0d78c'],
    elements: [
      {
        type: 'text', x: 100, y: 190, text: 'MAISON',
        fontSize: 72, fontFamily: 'Playfair Display', fontStyle: 'normal',
        fillLinearGradient: { colors: ['#c9a84c', '#f0d78c'], direction: 'horizontal' },
        baselineGroup: 'brand',
      },
      {
        type: 'text', x: 100, y: 278, text: 'PARIS',
        fontSize: 28, fontFamily: 'Inter', fontStyle: 'normal',
        fill: '#666666', letterSpacing: 18,
        baselineGroup: 'tagline',
      },
    ],
  },
];

interface BrandTemplatesProps {
  onApply: (template: BrandTemplate) => void;
}

export function BrandTemplates({ onApply }: BrandTemplatesProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="space-y-2">
      <button
        onClick={() => setExpanded(e => !e)}
        className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <Palette className="h-3.5 w-3.5" />
        <span className="font-medium">Brand Templates</span>
        {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>

      {expanded && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {TEMPLATES.map(t => (
            <button
              key={t.name}
              onClick={() => onApply(t)}
              className="group text-left rounded-xl border border-border/20 p-2.5 hover:border-primary/30 transition-all bg-card/30 hover:bg-card/50"
            >
              <div className="flex gap-1 mb-1.5">
                {t.previewColors.map((c, i) => (
                  <div key={i} className="h-4 flex-1 rounded-sm" style={{ backgroundColor: c }} />
                ))}
              </div>
              <p className="text-[11px] font-medium truncate">{t.name}</p>
              <p className="text-[9px] text-muted-foreground/60 truncate">{t.description}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
