-- Add missing lesson categories for Futures, Forex, Crypto, and Bonds
INSERT INTO lesson_categories (name, slug, icon, description, sort_order) VALUES
  ('Futures Trading', 'futures', '📈', 'Learn to trade futures contracts across various markets', 9),
  ('Forex Trading', 'forex', '💱', 'Currency trading strategies and forex market analysis', 10),
  ('Cryptocurrency', 'crypto', '₿', 'Digital asset trading strategies and blockchain fundamentals', 11),
  ('Bond Investing', 'bonds', '📜', 'Fixed income strategies and bond market dynamics', 12);