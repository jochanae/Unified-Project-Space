-- Enable realtime for tables that are missing it
ALTER PUBLICATION supabase_realtime ADD TABLE public.accounts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bills;
ALTER PUBLICATION supabase_realtime ADD TABLE public.debts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bloom_bursts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.debt_payments;