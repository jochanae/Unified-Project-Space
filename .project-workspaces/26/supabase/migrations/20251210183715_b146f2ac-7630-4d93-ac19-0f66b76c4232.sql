-- Insurance Policies table
CREATE TABLE public.insurance_policies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  policy_type TEXT NOT NULL DEFAULT 'auto',
  provider TEXT,
  policy_number TEXT,
  premium_amount NUMERIC NOT NULL DEFAULT 0,
  premium_frequency TEXT NOT NULL DEFAULT 'monthly',
  coverage_amount NUMERIC,
  deductible NUMERIC,
  start_date DATE,
  end_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Business Expenses table
CREATE TABLE public.business_expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'other',
  amount NUMERIC NOT NULL DEFAULT 0,
  is_deductible BOOLEAN NOT NULL DEFAULT true,
  receipt_url TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Charitable Donations table
CREATE TABLE public.charitable_donations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  donation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  organization TEXT NOT NULL,
  donation_type TEXT NOT NULL DEFAULT 'cash',
  amount NUMERIC NOT NULL DEFAULT 0,
  is_tax_eligible BOOLEAN NOT NULL DEFAULT true,
  receipt_url TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tax Deductions table
CREATE TABLE public.tax_deductions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  tax_year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
  medical_expenses NUMERIC NOT NULL DEFAULT 0,
  mortgage_interest NUMERIC NOT NULL DEFAULT 0,
  state_local_taxes NUMERIC NOT NULL DEFAULT 0,
  education_expenses NUMERIC NOT NULL DEFAULT 0,
  retirement_contributions NUMERIC NOT NULL DEFAULT 0,
  hsa_contributions NUMERIC NOT NULL DEFAULT 0,
  other_deductions NUMERIC NOT NULL DEFAULT 0,
  gross_income NUMERIC NOT NULL DEFAULT 0,
  filing_status TEXT NOT NULL DEFAULT 'single',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, tax_year)
);

-- Tax Documents table
CREATE TABLE public.tax_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  tax_year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
  document_type TEXT NOT NULL DEFAULT 'other',
  name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.insurance_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.charitable_donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_deductions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_documents ENABLE ROW LEVEL SECURITY;

-- Insurance Policies RLS
CREATE POLICY "Users can view their own insurance policies" ON public.insurance_policies FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own insurance policies" ON public.insurance_policies FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own insurance policies" ON public.insurance_policies FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own insurance policies" ON public.insurance_policies FOR DELETE USING (auth.uid() = user_id);

-- Business Expenses RLS
CREATE POLICY "Users can view their own business expenses" ON public.business_expenses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own business expenses" ON public.business_expenses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own business expenses" ON public.business_expenses FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own business expenses" ON public.business_expenses FOR DELETE USING (auth.uid() = user_id);

-- Charitable Donations RLS
CREATE POLICY "Users can view their own charitable donations" ON public.charitable_donations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own charitable donations" ON public.charitable_donations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own charitable donations" ON public.charitable_donations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own charitable donations" ON public.charitable_donations FOR DELETE USING (auth.uid() = user_id);

-- Tax Deductions RLS
CREATE POLICY "Users can view their own tax deductions" ON public.tax_deductions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own tax deductions" ON public.tax_deductions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own tax deductions" ON public.tax_deductions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own tax deductions" ON public.tax_deductions FOR DELETE USING (auth.uid() = user_id);

-- Tax Documents RLS
CREATE POLICY "Users can view their own tax documents" ON public.tax_documents FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own tax documents" ON public.tax_documents FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own tax documents" ON public.tax_documents FOR DELETE USING (auth.uid() = user_id);

-- Create storage bucket for tax documents
INSERT INTO storage.buckets (id, name, public) VALUES ('tax-documents', 'tax-documents', false);

-- Tax documents storage policies
CREATE POLICY "Users can view their own tax documents" ON storage.objects FOR SELECT USING (bucket_id = 'tax-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can upload their own tax documents" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'tax-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete their own tax documents" ON storage.objects FOR DELETE USING (bucket_id = 'tax-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Triggers for updated_at
CREATE TRIGGER update_insurance_policies_updated_at BEFORE UPDATE ON public.insurance_policies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_business_expenses_updated_at BEFORE UPDATE ON public.business_expenses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_charitable_donations_updated_at BEFORE UPDATE ON public.charitable_donations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_tax_deductions_updated_at BEFORE UPDATE ON public.tax_deductions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();