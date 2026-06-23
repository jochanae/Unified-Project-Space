import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import legacyCaretSrc from '@/assets/legacy-caret.png';
import Konva from 'konva';
import { LogoCanvas, CanvasElement } from './LogoCanvas';
import { AILogoGenerator } from './AILogoGenerator';
import { ToolPanel } from './ToolPanel';
import { ShapesLibrary, ShapeItem } from './ShapesLibrary';
import { WordmarkGallery } from './WordmarkGallery';
import { LogoQuinnPanel } from './LogoQuinnPanel';
import { BrandTemplates, BrandTemplate } from './BrandTemplates';
import { useQuinnLogo } from '../hooks/use-quinn-logo';
import { useCanvasHistory } from '../hooks/use-canvas-history';
import { useCanvasPersistence, CanvasState } from '../hooks/use-canvas-persistence';
import { useLogoProjectContext } from '../hooks/use-logo-project-context';
import { useCurrentUser } from '@/hooks/use-current-user';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Undo2, Redo2, Settings2, ImagePlus, X, Type, Image, Download, Save } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { useSearchParams } from 'react-router-dom';
import { MobileQuickEdit } from './MobileQuickEdit';

let nextId = 1;
const uid = () => `el-${nextId++}`;

const DEFAULT_ELEMENTS: CanvasElement[] = [];

const INITIAL_BG = '#0a0a1a';
const INITIAL_SIZE = { width: 512, height: 512 };

/** Flash the canvas border to confirm a change was applied */
function useCanvasFlash() {
  const [flash, setFlash] = useState(false);
  const trigger = useCallback(() => {
    setFlash(true);
    setTimeout(() => setFlash(false), 600);
  }, []);
  return { flash, trigger };
}

