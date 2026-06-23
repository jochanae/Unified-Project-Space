export interface BrandVoice {
  id: string;
  org_id: string;
  created_by: string | null;
  name: string;
  description: string | null;
  elevenlabs_voice_id: string;
  sample_storage_path: string | null;
  preview_url: string | null;
  is_default: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}
