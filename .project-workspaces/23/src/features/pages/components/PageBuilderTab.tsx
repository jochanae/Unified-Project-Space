import { useState, useRef, useCallback, useEffect } from 'react';
import { useFunnelHub } from '@/features/projects';
import { ProjectBrandBar } from '@/components/shared/ProjectBrandBar';
import { BlockType, PageBlock } from '@/types/funnelhub';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Plus, Trash2, Copy, ArrowLeft, FileText, Type, MousePointer, Image, MessageSquareQuote, Mail, Video, Music, GripVertical, Undo2, Info, Timer, HelpCircle, CreditCard, Minus, Columns, FolderOpen, Play, Calendar, Bot, Monitor, Smartphone, Tablet, Zap, Eye } from 'lucide-react';
import { AssetPickerDialog } from './AssetPickerDialog';
import { BlockDeleteConfirm } from './BlockDeleteConfirm';
import { EditableBlock, RegenTone } from './EditableBlock';
import { BlockField } from './BlockField';
import { MobileBlockCard } from './MobileBlockCard';
import { useBlockRegen } from '../hooks/use-block-regen';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { getBrandColors, generateFullHTML } from '../utils/html-generator';
import { FormFieldEditor } from './FormFieldEditor';
import { PhoneSmsEditor } from './PhoneSmsEditor';
import { LocalBusinessEditor } from './LocalBusinessEditor';
import { LocalBusinessInfo } from '../utils/local-business-schema';
import { supabase } from '@/integrations/supabase/client';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const BLOCK_TYPES: { type: BlockType; label: string; icon: React.ReactNode }[] = [
  { type: 'hero', label: 'Hero', icon: <FileText className="h-4 w-4" /> },
  { type: 'text', label: 'Text', icon: <Type className="h-4 w-4" /> },
  { type: 'cta', label: 'CTA Button', icon: <MousePointer className="h-4 w-4" /> },
  { type: 'image', label: 'Image', icon: <Image className="h-4 w-4" /> },
  { type: 'video', label: 'Video', icon: <Video className="h-4 w-4" /> },
  { type: 'audio', label: 'Audio', icon: <Music className="h-4 w-4" /> },
  { type: 'testimonial', label: 'Testimonial', icon: <MessageSquareQuote className="h-4 w-4" /> },
  { type: 'optin', label: 'Opt-in Form', icon: <Mail className="h-4 w-4" /> },
  { type: 'countdown', label: 'Countdown', icon: <Timer className="h-4 w-4" /> },
  { type: 'faq', label: 'FAQ', icon: <HelpCircle className="h-4 w-4" /> },
  { type: 'pricing', label: 'Pricing Table', icon: <CreditCard className="h-4 w-4" /> },
  { type: 'divider', label: 'Divider', icon: <Minus className="h-4 w-4" /> },
  { type: 'columns', label: 'Columns', icon: <Columns className="h-4 w-4" /> },
  { type: 'youtube', label: 'YouTube', icon: <Play className="h-4 w-4" /> },
  { type: 'tiktok', label: 'TikTok', icon: <Music className="h-4 w-4" /> },
  { type: 'heygen', label: 'HeyGen Avatar', icon: <Bot className="h-4 w-4" /> },
  { type: 'calendly', label: 'Calendly', icon: <Calendar className="h-4 w-4" /> },
  { type: 'scheduler', label: 'Scheduler (Cal.com, Acuity, etc.)', icon: <Calendar className="h-4 w-4" /> },
  { type: 'checkout', label: 'Checkout / Buy Button', icon: <CreditCard className="h-4 w-4" /> },
  { type: 'upsell',   label: 'Upsell / OTO',          icon: <Zap className="h-4 w-4" /> },
];