export function LogoGenerator() {
  const { flash: canvasFlash, trigger: flashCanvas } = useCanvasFlash();
  const isMobile = useIsMobile();
  const { user } = useCurrentUser();
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get('project');
  const [saving, setSaving] = useState(false);
  const [elements, setElements] = useState<CanvasElement[]>(DEFAULT_ELEMENTS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [canvasSize, setCanvasSize] = useState(INITIAL_SIZE);
  const [backgroundColor, setBackgroundColor] = useState(INITIAL_BG);
  const [showGrid, setShowGrid] = useState(true);
  const [showBaseline, setShowBaseline] = useState(true);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [referenceImageUrl, setReferenceImageUrl] = useState<string | null>(null);
  const [referenceOpacity, setReferenceOpacity] = useState(0.5);
  const [showTapHint, setShowTapHint] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const refFileInputRef = useRef<HTMLInputElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  // Persistent state — restore on mount
  const handleRestore = useCallback((saved: CanvasState) => {
    setElements(saved.elements);
    setBackgroundColor(saved.backgroundColor);
    setCanvasSize(saved.canvasSize);
    if (saved.referenceImageUrl) setReferenceImageUrl(saved.referenceImageUrl);
  }, []);

  const { clearSaved } = useCanvasPersistence(
    { elements, backgroundColor, canvasSize, referenceImageUrl },
    handleRestore,
  );

  // Project context
  const projectContext = useLogoProjectContext(projectId);

  // Undo/redo
  const history = useCanvasHistory({
    elements: DEFAULT_ELEMENTS,
    backgroundColor: INITIAL_BG,
    canvasSize: INITIAL_SIZE,
  });

  const pushSnapshot = useCallback(() => {
    history.push({ elements, backgroundColor, canvasSize });
  }, [elements, backgroundColor, canvasSize, history]);

  const prevElementsRef = useRef(elements);
  const prevBgRef = useRef(backgroundColor);
  const prevSizeRef = useRef(canvasSize);

  useEffect(() => {
    if (
      prevElementsRef.current !== elements ||
      prevBgRef.current !== backgroundColor ||
      prevSizeRef.current !== canvasSize
    ) {
      pushSnapshot();
      prevElementsRef.current = elements;
      prevBgRef.current = backgroundColor;
      prevSizeRef.current = canvasSize;
    }
  }, [elements, backgroundColor, canvasSize, pushSnapshot]);

  const handleUndo = useCallback(() => {
    const snapshot = history.undo();
    if (snapshot) {
      setElements(snapshot.elements);
      setBackgroundColor(snapshot.backgroundColor);
      setCanvasSize(snapshot.canvasSize);
    }
  }, [history]);

  const handleRedo = useCallback(() => {
    const snapshot = history.redo();
    if (snapshot) {
      setElements(snapshot.elements);
      setBackgroundColor(snapshot.backgroundColor);
      setCanvasSize(snapshot.canvasSize);
    }
  }, [history]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleUndo, handleRedo]);

  // MarQ logo integration
  const getCanvasState = useCallback(() => ({
    elements,
    canvasSize,
    backgroundColor,
  }), [elements, canvasSize, backgroundColor]);

  const quinnCallbacks = {
    onUpdateElement: (id: string, attrs: Partial<CanvasElement>) => {
      setElements(prev => prev.map(el => el.id === id ? { ...el, ...attrs } : el));
      flashCanvas();
    },
    onAddText: (attrs: Partial<CanvasElement>) => {
      const newEl: CanvasElement = {
        id: uid(),
        type: 'text',
        x: attrs.x ?? canvasSize.width / 2 - 50,
        y: attrs.y ?? canvasSize.height / 2 - 20,
        text: attrs.text || 'Text',
        fontSize: attrs.fontSize || 40,
        fontFamily: attrs.fontFamily || 'Inter',
        fontStyle: attrs.fontStyle || 'normal',
        fill: attrs.fill || '#ffffff',
        ...attrs,
      };
      setElements(prev => [...prev, newEl]);
      setSelectedId(newEl.id);
      flashCanvas();
    },
    onDeleteElement: (id: string) => {
      setElements(prev => prev.filter(el => el.id !== id));
      setSelectedId(prev => prev === id ? null : prev);
      flashCanvas();
    },
    onSetBackground: (color: string) => { setBackgroundColor(color); flashCanvas(); },
    onSetCanvasSize: (size: { width: number; height: number }) => { setCanvasSize(size); flashCanvas(); },
    onAddImage: (attrs: { imageUrl: string; width: number; height: number; x?: number; y?: number }) => {
      const newEl: CanvasElement = {
        id: uid(),
        type: 'image',
        x: attrs.x ?? canvasSize.width / 2 - attrs.width / 2,
        y: attrs.y ?? canvasSize.height / 2 - attrs.height / 2,
        imageUrl: attrs.imageUrl,
        width: attrs.width,
        height: attrs.height,
      };
      setElements(prev => [...prev, newEl]);
      setSelectedId(newEl.id);
      flashCanvas();
    },
  };

  const quinn = useQuinnLogo(getCanvasState, quinnCallbacks, projectContext);

  // Auto-scroll to canvas on mobile when MarQ makes changes
  const prevElementCountRef = useRef(elements.length);
  useEffect(() => {
    if (isMobile && elements.length !== prevElementCountRef.current && canvasContainerRef.current) {
      canvasContainerRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    prevElementCountRef.current = elements.length;
  }, [elements.length, isMobile]);

  const appendElement = useCallback((newEl: CanvasElement) => {
    setElements(prev => [...prev, newEl]);
    setSelectedId(newEl.id);
    setShowTapHint(false);
  }, []);

  const selectElement = useCallback((id: string | null) => {
    setSelectedId(id);
    if (id) setShowTapHint(false);
  }, []);

  // Apply brand template
  const handleApplyTemplate = useCallback((template: BrandTemplate) => {
    const newElements: CanvasElement[] = template.elements.map(el => ({
      ...el,
      id: uid(),
    }));
    setElements(newElements);
    setBackgroundColor(template.backgroundColor);
    setSelectedId(null);
    toast.success(`Applied "${template.name}" template`);
  }, []);

  const handleAddText = useCallback(() => {
    const newEl: CanvasElement = {
      id: uid(),
      type: 'text',
      x: canvasSize.width / 2 - 50,
      y: canvasSize.height / 2 - 20,
      text: 'Text',
      fontSize: 40,
      fontFamily: 'Inter',
      fontStyle: 'normal',
      fill: '#ffffff',
    };
    appendElement(newEl);
  }, [appendElement, canvasSize]);

  const handleAddShape = useCallback((shape: ShapeItem) => {
    const newEl: CanvasElement = {
      id: uid(),
      type: 'text',
      x: canvasSize.width / 2 - 18,
      y: canvasSize.height / 2 - 30,
      text: shape.char,
      fontSize: 64,
      fontFamily: 'Inter',
      fontStyle: 'normal',
      fill: '#ffffff',
    };
    appendElement(newEl);
  }, [appendElement, canvasSize]);

  const handleAddWordmark = useCallback((brandName: string, style: any) => {
    const newEl: CanvasElement = {
      id: uid(),
      type: 'text',
      x: canvasSize.width / 2 - (brandName.length * style.fontSize * 0.3),
      y: canvasSize.height / 2 - style.fontSize / 2,
      text: brandName,
      fontSize: style.fontSize,
      fontFamily: style.fontFamily,
      fontStyle: style.fontStyle,
      letterSpacing: style.letterSpacing,
      fill: style.fill || '#ffffff',
      ...(style.gradient ? { fillLinearGradient: style.gradient, fill: undefined } : {}),
    };
    appendElement(newEl);
    flashCanvas();
    toast.success(`"${brandName}" wordmark added — ${style.name} style`);
  }, [appendElement, canvasSize, flashCanvas]);

  const handleUploadImage = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const url = reader.result as string;
      const img = new window.Image();
      img.onload = () => {
        const maxDim = 200;
        const scale = Math.min(maxDim / img.width, maxDim / img.height, 1);
        const newEl: CanvasElement = {
          id: uid(),
          type: 'image',
          x: canvasSize.width / 2 - (img.width * scale) / 2,
          y: canvasSize.height / 2 - (img.height * scale) / 2,
          imageUrl: url,
          width: img.width * scale,
          height: img.height * scale,
        };
        appendElement(newEl);
      };
      img.src = url;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }, [appendElement, canvasSize]);

  const handleDeleteSelected = useCallback(() => {
    if (!selectedId) return;
    setElements(prev => prev.filter(el => el.id !== selectedId));
    setSelectedId(null);
  }, [selectedId]);

  const handleUpdateElement = useCallback((id: string, attrs: Partial<CanvasElement>) => {
    setElements(prev => prev.map(el => el.id === id ? { ...el, ...attrs } : el));
  }, []);

  useEffect(() => {
    if (selectedId) setShowTapHint(false);
  }, [selectedId]);

  const handleExport = useCallback(() => {
    const stage = Konva.stages[0];
    if (!stage) {
      toast.error('Stage not found');
      return;
    }
    setSelectedId(null);
    setTimeout(() => {
      // Hide reference layer for export
      const refNodes = stage.find('.__reference__');
      refNodes.forEach((n: any) => n.hide());

      const dataUrl = stage.toDataURL({ pixelRatio: 2, mimeType: 'image/png' });

      refNodes.forEach((n: any) => n.show());

      const link = document.createElement('a');
      link.download = 'logo.png';
      link.href = dataUrl;
      link.click();
      toast.success('Logo exported!');
    }, 100);
  }, []);

  const handleSaveToProject = useCallback(async () => {
    const stage = Konva.stages[0];
    if (!stage) { toast.error('Stage not found'); return; }
    if (!projectId) { toast.error('No project selected — add ?project=ID to the URL'); return; }
    if (!user?.orgId) { toast.error('Not authenticated'); return; }

    setSaving(true);
    setSelectedId(null);

    await new Promise(r => setTimeout(r, 100)); // let transformer deselect

    try {
      // Hide reference layer for export
      const refNodes = stage.find('.__reference__');
      refNodes.forEach((n: any) => n.hide());

      const dataUrl = stage.toDataURL({ pixelRatio: 2, mimeType: 'image/png' });

      refNodes.forEach((n: any) => n.show());

      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const fileName = `logo-${Date.now()}.png`;
      const path = `${user.orgId}/${projectId}/${fileName}`;

      const { error } = await supabase.storage
        .from('project-assets')
        .upload(path, blob, { contentType: 'image/png', upsert: false });

      if (error) throw error;

      const { data: signed } = await supabase.storage
        .from('project-assets')
        .createSignedUrl(path, 60 * 60 * 24 * 7);

      if (signed?.signedUrl) {
        await navigator.clipboard.writeText(signed.signedUrl).catch(() => {});
      }
      toast.success('Logo saved to project assets! Signed URL copied (valid 7 days).');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }, [projectId, user?.orgId]);

  // Handle reference image upload
  const handleRefImageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setReferenceImageUrl(reader.result as string);
      toast.success('Reference image loaded — trace over it!');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }, []);

  // Canvas scale for mobile
  const canvasScale = useMemo(() => {
    const maxWidth = Math.min(window.innerWidth - 32, 480);
    return Math.min(maxWidth / canvasSize.width, 1);
  }, [canvasSize.width]);

  const toolPanelContent = (
    <ToolPanel
      elements={elements}
      selectedId={selectedId}
      onAddText={handleAddText}
      onAddWordmark={handleAddWordmark}
      onAddShape={handleAddShape}
      onUploadImage={handleUploadImage}
      onDeleteSelected={handleDeleteSelected}
      onSelectElement={(id) => selectElement(id)}
      onUpdateElement={handleUpdateElement}
      onExport={handleExport}
      onSaveToProject={projectId ? handleSaveToProject : undefined}
      saving={saving}
      showGrid={showGrid}
      onToggleGrid={() => setShowGrid(p => !p)}
      showBaseline={showBaseline}
      onToggleBaseline={() => setShowBaseline(p => !p)}
      canvasSize={canvasSize}
      onCanvasSizeChange={setCanvasSize}
      backgroundColor={backgroundColor}
      onBackgroundChange={setBackgroundColor}
    />
  );

  return (
    <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 p-3 sm:p-6 max-w-7xl mx-auto pb-28 min-h-0">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      <input
        ref={refFileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleRefImageChange}
      />

      {/* AI Logo Generator — generate a full logo from a prompt */}
      <div className="w-full max-w-[512px]">
        <AILogoGenerator
          onSaveToCanvas={(dataUrl) => {
            const img = new window.Image();
            img.onload = () => {
              const maxDim = 300;
              const scale = Math.min(maxDim / img.width, maxDim / img.height, 1);
              const newEl: CanvasElement = {
                id: uid(),
                type: 'image',
                x: canvasSize.width / 2 - (img.width * scale) / 2,
                y: canvasSize.height / 2 - (img.height * scale) / 2,
                imageUrl: dataUrl,
                width: img.width * scale,
                height: img.height * scale,
              };
              appendElement(newEl);
              toast.success('Logo added to canvas!');
            };
            img.src = dataUrl;
          }}
          onSaveToProject={projectId ? async (dataUrl) => {
            if (!user?.orgId) { toast.error('Not authenticated'); return; }
            try {
              const res = await fetch(dataUrl);
              const blob = await res.blob();
              const fileName = `ai-logo-${Date.now()}.png`;
              const path = `${user.orgId}/${projectId}/${fileName}`;
              const { error } = await supabase.storage
                .from('project-assets')
                .upload(path, blob, { contentType: 'image/png', upsert: false });
              if (error) throw error;
              toast.success('Logo saved to project assets!');
            } catch (err: any) {
              toast.error(err.message || 'Failed to save');
            }
          } : undefined}
        />
      </div>

      {/* Canvas area */}
      <div className="flex-1 flex flex-col items-center gap-2 sm:gap-3 min-w-0">

        {/* Mobile action row — Add Text, Add Image, Upload Ref, Tools */}
        {isMobile && (
          <div className="flex items-center gap-1.5 w-full overflow-x-auto pb-1 scrollbar-none">
            <WordmarkGallery onSelect={handleAddWordmark} />
            <Button size="sm" variant="outline" onClick={handleAddText} className="h-8 gap-1 text-[11px] shrink-0">
              <Type className="h-3.5 w-3.5" /> Add Text
            </Button>
            <ShapesLibrary onSelect={handleAddShape} variant="compact" />
            <Button size="sm" variant="outline" onClick={handleUploadImage} className="h-8 gap-1 text-[11px] shrink-0">
              <Image className="h-3.5 w-3.5" /> Add Image
            </Button>
            <Button
              size="sm"
              variant={referenceImageUrl ? "default" : "outline"}
              onClick={() => referenceImageUrl ? setReferenceImageUrl(null) : refFileInputRef.current?.click()}
              className="h-8 gap-1 text-[11px] shrink-0"
            >
              <ImagePlus className="h-3.5 w-3.5" /> {referenceImageUrl ? 'Remove Ref' : 'Upload Ref'}
            </Button>
            {referenceImageUrl && (
              <>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={referenceOpacity * 100}
                  onChange={e => setReferenceOpacity(Number(e.target.value) / 100)}
                  className="w-14 h-1 accent-primary shrink-0"
                />
                <span className="text-[10px] text-muted-foreground w-6 shrink-0">{Math.round(referenceOpacity * 100)}%</span>
              </>
            )}
            <div className="ml-auto flex items-center gap-1 shrink-0">
              <Sheet open={toolsOpen} onOpenChange={setToolsOpen}>
                <SheetTrigger asChild>
                  <Button size="sm" variant="ghost" className="h-8 gap-1 text-[11px]">
                    <Settings2 className="h-3.5 w-3.5" /> More
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[300px] p-0 overflow-y-auto">
                  {toolPanelContent}
                </SheetContent>
              </Sheet>
            </div>
          </div>
        )}

        {/* Desktop toolbar row */}
        {!isMobile && (
          <div className="flex items-center gap-1 w-full justify-between">
            <div className="flex items-center gap-1">
              <Button size="sm" variant="ghost" onClick={handleUndo} disabled={!history.canUndo} className="h-8 gap-1.5 text-xs">
                <Undo2 className="h-3.5 w-3.5" /> Undo
              </Button>
              <Button size="sm" variant="ghost" onClick={handleRedo} disabled={!history.canRedo} className="h-8 gap-1.5 text-xs">
                <Redo2 className="h-3.5 w-3.5" /> Redo
              </Button>
              <span className="text-[10px] text-muted-foreground/40 ml-2">⌘Z / ⌘⇧Z</span>
            </div>
            <div className="flex items-center gap-1">
              {referenceImageUrl ? (
                <>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={referenceOpacity * 100}
                    onChange={e => setReferenceOpacity(Number(e.target.value) / 100)}
                    className="w-16 h-1 accent-primary"
                  />
                  <span className="text-[10px] text-muted-foreground w-7">{Math.round(referenceOpacity * 100)}%</span>
                  <Button size="sm" variant="ghost" onClick={() => setReferenceImageUrl(null)} className="h-8 gap-1 text-xs text-destructive/70 hover:text-destructive">
                    <X className="h-3 w-3" /> Ref
                  </Button>
                </>
              ) : (
                <Button size="sm" variant="outline" onClick={() => refFileInputRef.current?.click()} className="h-8 gap-1.5 text-xs">
                  <ImagePlus className="h-3.5 w-3.5" /> Trace
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Project context badge */}
        {projectContext.project && (
          <div className="w-full max-w-[512px] text-[10px] text-muted-foreground/60 bg-muted/20 rounded-lg px-3 py-1.5 border border-border/10">
            <span className="font-medium text-foreground/70">Project:</span> {projectContext.project.name}
            {projectContext.project.goal && <span className="ml-1">· {projectContext.project.goal}</span>}
          </div>
        )}

        {/* Brand templates */}
        <div className="w-full max-w-[512px]">
          <BrandTemplates onApply={handleApplyTemplate} />
        </div>

        {elements.length > 0 && (
          <div className="w-full max-w-[512px]">
            <div className="mb-1 text-[10px] uppercase tracking-[0.14em] text-muted-foreground/60">Layers</div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {elements.map((el, index) => {
                const label = el.type === 'text'
                  ? (el.text?.trim() || `Text ${index + 1}`)
                  : `Image ${index + 1}`;

                return (
                  <Button
                    key={el.id}
                    size="sm"
                    variant={selectedId === el.id ? 'default' : 'outline'}
                    className="h-8 shrink-0 max-w-[150px]"
                    onClick={() => selectElement(el.id)}
                  >
                    <span className="truncate text-[11px]">{label}</span>
                  </Button>
                );
              })}
            </div>
          </div>
        )}

        {/* Canvas with scaling */}
        <div
          ref={canvasContainerRef}
          className={cn("relative transition-shadow duration-500", canvasFlash && "shadow-[0_0_30px_hsl(var(--primary)/0.4)] ring-2 ring-primary/40 rounded-xl")}
          style={{
            width: canvasSize.width * canvasScale,
            height: canvasSize.height * canvasScale,
          }}
        >
          {elements.length === 0 && (
            <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center p-6 text-center">
              <div className="rounded-2xl border border-border/30 bg-background/85 px-4 py-3 shadow-lg backdrop-blur-xl">
                <p className="text-sm font-medium text-foreground">Start with a wordmark or add separate pieces</p>
                <p className="mt-1 text-xs text-muted-foreground">Use Wordmark, Add Text, Shapes, or Add Image above.</p>
              </div>
            </div>
          )}
          {isMobile && elements.length > 0 && showTapHint && !selectedId && (
            <button
              type="button"
              onClick={() => setShowTapHint(false)}
              className="absolute left-1/2 top-3 z-20 -translate-x-1/2 rounded-full border border-primary/30 bg-background/90 px-3 py-1.5 text-[11px] text-foreground shadow-lg animate-pulse"
            >
              Tap any text or image to edit it
            </button>
          )}
          <div
            style={{
              transform: `scale(${canvasScale})`,
              transformOrigin: 'top left',
            }}
          >
            <LogoCanvas
              elements={elements}
              onElementsChange={setElements}
              selectedId={selectedId}
              onSelect={selectElement}
              canvasSize={canvasSize}
              backgroundColor={backgroundColor}
              showGrid={showGrid}
              showBaseline={showBaseline}
              referenceImageUrl={referenceImageUrl}
              referenceOpacity={referenceOpacity}
            />
          </div>
        </div>

        {/* Mobile quick-edit bar — appears when element is selected */}
        {isMobile && selectedId && (() => {
          const sel = elements.find(el => el.id === selectedId);
          if (!sel) return null;
          return (
            <>
              {/* Tap-to-dismiss backdrop */}
              <div
                className="fixed inset-0 z-30"
                onClick={() => setSelectedId(null)}
                onTouchEnd={() => setSelectedId(null)}
              />
              <div className="fixed inset-x-3 bottom-24 z-40 mx-auto w-auto max-w-[512px]">
                <MobileQuickEdit
                  element={sel}
                  onUpdate={handleUpdateElement}
                  onDelete={handleDeleteSelected}
                  onClose={() => setSelectedId(null)}
                />
              </div>
            </>
          );
        })()}

        {/* Mobile undo/redo + export bar */}
        {isMobile && (
          <div className="sticky bottom-0 z-30 flex items-center gap-1 w-full max-w-[512px] justify-between rounded-t-2xl border border-border/30 bg-background/95 px-2 py-2 backdrop-blur-xl">
            <div className="flex items-center gap-1">
              <Button size="sm" variant="ghost" onClick={handleUndo} disabled={!history.canUndo} className="h-8 w-8 p-0">
                <Undo2 className="h-3.5 w-3.5" />
              </Button>
              <Button size="sm" variant="ghost" onClick={handleRedo} disabled={!history.canRedo} className="h-8 w-8 p-0">
                <Redo2 className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="flex items-center gap-1">
              <Button size="sm" variant="outline" onClick={handleExport} className="h-8 gap-1 text-[11px]">
                <Download className="h-3.5 w-3.5" /> Export
              </Button>
              {projectId && (
                <Button size="sm" variant="default" onClick={handleSaveToProject} disabled={saving} className="h-8 gap-1 text-[11px]">
                  <Save className="h-3.5 w-3.5" /> {saving ? 'Saving…' : 'Save'}
                </Button>
              )}
            </div>
          </div>
        )}

        {/* MarQ panel */}
        <div className="w-full max-w-[512px]">
          <LogoQuinnPanel
            messages={quinn.messages}
            streaming={quinn.streaming}
            onSend={quinn.send}
            onCancel={quinn.cancel}
            onClear={quinn.clearHistory}
          />
        </div>
      </div>

      {/* Desktop tool sidebar */}
      {!isMobile && (
        <div className="hidden lg:block">
          {toolPanelContent}
        </div>
      )}
    </div>
  );
}
