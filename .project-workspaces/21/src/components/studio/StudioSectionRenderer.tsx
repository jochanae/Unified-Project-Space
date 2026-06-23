/**
 * StudioSectionRenderer — renders the correct UI for each section type in Studio.
 * Extracted from StudioPage.renderSectionContent() to keep the page orchestrator lean.
 *
 * Section types: clustered, cards, pills, tones, iris, vibes, rhythms
 */

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Lock, Crown, Check, Maximize2, User } from 'lucide-react';
import { STUDIO_IMAGES } from '@/lib/studioImages';
import type { StudioSection } from '@/lib/studioData';

interface StudioSectionRendererProps {
  section: StudioSection;
  sectionIdx: number;
  pathType?: string;
  selections: Record<string, string | string[]>;
  isPremium: boolean;
  onSelectSingle: (sectionId: string, name: string) => void;
  onSelectMulti: (sectionId: string, name: string, max: number) => void;
  onSelectSkip: (sectionId: string) => void;
  isCreationMode?: boolean;
  creationName?: string;
  onCreationNameChange?: (name: string) => void;
  onExpandImage: (url: string) => void;
}

export default function StudioSectionRenderer({
  section,
  sectionIdx,
  pathType,
  selections,
  isPremium,
  onSelectSingle,
  onSelectMulti,
  onExpandImage,
  onSelectSkip,
  isCreationMode,
  creationName,
  onCreationNameChange,
}: StudioSectionRendererProps) {
  return (
    <>
      <>
        {/* ─── CLUSTERED (Art Style) ─── */}
        {section.type === 'clustered' && section.clusters
          ?.filter(cluster => {
            // Face path: only show person styles (A Person cluster)
            if (pathType === 'face') return cluster.label.includes('Person');
            // Abstract path: only show abstract styles (Something Different cluster)
            if (pathType === 'abstract') return cluster.label.includes('Something');
            // No path chosen yet: show all (shouldn't happen in building step)
            return true;
          })
          .map(cluster => (
          <div key={cluster.label} className="mb-3">
            {/* Only show cluster label if both clusters visible */}
            {!pathType && (
              <p className="px-5 text-[10px] font-extrabold text-white/50 uppercase tracking-wider mb-2">{cluster.label}</p>
            )}
            <div className="flex gap-3 px-5 overflow-x-auto no-scrollbar scroll-snap-x pb-2 studio-card-row">
              {cluster.items.map((item) => {
                const sel = selections[section.id] === item.name;
                const locked = item.premium && !isPremium;
                return (
                  <button key={item.name}
                    onClick={() => { if (locked) { toast.info('Unlock with Premium ✨'); return; } if (sel && item.img) { onExpandImage(item.img); return; } onSelectSingle(section.id, item.name); }}
                    className={cn(
                      'shrink-0 rounded-2xl overflow-hidden relative border-[2.5px] transition-all studio-tall-card',
                      sel ? 'border-primary shadow-2xl shadow-primary/20 scale-100 opacity-100' : locked ? 'border-white/10 opacity-50' : 'border-white/10 opacity-80 hover:opacity-100',
                    )}>
                    {item.img ? (
                      <div className="aspect-[2/3] w-full">
                        <img src={item.img} alt={item.name} className="h-full w-full object-cover" loading="lazy" />
                      </div>
                    ) : (
                      <div className="aspect-[2/3] w-full bg-white/5 flex items-center justify-center text-3xl">{item.emoji || '✨'}</div>
                    )}
                    {sel && (
                      <div className="absolute top-2 right-2 flex gap-1">
                        <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                          <Check className="h-3 w-3 text-primary-foreground" />
                        </div>
                        {item.img && (
                          <div className="h-5 w-5 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                            <Maximize2 className="h-3 w-3 text-white" />
                          </div>
                        )}
                      </div>
                    )}
                    {locked && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/25 backdrop-blur-[1px]">
                        <Crown className="h-4 w-4 text-white" />
                      </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 px-3 pb-3 pt-8 bg-gradient-to-t from-black/80">
                      <p className="text-sm font-bold text-white">{item.name}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {/* ─── CARDS (Hair, Outfit, Background) ─── */}
        {section.type === 'cards' && (
          <div className="flex gap-3 px-5 overflow-x-auto no-scrollbar scroll-snap-x pb-2 studio-card-row">
            {!section.required && (
              <button onClick={() => onSelectSkip(section.id)}
                className={cn('shrink-0 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-1 transition-all studio-tall-card',
                  selections[section.id] === '__skip__' ? 'border-green-500 bg-green-500/5' : 'border-white/20 bg-white/5')}>
                <span className="text-xl">⏭</span>
                <span className={cn('text-[10px] font-bold', selections[section.id] === '__skip__' ? 'text-green-400' : 'text-white/50')}>Skip</span>
              </button>
            )}
            {section.items?.map((item) => {
              const locked = item.premium && !isPremium;
              if (section.multi) {
                const arr = Array.isArray(selections[section.id]) ? selections[section.id] as string[] : [];
                const sel = arr.includes(item.name);
                return (
                  <button key={item.name}
                    onClick={() => { if (locked) { toast.info('Unlock with Premium ✨'); return; } if (sel && item.img) { onExpandImage(item.img); return; } onSelectMulti(section.id, item.name, section.maxSelect || 3); }}
                    className={cn(
                      'shrink-0 rounded-2xl overflow-hidden relative border-[2.5px] transition-all studio-tall-card',
                      sel ? 'border-accent shadow-2xl shadow-accent/20 opacity-100' : locked ? 'border-white/10 opacity-50' : 'border-white/10 opacity-80 hover:opacity-100',
                    )}>
                    <div className="aspect-[2/3] w-full">
                      {item.img ? <img src={item.img} alt={item.name} className="h-full w-full object-cover" loading="lazy" /> : <div className="h-full w-full bg-white/5 flex items-center justify-center text-3xl">{item.emoji || '✨'}</div>}
                    </div>
                    {sel && <div className="absolute top-2.5 right-2.5 h-6 w-6 rounded-full bg-accent flex items-center justify-center shadow"><Check className="h-3.5 w-3.5 text-white" /></div>}
                    {locked && <div className="absolute inset-0 flex items-center justify-center bg-black/25 backdrop-blur-[1px]"><Crown className="h-5 w-5 text-white" /></div>}
                    <div className="absolute bottom-0 left-0 right-0 px-4 pb-4 pt-10 bg-gradient-to-t from-black/80 via-black/40 to-transparent"><p className="text-sm font-bold text-white">{item.name}</p>{item.desc && <p className="text-[10px] text-white/60 mt-0.5">{item.desc}</p>}</div>
                  </button>
                );
              }
              const sel = selections[section.id] === item.name;
              return (
                <button key={item.name}
                  onClick={() => { if (locked) { toast.info('Unlock with Premium ✨'); return; } if (sel && item.img) { onExpandImage(item.img); return; } onSelectSingle(section.id, item.name); }}
                  className={cn(
                    'shrink-0 rounded-2xl overflow-hidden relative border-[2.5px] transition-all studio-tall-card',
                    sel ? 'border-primary shadow-2xl shadow-primary/20 opacity-100' : locked ? 'border-white/10 opacity-50' : 'border-white/10 opacity-80 hover:opacity-100',
                  )}>
                  <div className="aspect-[2/3] w-full">
                    {item.img ? <img src={item.img} alt={item.name} className="h-full w-full object-cover" loading="lazy" /> : <div className="h-full w-full flex items-center justify-center text-3xl" style={{ background: item.color || 'rgba(255,255,255,0.05)' }}>{item.emoji || '✨'}</div>}
                  </div>
                  {sel && <div className="absolute top-2.5 right-2.5 h-6 w-6 rounded-full bg-primary flex items-center justify-center shadow"><Check className="h-3.5 w-3.5 text-primary-foreground" /></div>}
                  {locked && <div className="absolute inset-0 flex items-center justify-center bg-black/25 backdrop-blur-[1px]"><Crown className="h-5 w-5 text-white" /></div>}
                  <div className="absolute bottom-0 left-0 right-0 px-4 pb-4 pt-10 bg-gradient-to-t from-black/80 via-black/40 to-transparent"><p className="text-sm font-bold text-white">{item.name}</p>{item.desc && <p className="text-[10px] text-white/60 mt-0.5">{item.desc}</p>}</div>
                </button>
              );
            })}
          </div>
        )}

        {/* ─── PILLS (Gender — visual cards) ─── */}
        {section.type === 'pills' && (
          <div>
            {!section.required && (
              <div className="px-5 mb-2">
                <button onClick={() => onSelectSkip(section.id)}
                  className={cn('px-4 py-2 rounded-full border-2 text-xs font-semibold transition-all',
                    selections[section.id] === '__skip__' ? 'border-green-500 bg-green-500/5 text-green-400' : 'border-white/20 bg-white/5 text-white/50')}>
                  ⏭ Skip
                </button>
              </div>
            )}
            <div className="flex gap-3 px-5 overflow-x-auto no-scrollbar scroll-snap-x pb-2 studio-card-row">
              {section.items?.map((item) => {
                const sel = selections[section.id] === item.name;
                const locked = item.premium && !isPremium;
                return (
                  <button key={item.name} onClick={() => { if (locked) { toast.info('Unlock with Premium ✨'); return; } if (sel && item.img) { onExpandImage(item.img); return; } onSelectSingle(section.id, item.name); }}
                    className={cn(
                      'shrink-0 rounded-2xl overflow-hidden relative border-[2.5px] transition-all studio-tall-card',
                      sel ? 'border-primary shadow-2xl shadow-primary/20 scale-100 opacity-100' : locked ? 'border-white/10 opacity-50' : 'border-white/10 opacity-80 hover:opacity-100',
                    )}>
                    <div className="aspect-[2/3] w-full">
                      {item.img ? <img src={item.img} alt={item.name} className="h-full w-full object-cover" loading="lazy" /> : <div className="h-full w-full bg-white/5 flex items-center justify-center text-4xl">{item.emoji || '✨'}</div>}
                    </div>
                    {sel && <div className="absolute top-2.5 right-2.5 h-6 w-6 rounded-full bg-primary flex items-center justify-center shadow"><Check className="h-3.5 w-3.5 text-primary-foreground" /></div>}
                    {locked && <div className="absolute inset-0 flex items-center justify-center bg-black/25 backdrop-blur-[1px]"><Crown className="h-5 w-5 text-white" /></div>}
                    <div className="absolute bottom-0 left-0 right-0 px-4 pb-4 pt-10 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
                      <p className="text-sm font-bold text-white">{item.name}</p>
                      {item.desc && <p className="text-[10px] text-white/60 mt-0.5">{item.desc}</p>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ─── TONES (Skin, Hair Color — visual cards) ─── */}
        {section.type === 'tones' && (
          <div>
            {!section.required && (
              <div className="px-5 mb-3">
                <button onClick={() => onSelectSkip(section.id)}
                  className={cn('px-4 py-2 rounded-full border-2 text-xs font-semibold transition-all',
                    selections[section.id] === '__skip__' ? 'border-green-500 bg-green-500/5 text-green-400' : 'border-white/20 bg-white/5 text-white/50')}>
                  ⏭ Skip
                </button>
              </div>
            )}
            <div className="flex gap-3 px-5 overflow-x-auto no-scrollbar scroll-snap-x pb-2 studio-card-row">
              {section.items?.map((item) => {
                const sel = selections[section.id] === item.name;
                const locked = item.premium && !isPremium;
                return (
                  <button key={item.name} onClick={() => { if (locked) { toast.info('Unlock with Premium ✨'); return; } onSelectSingle(section.id, item.name); }}
                    className={cn(
                      'shrink-0 rounded-2xl overflow-hidden relative border-[2.5px] transition-all studio-tall-card',
                      sel ? 'border-primary shadow-2xl shadow-primary/20 opacity-100' : locked ? 'border-white/10 opacity-50' : 'border-white/10 opacity-80 hover:opacity-100',
                    )}>
                    <div className="aspect-[2/3] w-full">
                      {item.img ? <img src={item.img} alt={item.name} className="h-full w-full object-cover" loading="lazy" /> : (
                        <div className="h-full w-full flex items-center justify-center" style={{ background: item.color }}>
                          {item.emoji && <span className="text-4xl">{item.emoji}</span>}
                        </div>
                      )}
                    </div>
                    {sel && <div className="absolute top-2.5 right-2.5 h-6 w-6 rounded-full bg-primary flex items-center justify-center shadow"><Check className="h-3.5 w-3.5 text-primary-foreground" /></div>}
                    {locked && <div className="absolute inset-0 flex items-center justify-center bg-black/25 backdrop-blur-[1px]"><Crown className="h-5 w-5 text-white" /></div>}
                    <div className="absolute bottom-0 left-0 right-0 px-4 pb-4 pt-10 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
                      <p className="text-sm font-bold text-white">{item.name}</p>
                      {item.desc && <p className="text-[10px] text-white/60 mt-0.5">{item.desc}</p>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ─── IRIS (Eye Color — cinematic iris rings) ─── */}
        {section.type === 'iris' && (
          <div>
            {!section.required && (
              <div className="px-5 mb-3">
                <button onClick={() => onSelectSkip(section.id)}
                  className={cn('px-4 py-2 rounded-full border-2 text-xs font-semibold transition-all',
                    selections[section.id] === '__skip__' ? 'border-green-500 bg-green-500/5 text-green-400' : 'border-white/20 bg-white/5 text-white/50')}>
                  ⏭ Skip
                </button>
              </div>
            )}
            <div className="flex flex-wrap justify-center gap-4 px-5 pb-2">
              {section.items?.map((item) => {
                const sel = selections[section.id] === item.name;
                const locked = item.premium && !isPremium;
                const irisColor = item.color || '#6b3a2a';
                return (
                  <button
                    key={item.name}
                    onClick={() => { if (locked) { toast.info('Unlock with Premium ✨'); return; } onSelectSingle(section.id, item.name); }}
                    className="flex flex-col items-center gap-2 group"
                  >
                    <div
                      className={cn(
                        'relative h-12 w-12 rounded-full transition-all duration-300',
                        sel ? 'ring-[3px] ring-primary ring-offset-2 ring-offset-background scale-110' : 'hover:scale-105',
                        locked && 'opacity-40',
                      )}
                      style={{
                        background: `radial-gradient(circle at 38% 35%,
                          rgba(255,255,255,0.25) 0%,
                          ${irisColor} 22%,
                          ${irisColor} 48%,
                          color-mix(in srgb, ${irisColor} 60%, #1a1a2e) 58%,
                          #1a1a2e 64%,
                          #0d0d15 100%)`,
                        boxShadow: sel
                          ? `0 0 16px 4px ${irisColor}66, inset 0 0 8px 2px rgba(0,0,0,0.5)`
                          : `inset 0 0 8px 2px rgba(0,0,0,0.4)`,
                      }}
                    >
                      <div className="absolute rounded-full" style={{ top: '50%', left: '50%', width: '28%', height: '28%', transform: 'translate(-50%, -50%)', background: 'radial-gradient(circle, #000 60%, #0d0d15 100%)' }} />
                      <div className="absolute rounded-full" style={{ top: '24%', left: '58%', width: '14%', height: '14%', background: 'rgba(255,255,255,0.55)', filter: 'blur(0.5px)' }} />
                      {locked && (
                        <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/30">
                          <Crown className="h-3.5 w-3.5 text-white" />
                        </div>
                      )}
                    </div>
                    <span className={cn('text-[10px] font-semibold transition-colors', sel ? 'text-white' : 'text-white/50 group-hover:text-white/70')}>{item.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {section.type === 'vibes' && (
          <div className="px-5">
            {isCreationMode && section.id === 'personality' && (
              <div className="mb-4 space-y-2">
                <p className="text-[10px] font-bold text-white/50 uppercase tracking-wider flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" /> Companion Name
                </p>
                <input type="text" value={creationName} onChange={(e) => onCreationNameChange?.(e.target.value)}
                  placeholder="Give them a name…" maxLength={20}
                  className="w-full rounded-xl border-2 border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white placeholder:text-white/25 focus:border-primary focus:outline-none transition-colors" />
              </div>
            )}
            <div className="flex gap-3 overflow-x-auto no-scrollbar scroll-snap-x pb-2 studio-card-row">
              {section.items?.map((item) => {
                const arr = Array.isArray(selections[section.id]) ? selections[section.id] as string[] : [];
                const sel = arr.includes(item.name);
                const idx = arr.indexOf(item.name);
                return (
                  <button key={item.name}
                    onClick={() => onSelectMulti(section.id, item.name, section.maxSelect || 3)}
                    className={cn(
                      'shrink-0 rounded-2xl overflow-hidden relative border-[2.5px] transition-all studio-tall-card',
                      sel ? 'border-accent shadow-2xl shadow-accent/20 opacity-100' : 'border-white/10 opacity-80 hover:opacity-100',
                    )}>
                    <div className="aspect-[2/3] w-full">
                      {item.img ? <img src={item.img} alt={item.name} className="h-full w-full object-cover" loading="lazy" /> : <div className="h-full w-full bg-white/5 flex items-center justify-center text-4xl">{item.emoji || '✨'}</div>}
                    </div>
                    {sel && (
                      <div className="absolute top-2.5 right-2.5 h-7 w-7 rounded-full bg-accent flex items-center justify-center shadow text-xs font-extrabold text-white">
                        {idx + 1}
                      </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 px-4 pb-4 pt-10 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
                      <p className="text-sm font-bold text-white">{item.name}</p>
                      {item.desc && <p className="text-[10px] text-white/60 mt-0.5">{item.desc}</p>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ─── RHYTHMS (Relational Rhythm — Communication Style) ─── */}
        {section.type === 'rhythms' && (
          <div className="px-5">
            <p className="text-[10px] font-bold text-white/50 uppercase tracking-wider mb-1 flex items-center gap-1.5">🎵 How should they talk?</p>
            <p className="text-[11px] text-white/40 mb-4">Pick a rhythm that defines their conversational style</p>
            <div className="space-y-2.5">
              {section.items?.map((item, i) => {
                const sel = selections[section.id] === item.name;
                return (
                  <motion.button
                    key={item.name}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    onClick={() => onSelectSingle(section.id, item.name)}
                    className={cn(
                      'w-full flex items-center gap-3 rounded-2xl border-2 p-4 text-left transition-all',
                      sel ? 'border-accent bg-accent/10 shadow-lg shadow-accent/10' : 'border-white/10 hover:border-white/20',
                    )}
                  >
                    <span className="text-2xl shrink-0">{item.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className={cn('text-sm font-bold', sel ? 'text-accent' : 'text-white')}>{item.name}</p>
                      {item.desc && <p className="text-[11px] text-white/50 mt-0.5 line-clamp-2">{item.desc}</p>}
                    </div>
                    {sel && (
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent">
                        <Check className="h-3.5 w-3.5 text-white" />
                      </div>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </div>
        )}
      </>
    </>
  );
}
