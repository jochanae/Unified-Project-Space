-- Add partner_id to events table for partner-specific events
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS partner_id uuid REFERENCES public.partners(id) ON DELETE SET NULL;

-- Add partner_id to learning_content table for partner-specific content  
ALTER TABLE public.learning_content ADD COLUMN IF NOT EXISTS partner_id uuid REFERENCES public.partners(id) ON DELETE SET NULL;

-- Create indexes for efficient partner filtering
CREATE INDEX IF NOT EXISTS idx_events_partner_id ON public.events(partner_id);
CREATE INDEX IF NOT EXISTS idx_learning_content_partner_id ON public.learning_content(partner_id);