const defaultContent: Record<BlockType, Record<string, string>> = {
  hero: { headline: 'Your Headline Here', subheadline: 'Supporting text that drives action', buttonText: 'Get Started', buttonUrl: '#' },
  text: { content: 'Your content goes here. Write compelling copy that moves your audience toward action.' },
  cta: { text: 'Click Here', url: '#', style: 'primary' },
  image: { url: 'https://placehold.co/800x400', alt: 'Image description' },
  video: { url: 'https://www.youtube.com/embed/dQw4w9WgXcQ', title: 'Video title', type: 'youtube', reveal_cta_after_seconds: '0', reveal_cta_text: 'Get Started Now', reveal_cta_url: '#optin' },
  audio: { url: '', title: 'Audio clip', autoplay: 'false' },
  testimonial: { quote: '"This product changed everything for me."', author: 'Happy Customer', role: 'CEO, Company' },
  optin: { headline: 'Get Free Access', buttonText: 'Subscribe', placeholder: 'Enter your email' },
  countdown: { headline: 'Offer Ends Soon', subtext: 'Don\'t miss out on this limited-time deal', target_date: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 16) },
  faq: { heading: 'Frequently Asked Questions', q1: 'What is this product?', a1: 'A brief answer explaining your product.', q2: 'How does pricing work?', a2: 'Explain your pricing model here.', q3: 'Is there a free trial?', a3: 'Yes, we offer a 14-day free trial.' },
  pricing: { heading: 'Simple Pricing', subtext: 'Choose the plan that fits you', plan1_name: 'Starter', plan1_price: '$9', plan1_period: '/month', plan1_features: 'Core features,Email support', plan1_cta: 'Start Free', plan1_url: '#', plan1_featured: 'false', plan2_name: 'Pro', plan2_price: '$29', plan2_period: '/month', plan2_features: 'Everything in Starter,Priority support,Advanced analytics', plan2_cta: 'Go Pro', plan2_url: '#', plan2_featured: 'true' },
  divider: { style: 'line', height: '40' },
  columns: { layout: '2', bg_color: '', bg_image: '', col1_image: '', col1_headline: 'Column One', col1_text: 'Describe a feature or benefit here.', col2_image: '', col2_headline: 'Column Two', col2_text: 'Describe another feature or benefit here.', col3_image: '', col3_headline: 'Column Three', col3_text: 'A third column — only shows with 3-column layout.' },
  youtube: { url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', title: 'Video title' },
  tiktok: { url: '', username: '' },
  heygen: { url: '', avatar_id: '' },
  calendly: { url: 'https://calendly.com/your-link', title: 'Schedule a Call', height: '700' },
  scheduler: { provider: 'Cal.com', url: 'https://cal.com/your-username/30min', title: 'Book a Time', height: '700' },
  checkout: {
    name: 'Premium Plan',
    description: 'Lifetime access to everything.',
    image_url: '',
    amount: '49.00',
    currency: 'usd',
    mode: 'payment',
    recurring_interval: '',
    button_text: 'Buy Now',
    success_url: '',
  },
  upsell: {
    badge:          'Special One-Time Offer',
    headline:       'Wait — Add This Before You Go',
    offer_name:     'VIP Upgrade Bundle',
    description:    'Get instant access to our advanced training, templates, and private community — at a price you\'ll never see again.',
    image_url:      '',
    original_price: '$197',
    upsell_price:   '$47',
    yes_text:       'Yes! Add This to My Order →',
    yes_url:        '',
    no_text:        'No thanks, I don\'t want this.',
    no_url:         '',
    urgency_text:   'This offer disappears when you leave this page.',
  },
};

// BlockField extracted to ./BlockField for reuse by mobile sheet.

