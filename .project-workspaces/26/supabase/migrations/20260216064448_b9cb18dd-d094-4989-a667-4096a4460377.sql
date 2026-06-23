
-- Payroll details table for detailed income breakdown
CREATE TABLE public.payroll_details (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  gross_pay NUMERIC NOT NULL DEFAULT 0,
  federal_tax NUMERIC NOT NULL DEFAULT 0,
  state_tax NUMERIC NOT NULL DEFAULT 0,
  local_tax NUMERIC NOT NULL DEFAULT 0,
  social_security NUMERIC NOT NULL DEFAULT 0,
  medicare NUMERIC NOT NULL DEFAULT 0,
  retirement_401k NUMERIC NOT NULL DEFAULT 0,
  health_insurance NUMERIC NOT NULL DEFAULT 0,
  dental_insurance NUMERIC NOT NULL DEFAULT 0,
  vision_insurance NUMERIC NOT NULL DEFAULT 0,
  hsa NUMERIC NOT NULL DEFAULT 0,
  fsa NUMERIC NOT NULL DEFAULT 0,
  life_insurance NUMERIC NOT NULL DEFAULT 0,
  disability_insurance NUMERIC NOT NULL DEFAULT 0,
  union_dues NUMERIC NOT NULL DEFAULT 0,
  other_deductions NUMERIC NOT NULL DEFAULT 0,
  other_deductions_label TEXT,
  net_pay NUMERIC NOT NULL DEFAULT 0,
  pay_period TEXT CHECK (pay_period IN ('weekly', 'biweekly', 'semimonthly', 'monthly')),
  employer_name TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payroll_details ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own payroll details"
  ON public.payroll_details FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own payroll details"
  ON public.payroll_details FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own payroll details"
  ON public.payroll_details FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own payroll details"
  ON public.payroll_details FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_payroll_details_updated_at
  BEFORE UPDATE ON public.payroll_details
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
