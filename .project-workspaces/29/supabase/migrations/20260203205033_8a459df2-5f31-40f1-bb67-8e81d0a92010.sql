-- Create 0DTE Strategies lesson category
INSERT INTO public.lesson_categories (name, slug, description, icon, color, sort_order)
VALUES (
  '0DTE Strategies',
  '0dte',
  'Zero Days to Expiration options trading strategies for same-day expiration trades',
  '⚡',
  'hsl(45, 100%, 50%)',
  5
);

-- Get the category ID for the 0DTE category
DO $$
DECLARE
  category_uuid UUID;
BEGIN
  SELECT id INTO category_uuid FROM public.lesson_categories WHERE slug = '0dte';
  
  -- Insert 0DTE lessons
  INSERT INTO public.lessons (title, slug, description, content, difficulty, duration_minutes, category_id, key_takeaways, sort_order, status)
  VALUES
  (
    '0DTE Basics',
    '0dte-basics',
    'Understanding zero days to expiration options - what they are, why they move fast, and the unique characteristics of same-day expiration trading.',
    '<h2>What are 0DTE Options?</h2>
<p>0DTE (Zero Days to Expiration) options are contracts that expire on the same day they are traded. These have become increasingly popular, especially on major indices like SPX, SPY, and QQQ.</p>

<h3>Key Characteristics</h3>
<ul>
<li><strong>Rapid Time Decay:</strong> Theta accelerates dramatically as expiration approaches</li>
<li><strong>High Gamma:</strong> Price movements can cause rapid changes in delta</li>
<li><strong>Lower Premium:</strong> Less time value means lower absolute cost</li>
<li><strong>Quick Resolution:</strong> Trades resolve by end of day</li>
</ul>

<h3>Why Traders Use 0DTE</h3>
<p>The appeal of 0DTE options includes the ability to capitalize on intraday moves without overnight risk, collect premium that decays rapidly, and trade with defined risk on major market indices.</p>

<h3>Available Products</h3>
<p>SPX options now have daily expirations (Monday through Friday), making 0DTE trading possible every market day. SPY and QQQ also offer frequent expirations.</p>',
    'beginner',
    15,
    category_uuid,
    ARRAY['0DTE options expire the same day they are traded', 'Theta decay accelerates dramatically near expiration', 'High gamma means rapid delta changes', 'SPX, SPY, and QQQ are popular 0DTE instruments', 'Lower premiums but higher percentage risk'],
    1,
    'published'
  ),
  (
    '0DTE Credit Spreads',
    '0dte-credit-spreads',
    'Learn to sell premium on expiration day using credit spreads - collecting income from rapid theta decay while maintaining defined risk.',
    '<h2>Selling Premium on Expiration Day</h2>
<p>0DTE credit spreads allow traders to collect premium from options that will expire worthless if price stays within a defined range.</p>

<h3>Bull Put Spreads (Bullish)</h3>
<p>Sell a put, buy a lower strike put. You profit if the underlying stays above your short strike.</p>

<h3>Bear Call Spreads (Bearish)</h3>
<p>Sell a call, buy a higher strike call. You profit if the underlying stays below your short strike.</p>

<h3>Iron Condors (Neutral)</h3>
<p>Combine both spreads to profit from the underlying staying in a range. This is popular for 0DTE as you collect premium from both sides.</p>

<h3>Strike Selection</h3>
<ul>
<li><strong>Delta-based:</strong> Sell options at 10-15 delta for higher probability</li>
<li><strong>Technical levels:</strong> Use support/resistance for strike placement</li>
<li><strong>Expected move:</strong> Stay outside the expected daily range</li>
</ul>

<h3>Key Considerations</h3>
<p>Premium collection is smaller but decay is faster. Risk/reward ratios are often unfavorable, so position sizing is critical.</p>',
    'intermediate',
    20,
    category_uuid,
    ARRAY['Credit spreads collect premium from theta decay', 'Bull put spreads profit when price stays above short strike', 'Bear call spreads profit when price stays below short strike', 'Iron condors profit from range-bound movement', 'Strike selection should consider delta and technical levels'],
    2,
    'published'
  ),
  (
    '0DTE Directional Plays',
    '0dte-directional',
    'Using 0DTE options for quick directional trades - buying calls or puts to capitalize on intraday market moves with leverage.',
    '<h2>Trading Direction on Expiration Day</h2>
<p>Buying 0DTE options allows traders to take leveraged directional positions with limited risk and quick resolution.</p>

<h3>When to Use Long 0DTE</h3>
<ul>
<li><strong>High-conviction moves:</strong> Economic data releases, Fed announcements</li>
<li><strong>Technical breakouts:</strong> Breaking key support/resistance levels</li>
<li><strong>Momentum plays:</strong> Strong trending days</li>
</ul>

<h3>Strike Selection for Longs</h3>
<p><strong>ATM (At-The-Money):</strong> Highest delta, most responsive to moves, but more expensive</p>
<p><strong>OTM (Out-of-The-Money):</strong> Cheaper, but needs larger move to profit</p>
<p><strong>ITM (In-The-Money):</strong> Less leverage but more forgiving</p>

<h3>The Greeks in 0DTE</h3>
<ul>
<li><strong>Delta:</strong> Changes rapidly (high gamma)</li>
<li><strong>Theta:</strong> Working against you aggressively</li>
<li><strong>Vega:</strong> Less relevant with no time for IV changes</li>
</ul>

<h3>Exit Strategies</h3>
<p>Have predetermined profit targets and stop losses. Time-based exits are also important - dont hold through the final hours if youre underwater.</p>',
    'intermediate',
    18,
    category_uuid,
    ARRAY['Long 0DTE options offer leveraged directional exposure', 'ATM options have highest delta but cost more', 'OTM options are cheaper but need larger moves', 'High gamma means delta changes rapidly', 'Always have predetermined exit strategies'],
    3,
    'published'
  ),
  (
    '0DTE Risk Management',
    '0dte-risk-management',
    'Critical risk management principles for 0DTE trading - position sizing, stop losses, and avoiding the common pitfalls that blow up accounts.',
    '<h2>Protecting Your Capital in 0DTE</h2>
<p>0DTE trading can generate quick profits but can also cause rapid losses. Proper risk management is essential for long-term survival.</p>

<h3>Position Sizing Rules</h3>
<ul>
<li><strong>Maximum per trade:</strong> Never risk more than 1-2% of account per trade</li>
<li><strong>Daily loss limit:</strong> Stop trading after losing 3-5% in a day</li>
<li><strong>Scaling:</strong> Use smaller positions until consistently profitable</li>
</ul>

<h3>Common Pitfalls to Avoid</h3>
<p><strong>Revenge Trading:</strong> Trying to make back losses with bigger positions</p>
<p><strong>Averaging Down:</strong> Adding to losing positions rarely works in 0DTE</p>
<p><strong>Overconfidence:</strong> A few wins dont mean the strategy is foolproof</p>
<p><strong>Ignoring Gamma Risk:</strong> Positions can move against you very fast</p>

<h3>Stop Loss Strategies</h3>
<ul>
<li><strong>Percentage-based:</strong> Exit at 50% loss on premium paid</li>
<li><strong>Technical-based:</strong> Exit when key levels break</li>
<li><strong>Time-based:</strong> Exit by a certain time if thesis hasnt played out</li>
</ul>

<h3>The Mental Game</h3>
<p>0DTE requires emotional discipline. Accept that many trades will be losers. Focus on process over individual outcomes. Take breaks after losses.</p>',
    'advanced',
    22,
    category_uuid,
    ARRAY['Never risk more than 1-2% of account per 0DTE trade', 'Set daily loss limits and stick to them', 'Avoid revenge trading and averaging down', 'Use percentage, technical, or time-based stop losses', 'Emotional discipline is crucial for 0DTE success'],
    4,
    'published'
  );
END $$;