function SortableBlockEditor({ block, onUpdate, onDelete, onDuplicate, onRegenerate, onRevert, canRevert, isRegenerating, projectId }: {
  block: PageBlock;
  onUpdate: (content: Record<string, string>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onRegenerate: (tone: RegenTone) => void;
  onRevert: () => void;
  canRevert: boolean;
  isRegenerating: boolean;
  projectId?: string;
}) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  const fields = Object.entries(block.content);
  const blockMeta = BLOCK_TYPES.find(b => b.type === block.type);

  return (
    <div ref={setNodeRef} style={style}>
      <EditableBlock
        isEditing={isFocused}
        canRevert={canRevert}
        isRegenerating={isRegenerating}
        onRegenerate={onRegenerate}
        onRevert={onRevert}
      >
        <Card className="relative group" onFocus={() => setIsFocused(true)} onBlur={(e) => {
          // Only blur when focus leaves the entire card subtree
          if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsFocused(false);
        }}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 -ml-1 text-muted-foreground hover:text-foreground touch-none">
                  <GripVertical className="h-4 w-4" />
                </button>
                <CardTitle className="text-sm flex items-center gap-2">
                  {blockMeta?.icon}
                  {blockMeta?.label}
                </CardTitle>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onDuplicate} title="Duplicate block">
                  <Copy className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowDeleteConfirm(true)} title="Delete block">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {fields
              .filter(([key]) => !['extra_fields', 'collect_phone', 'phone_required', 'require_sms_consent', 'sms_consent_text'].includes(key))
              .map(([key, val]) => (
                <BlockField key={`${block.id}-${key}`} fieldKey={key} initialValue={val} block={block} onUpdate={onUpdate} projectId={projectId} />
              ))}
            {block.type === 'optin' && (
              <>
                <PhoneSmsEditor
                  content={block.content}
                  onChange={next => onUpdate(next)}
                />
                <FormFieldEditor
                  value={block.content.extra_fields}
                  onChange={json => onUpdate({ ...block.content, extra_fields: json })}
                />
              </>
            )}
          </CardContent>
          <BlockDeleteConfirm
            open={showDeleteConfirm}
            blockLabel={blockMeta?.label || block.type}
            onConfirm={() => { setShowDeleteConfirm(false); onDelete(); }}
            onCancel={() => setShowDeleteConfirm(false)}
          />
        </Card>
      </EditableBlock>
    </div>
  );
}

