import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { FolderOpen, Info } from 'lucide-react';
import { PageBlock } from '@/types/funnelhub';
import { AssetPickerDialog } from './AssetPickerDialog';

export function BlockField({ fieldKey, initialValue, block, onUpdate, projectId }: {
  fieldKey: string;
  initialValue: string;
  block: PageBlock;
  onUpdate: (content: Record<string, string>) => void;
  projectId?: string;
}) {
  const [localVal, setLocalVal] = useState(initialValue);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const [useTextarea] = useState(() => initialValue.length > 60);
  const [showAssetPicker, setShowAssetPicker] = useState(false);

  useEffect(() => {
    setLocalVal(initialValue);
  }, [initialValue]);

  const handleChange = (val: string) => {
    setLocalVal(val);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      onUpdate({ ...block.content, [fieldKey]: val });
    }, 300);
  };

  const handleBlur = () => {
    clearTimeout(timerRef.current);
    onUpdate({ ...block.content, [fieldKey]: localVal });
  };

  const isMediaUrl = (block.type === 'video' || block.type === 'audio') && fieldKey === 'url';
  const isImageUrl = block.type === 'image' && fieldKey === 'url';
  const isAssetPickable = isImageUrl || isMediaUrl;
  const hintText = block.type === 'video'
    ? 'Supported: YouTube, Vimeo, or direct .mp4 URL'
    : block.type === 'audio'
    ? 'Supported: direct .mp3 or audio file URL'
    : 'Paste a URL or browse your assets';

  return (
    <div>
      <div className="flex items-center gap-1">
        <label className="text-xs text-muted-foreground capitalize">{fieldKey.replace(/([A-Z])/g, ' $1')}</label>
        {(isMediaUrl || isImageUrl) && (
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3 w-3 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[220px] text-xs">
                {hintText}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      <div className="flex gap-1.5">
        <div className="flex-1">
          {useTextarea ? (
            <Textarea value={localVal} onChange={e => handleChange(e.target.value)} onBlur={handleBlur} onFocus={e => e.currentTarget.select()} rows={2} className="text-sm" placeholder={isAssetPickable ? hintText : undefined} />
          ) : (
            <Input value={localVal} onChange={e => handleChange(e.target.value)} onBlur={handleBlur} onFocus={e => e.currentTarget.select()} className="text-sm" placeholder={isAssetPickable ? hintText : undefined} />
          )}
        </div>
        {isAssetPickable && projectId && (
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="h-9 w-9 shrink-0"
            title="Browse project assets"
            onClick={() => setShowAssetPicker(true)}
          >
            <FolderOpen className="h-4 w-4" />
          </Button>
        )}
      </div>
      {isImageUrl && localVal && localVal.startsWith('http') && (
        <img src={localVal} alt="preview" className="mt-1.5 rounded border border-border h-16 object-cover" />
      )}
      {showAssetPicker && projectId && (
        <AssetPickerDialog
          open={showAssetPicker}
          onOpenChange={setShowAssetPicker}
          projectId={projectId}
          onSelect={(url) => { handleChange(url); }}
        />
      )}
    </div>
  );
}
