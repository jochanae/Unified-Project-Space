-- Create professional reviews table
CREATE TABLE public.professional_reviews (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  professional_id uuid NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(professional_id, user_id)
);

-- Enable RLS
ALTER TABLE public.professional_reviews ENABLE ROW LEVEL SECURITY;

-- Anyone can view reviews
CREATE POLICY "Anyone can view professional reviews"
  ON public.professional_reviews
  FOR SELECT
  USING (true);

-- Authenticated users can create their own reviews
CREATE POLICY "Users can create their own reviews"
  ON public.professional_reviews
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own reviews
CREATE POLICY "Users can update their own reviews"
  ON public.professional_reviews
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own reviews
CREATE POLICY "Users can delete their own reviews"
  ON public.professional_reviews
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_professional_reviews_updated_at
  BEFORE UPDATE ON public.professional_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to update professional rating
CREATE OR REPLACE FUNCTION public.update_professional_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE public.professionals
    SET 
      rating = (SELECT COALESCE(AVG(rating)::numeric, 0) FROM public.professional_reviews WHERE professional_id = OLD.professional_id),
      review_count = (SELECT COUNT(*) FROM public.professional_reviews WHERE professional_id = OLD.professional_id)
    WHERE id = OLD.professional_id;
    RETURN OLD;
  ELSE
    UPDATE public.professionals
    SET 
      rating = (SELECT COALESCE(AVG(rating)::numeric, 0) FROM public.professional_reviews WHERE professional_id = NEW.professional_id),
      review_count = (SELECT COUNT(*) FROM public.professional_reviews WHERE professional_id = NEW.professional_id)
    WHERE id = NEW.professional_id;
    RETURN NEW;
  END IF;
END;
$$;

-- Create trigger to auto-update ratings
CREATE TRIGGER update_professional_rating_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.professional_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_professional_rating();