export function PageBuilderTab() {
  const { activeProject, addPage, deletePage, addBlock, updateBlock, deleteBlock, updatePage } = useFunnelHub();
  const [activePageId, setActivePageId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [addBlockType, setAddBlockType] = useState<BlockType>('hero');
  const [showPreview, setShowPreview] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [localBusiness, setLocalBusiness] = useState<LocalBusinessInfo | null>(null);
  const isMobile = useIsMobile();
  const undoStack = useRef<PageBlock[][]>([]);
  const MAX_UNDO = 20;

  // Per-block snapshot history: blockId -> stack of previous content versions
  const blockHistory = useRef<Record<string, Record<string, string>[]>>({});
  const [, forceTick] = useState(0);
  const bumpHistoryUI = () => forceTick(t => t + 1);

  const { regenerate, regeneratingId } = useBlockRegen();

  // Load local_business when the active page changes
  useEffect(() => {
    if (!activePageId) { setLocalBusiness(null); return; }
    let cancelled = false;
    supabase
      .from('pages')
      .select('local_business')
      .eq('id', activePageId)
      .single()
      .then(({ data }) => {
        if (!cancelled) setLocalBusiness((data?.local_business as any) ?? null);
      });
    return () => { cancelled = true; };
  }, [activePageId]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const undoHandlerRef = useRef<() => void>(() => {});

  // Ctrl+Z keyboard shortcut — hook before any early returns
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undoHandlerRef.current();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  if (!activeProject) return null;

  const pages = activeProject.pages;
  const activePage = pages.find(p => p.id === activePageId);
  const brandColors = getBrandColors(activeProject.id);

  const pushUndo = () => {
    if (!activePage) return;
    undoStack.current = [...undoStack.current.slice(-(MAX_UNDO - 1)), activePage.blocks.map(b => ({ ...b, content: { ...b.content } }))];
  };

  const handleUndo = () => {
    if (!activePage || undoStack.current.length === 0) return;
    const prev = undoStack.current.pop()!;
    updatePage(activeProject.id, activePage.id, { blocks: prev });
    toast.success('Undo applied');
  };

  // Keep ref in sync
  undoHandlerRef.current = handleUndo;

  const handleCreatePage = async () => {
    if (!newTitle.trim()) return;
    const page = await addPage(activeProject.id, newTitle.trim());
    setActivePageId(page.id);
    setShowNew(false);
    setNewTitle('');
  };

  const handleAddBlock = (type?: BlockType) => {
    if (!activePage) return;
    const t = type || addBlockType;
    pushUndo();
    addBlock(activeProject.id, activePage.id, { type: t, content: { ...defaultContent[t] } });
    setShowAddSheet(false);
  };

  const handleMoveBlock = (blockId: string, direction: 'up' | 'down') => {
    if (!activePage) return;
    const idx = activePage.blocks.findIndex(b => b.id === blockId);
    if (idx === -1) return;
    const target = direction === 'up' ? idx - 1 : idx + 1;
    if (target < 0 || target >= activePage.blocks.length) return;
    pushUndo();
    const reordered = arrayMove(activePage.blocks, idx, target);
    updatePage(activeProject.id, activePage.id, { blocks: reordered });
  };

  const handleDuplicateBlock = (block: PageBlock) => {
    if (!activePage) return;
    pushUndo();
    addBlock(activeProject.id, activePage.id, { type: block.type, content: { ...block.content } });
    toast.success('Block duplicated');
  };

  const handleCopyHTML = () => {
    if (!activePage) return;
    navigator.clipboard.writeText(generateFullHTML(activePage, brandColors, localBusiness));
    toast.success('HTML copied — uses your brand colors');
  };

  const handleDragEnd = (event: DragEndEvent) => {
    if (!activePage) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    pushUndo();
    const oldIndex = activePage.blocks.findIndex(b => b.id === active.id);
    const newIndex = activePage.blocks.findIndex(b => b.id === over.id);
    const reordered = arrayMove(activePage.blocks, oldIndex, newIndex);

    updatePage(activeProject.id, activePage.id, { blocks: reordered });
  };

  // Page list view
  if (!activePage) {
    return (
      <div className="lg:flex lg:gap-0 lg:min-h-[calc(100vh-7rem)]">

        {/* Desktop left: vault placeholder */}
        <aside className="hidden lg:flex w-[200px] flex-shrink-0 border-r border-border/15 flex-col">
          <div className="p-3 border-b border-border/10">
            <p className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground/40 font-semibold">Block Vault</p>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            <p className="text-[11px] text-muted-foreground/40 px-2 py-4">Select a page to start adding blocks.</p>
          </div>
        </aside>

        {/* Center: page list */}
        <div className="flex-1 p-4 lg:p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">Pages</h2>
            <Button onClick={() => setShowNew(true)} size="sm">
              <Plus className="h-4 w-4 mr-1" /> New Page
            </Button>
          </div>

          {pages.length === 0 && (
            <p className="text-muted-foreground text-center py-12 text-sm">No pages yet. Create one to start building.</p>
          )}

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {pages.map(page => (
              <Card key={page.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActivePageId(page.id)}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">{page.title}</h3>
                    <p className="text-xs text-muted-foreground">{page.blocks.length} blocks</p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => { e.stopPropagation(); deletePage(activeProject.id, page.id); }}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Desktop right: inspector placeholder */}
        <aside className="hidden lg:flex w-[260px] flex-shrink-0 border-l border-border/15 flex-col">
          <div className="p-3 border-b border-border/10">
            <p className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground/40 font-semibold">Inspector</p>
          </div>
          <div className="flex-1 p-4">
            <p className="text-[11px] text-muted-foreground/40">No page selected.</p>
          </div>
        </aside>

        <Dialog open={showNew} onOpenChange={setShowNew}>
          <DialogContent>
            <DialogHeader><DialogTitle>New Page</DialogTitle></DialogHeader>
            <Input placeholder="Page title" value={newTitle} onChange={e => setNewTitle(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleCreatePage()} />
            <DialogFooter><Button onClick={handleCreatePage}>Create</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Page editor view
  return (
    <div className="flex flex-col">

      {/* ── Toolbar (all screen sizes) ── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/15 gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setActivePageId(null)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-base font-semibold truncate max-w-[200px] lg:max-w-none">{activePage.title}</h2>
          <span className="text-[11px] text-muted-foreground/50 hidden lg:inline">
            {activePage.blocks.length} block{activePage.blocks.length !== 1 ? 's' : ''}
          </span>
        </div>
        {/* Brand context — desktop only, sits in toolbar right of title */}
        <div className="hidden lg:block ml-2">
          <ProjectBrandBar />
        </div>
        {/* Mobile toolbar actions */}
        <div className="flex gap-2 lg:hidden">
          <Button variant="outline" size="sm" onClick={handleUndo} disabled={undoStack.current.length === 0} className="gap-1.5">
            <Undo2 className="h-3.5 w-3.5" /> Undo
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowPreview(true)}>Preview</Button>
          <Button variant="outline" size="sm" onClick={handleCopyHTML}>
            <Copy className="h-4 w-4 mr-1" /> Copy HTML
          </Button>
        </div>
      </div>

      {/* ════════════════════════════════════════════════
          DESKTOP THREE-PANEL LAYOUT  (lg+)
      ════════════════════════════════════════════════ */}
      <div className="hidden lg:flex min-h-[calc(100vh-9rem)]">

        {/* LEFT: Block Vault */}
        <aside className="w-[200px] flex-shrink-0 border-r border-border/15 flex flex-col overflow-hidden">
          <div className="px-3 py-2.5 border-b border-border/10">
            <p className="text-[9px] uppercase tracking-[0.12em] text-muted-foreground/40 font-semibold">Block Vault</p>
          </div>
          <div className="flex-1 overflow-y-auto py-1">
            {[
              { label: 'Layout', types: ['hero', 'text', 'columns', 'divider'] as BlockType[] },
              { label: 'Media', types: ['image', 'video', 'audio', 'youtube', 'tiktok', 'heygen'] as BlockType[] },
              { label: 'Conversion', types: ['optin', 'cta', 'countdown', 'pricing', 'checkout', 'upsell'] as BlockType[] },
              { label: 'Trust', types: ['testimonial', 'faq'] as BlockType[] },
              { label: 'Booking', types: ['calendly', 'scheduler'] as BlockType[] },
            ].map(group => (
              <div key={group.label} className="mb-1">
                <p className="px-3 pt-2.5 pb-1 text-[9px] uppercase tracking-[0.1em] text-muted-foreground/30 font-semibold">
                  {group.label}
                </p>
                {group.types.map(type => {
                  const meta = BLOCK_TYPES.find(b => b.type === type);
                  if (!meta) return null;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => handleAddBlock(type)}
                      className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
                    >
                      <span className="text-primary/70 shrink-0">{meta.icon}</span>
                      <span className="truncate">{meta.label}</span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </aside>

        {/* CENTER: Block Editor Canvas */}
        <main className="flex-1 overflow-y-auto">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={activePage.blocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
              <div className="p-4 space-y-3">
                {activePage.blocks.map(block => (
                  <SortableBlockEditor
                    key={block.id}
                    block={block}
                    projectId={activeProject.id}
                    onUpdate={content => updateBlock(activeProject.id, activePage.id, block.id, content)}
                    onDelete={() => { pushUndo(); deleteBlock(activeProject.id, activePage.id, block.id); }}
                    onDuplicate={() => handleDuplicateBlock(block)}
                    isRegenerating={regeneratingId === block.id}
                    canRevert={(blockHistory.current[block.id]?.length || 0) > 0}
                    onRegenerate={async (tone) => {
                      const next = await regenerate({
                        blockId: block.id,
                        blockType: block.type,
                        currentContent: block.content,
                        tone,
                        projectName: activeProject.name,
                        projectMission: (activeProject as any).description || (activeProject as any).goal || '',
                      });
                      if (next) {
                        const stack = blockHistory.current[block.id] || [];
                        blockHistory.current[block.id] = [...stack, { ...block.content }].slice(-10);
                        bumpHistoryUI();
                        updateBlock(activeProject.id, activePage.id, block.id, next);
                      }
                    }}
                    onRevert={() => {
                      const stack = blockHistory.current[block.id] || [];
                      if (stack.length === 0) return;
                      const prev = stack[stack.length - 1];
                      blockHistory.current[block.id] = stack.slice(0, -1);
                      bumpHistoryUI();
                      updateBlock(activeProject.id, activePage.id, block.id, prev);
                      toast.success('Reverted to previous version');
                    }}
                  />
                ))}
                {activePage.blocks.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <p className="text-sm text-muted-foreground mb-1">Canvas is empty</p>
                    <p className="text-xs text-muted-foreground/50">Click a block type in the vault to add it here</p>
                  </div>
                )}
              </div>
            </SortableContext>
          </DndContext>
        </main>

        {/* RIGHT: Inspector */}
        <aside className="w-[260px] flex-shrink-0 border-l border-border/15 flex flex-col overflow-hidden">
          <div className="px-3 py-2.5 border-b border-border/10">
            <p className="text-[9px] uppercase tracking-[0.12em] text-muted-foreground/40 font-semibold">Inspector</p>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-4">

            {/* Page actions */}
            <div className="space-y-1.5">
              <p className="text-[9px] uppercase tracking-[0.1em] text-muted-foreground/30 font-semibold mb-2">Actions</p>
              <Button
                variant="outline" size="sm"
                className="w-full gap-1.5 justify-start h-8 text-xs"
                onClick={handleUndo}
                disabled={undoStack.current.length === 0}
              >
                <Undo2 className="h-3.5 w-3.5" /> Undo
              </Button>
              <Button
                variant="outline" size="sm"
                className="w-full gap-1.5 justify-start h-8 text-xs"
                onClick={() => setShowPreview(true)}
              >
                <Eye className="h-3.5 w-3.5" /> Preview page
              </Button>
              <Button
                variant="outline" size="sm"
                className="w-full gap-1.5 justify-start h-8 text-xs"
                onClick={handleCopyHTML}
              >
                <Copy className="h-3.5 w-3.5" /> Copy HTML
              </Button>
            </div>

            <div className="h-px bg-border/15" />

            {/* Local Business / SEO */}
            <div>
              <p className="text-[9px] uppercase tracking-[0.1em] text-muted-foreground/30 font-semibold mb-2">Page Settings</p>
              <LocalBusinessEditor key={activePage.id} pageId={activePage.id} initial={localBusiness} />
            </div>

          </div>
        </aside>
      </div>

      {/* ════════════════════════════════════════════════
          MOBILE LAYOUT  (below lg — unchanged)
      ════════════════════════════════════════════════ */}
      <div className="lg:hidden p-4">

        <LocalBusinessEditor key={`mob-${activePage.id}`} pageId={activePage.id} initial={localBusiness} />

        {/* Mobile block list */}
        <div className="space-y-2 mb-6 mt-4">
          {activePage.blocks.map((block, idx) => (
            <MobileBlockCard
              key={block.id}
              block={block}
              index={idx}
              total={activePage.blocks.length}
              meta={BLOCK_TYPES.find(b => b.type === block.type)}
              projectId={activeProject.id}
              isRegenerating={regeneratingId === block.id}
              canRevert={(blockHistory.current[block.id]?.length || 0) > 0}
              onUpdate={content => updateBlock(activeProject.id, activePage.id, block.id, content)}
              onDelete={() => { pushUndo(); deleteBlock(activeProject.id, activePage.id, block.id); }}
              onDuplicate={() => handleDuplicateBlock(block)}
              onMove={(dir) => handleMoveBlock(block.id, dir)}
              onRegenerate={async (tone) => {
                const next = await regenerate({
                  blockId: block.id,
                  blockType: block.type,
                  currentContent: block.content,
                  tone,
                  projectName: activeProject.name,
                  projectMission: (activeProject as any).description || (activeProject as any).goal || '',
                });
                if (next) {
                  const stack = blockHistory.current[block.id] || [];
                  blockHistory.current[block.id] = [...stack, { ...block.content }].slice(-10);
                  bumpHistoryUI();
                  updateBlock(activeProject.id, activePage.id, block.id, next);
                }
              }}
              onRevert={() => {
                const stack = blockHistory.current[block.id] || [];
                if (stack.length === 0) return;
                const prev = stack[stack.length - 1];
                blockHistory.current[block.id] = stack.slice(0, -1);
                bumpHistoryUI();
                updateBlock(activeProject.id, activePage.id, block.id, prev);
                toast.success('Reverted to previous version');
              }}
            />
          ))}
          {activePage.blocks.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              No blocks yet — tap "Add Block" below to start.
            </p>
          )}
        </div>

        {/* Mobile FAB + sheet */}
        <Button
          onClick={() => setShowAddSheet(true)}
          size="lg"
          className="fixed bottom-20 right-4 z-40 h-14 w-14 rounded-full shadow-xl p-0"
          aria-label="Add block"
        >
          <Plus className="h-6 w-6" />
        </Button>

        <Sheet open={showAddSheet} onOpenChange={setShowAddSheet}>
          <SheetContent side="bottom" className="glass border-border/30 rounded-t-2xl max-h-[75vh] p-0 flex flex-col">
            <SheetHeader className="px-4 pt-5 pb-3 border-b border-border/30 shrink-0">
              <SheetTitle className="text-base">Add a block</SheetTitle>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto px-3 py-3">
              <div className="grid grid-cols-3 gap-2">
                {BLOCK_TYPES.map(b => (
                  <button
                    key={b.type}
                    type="button"
                    onClick={() => handleAddBlock(b.type)}
                    className={cn(
                      'flex flex-col items-center justify-center gap-1.5 p-3 rounded-lg',
                      'border border-border/30 bg-card/30',
                      'hover:bg-accent/40 hover:border-primary/40 active:scale-95 transition-all',
                    )}
                  >
                    <span className="text-primary">{b.icon}</span>
                    <span className="text-[11px] font-medium text-center leading-tight">{b.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* ── Preview dialog (all sizes) ── */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col gap-0 p-0 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/20 shrink-0">
            <DialogTitle className="text-sm font-medium truncate max-w-[200px]">
              {activePage.title}
            </DialogTitle>
            <div className="flex items-center gap-1 rounded-lg border border-border/30 bg-muted/20 p-0.5">
              {([
                { key: 'desktop', icon: Monitor,    label: 'Desktop' },
                { key: 'tablet',  icon: Tablet,     label: 'Tablet'  },
                { key: 'mobile',  icon: Smartphone, label: 'Mobile'  },
              ] as const).map(({ key, icon: Icon, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setPreviewDevice(key)}
                  title={label}
                  className={cn(
                    'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs transition-colors',
                    previewDevice === key
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{label}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-auto bg-muted/10 flex items-start justify-center p-4 sm:p-6">
            <div
              className="transition-all duration-300 w-full"
              style={{ maxWidth: previewDevice === 'mobile' ? 390 : previewDevice === 'tablet' ? 768 : '100%' }}
            >
              <div className={cn('relative w-full overflow-hidden transition-all duration-300', previewDevice !== 'desktop' && 'rounded-[2rem] border-[6px] border-foreground/20 shadow-2xl')}>
                {previewDevice === 'mobile' && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-5 bg-foreground/20 rounded-b-xl z-10" />
                )}
                <iframe
                  srcDoc={generateFullHTML(activePage, brandColors, localBusiness)}
                  className="w-full border-0"
                  style={{ height: previewDevice === 'mobile' ? 700 : previewDevice === 'tablet' ? 900 : '68vh', minHeight: 400 }}
                  title="Page Preview"
                />
              </div>
              <p className="text-center text-[10px] text-muted-foreground mt-2 tabular-nums">
                {previewDevice === 'mobile' ? '390px — iPhone 14 Pro' : previewDevice === 'tablet' ? '768px — iPad' : 'Full width — Desktop'}
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );

}
