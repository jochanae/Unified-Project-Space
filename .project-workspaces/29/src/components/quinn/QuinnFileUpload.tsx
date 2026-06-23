import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Paperclip, X, FileImage, FileText as FileIcon } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export interface UploadedFile {
  id: string;
  file: File;
  preview?: string;
  type: 'image' | 'document';
}

interface QuinnFileUploadProps {
  files: UploadedFile[];
  onFilesChange: (files: UploadedFile[]) => void;
  disabled?: boolean; showPreview?: boolean;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_FILES = 10;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_DOC_TYPES = ['application/pdf', 'text/plain', 'text/csv'];

export function QuinnFileUpload({ files, onFilesChange, disabled, showPreview = true }: QuinnFileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    
    const validFiles: UploadedFile[] = [];
    
    for (const file of selectedFiles) {
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name} is too large. Max size is 5MB.`);
        continue;
      }

      const isImage = ALLOWED_IMAGE_TYPES.includes(file.type);
      const isDoc = ALLOWED_DOC_TYPES.includes(file.type);

      if (!isImage && !isDoc) {
        toast.error(`${file.name} is not a supported file type.`);
        continue;
      }

      const uploadedFile: UploadedFile = {
        id: crypto.randomUUID(),
        file,
        type: isImage ? 'image' : 'document',
      };

      // Create preview for images
      if (isImage) {
        uploadedFile.preview = URL.createObjectURL(file);
      }

      validFiles.push(uploadedFile);
    }

    if (validFiles.length > 0) {
      const combined = [...files, ...validFiles].slice(0, MAX_FILES);
      onFilesChange(combined);
      const dropped = files.length + validFiles.length - combined.length;
      if (dropped > 0) {
        toast.info(`Only ${MAX_FILES} files allowed. ${dropped} file(s) were not added.`);
      }
    }

    // Reset input
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const removeFile = (id: string) => {
    const file = files.find((f) => f.id === id);
    if (file?.preview) {
      URL.revokeObjectURL(file.preview);
    }
    onFilesChange(files.filter((f) => f.id !== id));
  };

  return (
    <div className="flex items-center gap-2">
      <input
        ref={inputRef}
        type="file"
        accept={[...ALLOWED_IMAGE_TYPES, ...ALLOWED_DOC_TYPES].join(',')}
        onChange={handleFileSelect}
        className="hidden"
        multiple
        disabled={disabled || files.length >= MAX_FILES}
      />
      
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => inputRef.current?.click()}
        disabled={disabled || files.length >= MAX_FILES}
        title="Attach files (images, PDFs) — up to 10"
        className="shrink-0"
      >
        <Paperclip className="h-4 w-4" />
      </Button>

      {showPreview && files.length > 0 && (
        <div className="flex gap-2 overflow-x-auto">
          {files.map((file) => (
            <div
              key={file.id}
              className={cn(
                'relative flex items-center gap-2 rounded-lg border border-border/50 bg-muted/50 px-2 py-1',
                'group'
              )}
            >
              {file.type === 'image' && file.preview ? (
                <img
                  src={file.preview}
                  alt={file.file.name}
                  className="h-8 w-8 rounded object-cover"
                />
              ) : (
                <FileIcon className="h-5 w-5 text-muted-foreground" />
              )}
              <span className="max-w-[100px] truncate text-xs text-muted-foreground">
                {file.file.name}
              </span>
              <button
                type="button"
                onClick={() => removeFile(file.id)}
                className="absolute -right-1 -top-1 rounded-full bg-destructive p-0.5 opacity-0 transition-opacity group-hover:opacity-100"
              >
                <X className="h-3 w-3 text-destructive-foreground" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Utility to convert file to base64 for API
export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data URL prefix to get just the base64
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
