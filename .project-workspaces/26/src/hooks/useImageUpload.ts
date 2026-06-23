import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useImageUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // Cache user ID at start of upload to prevent re-render issues
  const userIdRef = useRef<string | null>(null);

  const uploadImage = useCallback(async (file: File): Promise<string | null> => {
    // Get current session directly instead of relying on context
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      toast.error('Please sign in to upload images');
      return null;
    }
    
    // Store user ID in ref to prevent issues during async operations
    userIdRef.current = session.user.id;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error('Please upload a valid image (JPEG, PNG, GIF, or WebP)');
      return null;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('Image must be less than 5MB');
      return null;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${userIdRef.current}/${fileName}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('vision-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) throw error;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('vision-images')
        .getPublicUrl(data.path);

      setUploadProgress(100);
      toast.success('Image uploaded successfully!');
      
      return urlData.publicUrl;
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Failed to upload image');
      return null;
    } finally {
      setIsUploading(false);
    }
  }, []);

  const captureFromCamera = async (): Promise<string | null> => {
    // Check if we're on a mobile device that supports camera
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    // Try to access camera directly via MediaDevices API for better mobile support
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia && isMobile) {
      try {
        // Request camera permission first to ensure we have access
        await navigator.mediaDevices.getUserMedia({ video: true });
      } catch (permissionError) {
        console.log('Camera permission check:', permissionError);
        // Continue anyway - the file input may still work
      }
    }
    
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.capture = 'environment'; // Use rear camera
      input.style.display = 'none';
      document.body.appendChild(input);
      
      const cleanup = () => {
        document.body.removeChild(input);
      };
      
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        cleanup();
        if (file) {
          const url = await uploadImage(file);
          resolve(url);
        } else {
          resolve(null);
        }
      };
      
      // Handle cancel
      input.oncancel = () => {
        cleanup();
        resolve(null);
      };
      
      // Fallback timeout for devices that don't fire cancel event
      const timeoutId = setTimeout(() => {
        if (document.body.contains(input)) {
          cleanup();
        }
      }, 60000);
      
      input.onclick = () => {
        clearTimeout(timeoutId);
      };
      
      input.click();
    });
  };

  const selectFromGallery = async (): Promise<string | null> => {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          const url = await uploadImage(file);
          resolve(url);
        } else {
          resolve(null);
        }
      };
      
      input.click();
    });
  };

  return {
    uploadImage,
    captureFromCamera,
    selectFromGallery,
    isUploading,
    uploadProgress,
  };
}
