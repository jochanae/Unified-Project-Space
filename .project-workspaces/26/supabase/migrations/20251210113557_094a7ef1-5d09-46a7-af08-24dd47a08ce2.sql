-- Create bill_category enum
CREATE TYPE public.bill_category AS ENUM (
  'utilities',
  'subscriptions',
  'insurance',
  'rent',
  'phone',
  'internet',
  'streaming',
  'gym',
  'transportation',
  'loans',
  'credit_card',
  'other'
);

-- Create bill_status enum
CREATE TYPE public.bill_status AS ENUM (
  'pending',
  'paid',
  'overdue',
  'cancelled'
);

-- Create bill_frequency enum
CREATE TYPE public.bill_frequency AS ENUM (
  'one_time',
  'weekly',
  'biweekly',
  'monthly',
  'quarterly',
  'semi_annual',
  'annual'
);

-- Create bills table
CREATE TABLE public.bills (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  category bill_category NOT NULL DEFAULT 'other',
  due_date DATE NOT NULL,
  frequency bill_frequency NOT NULL DEFAULT 'monthly',
  is_recurring BOOLEAN NOT NULL DEFAULT true,
  is_autopay BOOLEAN NOT NULL DEFAULT false,
  reminder_enabled BOOLEAN NOT NULL DEFAULT true,
  reminder_days_before INTEGER NOT NULL DEFAULT 3,
  status bill_status NOT NULL DEFAULT 'pending',
  notes TEXT,
  last_paid_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create bill_payments table to track payment history
CREATE TABLE public.bill_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bill_id UUID NOT NULL REFERENCES public.bills(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  paid_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT,
  notes TEXT,
  linked_transaction_id UUID, -- For future transaction linking
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on bills
ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;

-- Enable RLS on bill_payments
ALTER TABLE public.bill_payments ENABLE ROW LEVEL SECURITY;

-- Bills RLS policies
CREATE POLICY "Users can view their own bills" 
ON public.bills 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own bills" 
ON public.bills 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bills" 
ON public.bills 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bills" 
ON public.bills 
FOR DELETE 
USING (auth.uid() = user_id);

-- Bill payments RLS policies
CREATE POLICY "Users can view their own bill payments" 
ON public.bill_payments 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own bill payments" 
ON public.bill_payments 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bill payments" 
ON public.bill_payments 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for updating updated_at
CREATE TRIGGER update_bills_updated_at
BEFORE UPDATE ON public.bills
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();