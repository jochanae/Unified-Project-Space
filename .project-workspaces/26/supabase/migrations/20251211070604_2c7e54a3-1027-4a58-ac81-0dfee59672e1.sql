-- Create learning_content table for Money Academy and KidsBloom learning
CREATE TABLE public.learning_content (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'lesson' CHECK (type IN ('lesson', 'video', 'article', 'game', 'story')),
  category TEXT NOT NULL DEFAULT 'budgeting',
  content_url TEXT,
  thumbnail_url TEXT,
  duration_minutes INTEGER,
  difficulty_level TEXT DEFAULT 'beginner' CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
  age_group TEXT DEFAULT 'all' CHECK (age_group IN ('all', 'kids', 'teens', 'adults')),
  is_premium BOOLEAN NOT NULL DEFAULT false,
  is_published BOOLEAN NOT NULL DEFAULT false,
  view_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create credit_products table for admin-managed credit product recommendations
CREATE TABLE public.credit_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  issuer TEXT NOT NULL,
  product_type TEXT NOT NULL DEFAULT 'credit_card' CHECK (product_type IN ('credit_card', 'loan', 'savings', 'mortgage', 'personal_loan')),
  apr_range TEXT,
  annual_fee NUMERIC NOT NULL DEFAULT 0,
  rewards_description TEXT,
  rating NUMERIC DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
  affiliate_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.learning_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_products ENABLE ROW LEVEL SECURITY;

-- Learning content policies - everyone can view published content
CREATE POLICY "Anyone can view published learning content"
  ON public.learning_content
  FOR SELECT
  USING (is_published = true);

-- Admins can manage learning content
CREATE POLICY "Admins can manage learning content"
  ON public.learning_content
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Credit products policies - everyone can view active products
CREATE POLICY "Anyone can view active credit products"
  ON public.credit_products
  FOR SELECT
  USING (is_active = true);

-- Admins can manage credit products
CREATE POLICY "Admins can manage credit products"
  ON public.credit_products
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create triggers for updated_at
CREATE TRIGGER update_learning_content_updated_at
  BEFORE UPDATE ON public.learning_content
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_credit_products_updated_at
  BEFORE UPDATE ON public.credit_products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some initial learning content
INSERT INTO public.learning_content (title, description, type, category, difficulty_level, age_group, is_published, view_count) VALUES
('Introduction to Budgeting', 'Learn the basics of creating and maintaining a budget', 'lesson', 'budgeting', 'beginner', 'all', true, 1234),
('Understanding Credit Scores', 'A comprehensive guide to credit scores and how they work', 'video', 'credit', 'beginner', 'adults', true, 892),
('Investing 101', 'Get started with investing fundamentals', 'article', 'investing', 'intermediate', 'adults', false, 0),
('Debt Payoff Strategies', 'Learn proven methods to pay off debt faster', 'lesson', 'debt', 'intermediate', 'all', true, 567),
('Emergency Fund Basics', 'Why you need an emergency fund and how to build one', 'video', 'saving', 'beginner', 'all', true, 445),
('Piggy Bank Adventures', 'Fun story about saving money', 'story', 'saving', 'beginner', 'kids', true, 320),
('Coin Sorting Game', 'Learn to identify and count coins', 'game', 'money basics', 'beginner', 'kids', true, 890);

-- Insert some initial credit products
INSERT INTO public.credit_products (name, issuer, product_type, apr_range, annual_fee, rewards_description, rating, is_active, is_featured, display_order) VALUES
('Cash Rewards Plus', 'Chase', 'credit_card', '18.99% - 26.99%', 0, '3% cash back on all purchases', 4.5, true, true, 1),
('Travel Elite Card', 'American Express', 'credit_card', '19.99% - 28.99%', 95, '5x points on travel and dining', 4.8, true, true, 2),
('Personal Loan Pro', 'SoFi', 'personal_loan', '8.99% - 25.99%', 0, 'No origination fee, flexible terms', 4.2, true, false, 3),
('High Yield Savings', 'Marcus', 'savings', '4.50% APY', 0, 'No minimum deposit, no monthly fees', 4.6, true, true, 4),
('Student Card', 'Discover', 'credit_card', '18.24% - 27.24%', 0, 'Cash back on good grades', 4.0, false, false, 5);