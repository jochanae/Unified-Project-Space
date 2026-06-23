import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export function useReceiptUpload() {
  const { user } = useAuth();
  const [isUploading, setIsUploading] = useState(false);

  const uploadReceipt = async (file: File): Promise<string | null> => {
    if (!user) {
      toast.error('Please sign in to upload receipts');
      return null;
    }

    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      toast.error('Please upload a valid image or PDF');
      return null;
    }

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('File must be less than 10MB');
      return null;
    }

    setIsUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { data, error } = await supabase.storage
        .from('receipts')
        .upload(filePath, file, { cacheControl: '3600', upsert: false });

      if (error) throw error;

      toast.success('Receipt uploaded!');
      return data.path;
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Failed to upload receipt');
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const selectReceipt = async (): Promise<string | null> => {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*,application/pdf';
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          const url = await uploadReceipt(file);
          resolve(url);
        } else {
          resolve(null);
        }
      };
      input.click();
    });
  };

  return { uploadReceipt, selectReceipt, isUploading };
}
