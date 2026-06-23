export interface GlossaryTerm {
  term: string;
  definition: string;
  category: 'basics' | 'options' | 'technical' | 'fundamental' | 'strategies' | 'risk';
  relatedTerms?: string[];
}

export const tradingGlossary: GlossaryTerm[] = [
  // Basics
  {
    term: 'Stock',
    definition: 'A share of ownership in a company. When you buy a stock, you become a partial owner of that company and may receive dividends and voting rights.',
    category: 'basics',
    relatedTerms: ['Dividend', 'Market Cap', 'Share'],
  },
  {
    term: 'ETF',
    definition: 'Exchange-Traded Fund. A basket of securities (stocks, bonds, commodities) that trades on an exchange like a single stock. Offers diversification with lower costs than mutual funds.',
    category: 'basics',
    relatedTerms: ['Mutual Fund', 'Index Fund', 'Diversification'],
  },
  {
    term: 'Dividend',
    definition: 'A portion of a company\'s profits paid to shareholders, usually quarterly. Expressed as a dollar amount per share or as a yield percentage.',
    category: 'basics',
    relatedTerms: ['Yield', 'Ex-Dividend Date', 'Payout Ratio'],
  },
  {
    term: 'Market Cap',
    definition: 'Market Capitalization. The total value of a company\'s outstanding shares (share price × total shares). Used to classify companies as small-cap, mid-cap, or large-cap.',
    category: 'basics',
  },
  {
    term: 'Bull Market',
    definition: 'A market condition where prices are rising or expected to rise. Characterized by optimism, investor confidence, and expectations of strong results.',
    category: 'basics',
    relatedTerms: ['Bear Market', 'Rally', 'Correction'],
  },
  {
    term: 'Bear Market',
    definition: 'A market condition where prices are falling or expected to fall, typically defined as a 20% or more decline from recent highs.',
    category: 'basics',
    relatedTerms: ['Bull Market', 'Recession', 'Correction'],
  },
  {
    term: 'Volume',
    definition: 'The number of shares or contracts traded during a specific period. High volume often indicates strong interest and can confirm price trends.',
    category: 'basics',
    relatedTerms: ['Liquidity', 'Average Volume', 'Volume Profile'],
  },
  {
    term: 'Bid/Ask Spread',
    definition: 'The difference between the highest price a buyer will pay (bid) and the lowest price a seller will accept (ask). Tighter spreads indicate more liquidity.',
    category: 'basics',
    relatedTerms: ['Liquidity', 'Market Maker', 'Slippage'],
  },
  {
    term: 'Broker',
    definition: 'A firm or individual that executes buy and sell orders on behalf of investors. Online brokers provide platforms for self-directed trading.',
    category: 'basics',
  },
  {
    term: 'Portfolio',
    definition: 'A collection of investments owned by an individual or organization. Diversified portfolios spread risk across different assets.',
    category: 'basics',
    relatedTerms: ['Diversification', 'Asset Allocation', 'Rebalancing'],
  },

  // Options
  {
    term: 'Call Option',
    definition: 'A contract giving the buyer the right (not obligation) to buy 100 shares of a stock at a specific price (strike) before expiration. Profits when the stock rises.',
    category: 'options',
    relatedTerms: ['Put Option', 'Strike Price', 'Premium'],
  },
  {
    term: 'Put Option',
    definition: 'A contract giving the buyer the right (not obligation) to sell 100 shares of a stock at a specific price (strike) before expiration. Profits when the stock falls.',
    category: 'options',
    relatedTerms: ['Call Option', 'Strike Price', 'Premium'],
  },
  {
    term: 'Strike Price',
    definition: 'The price at which an option can be exercised. For calls, it\'s the price you can buy the stock. For puts, it\'s the price you can sell.',
    category: 'options',
    relatedTerms: ['In The Money', 'Out of The Money', 'At The Money'],
  },
  {
    term: 'Premium',
    definition: 'The price paid to purchase an option contract. Represents the option\'s current market value and is the maximum loss for option buyers.',
    category: 'options',
    relatedTerms: ['Intrinsic Value', 'Extrinsic Value', 'Time Value'],
  },
  {
    term: 'Expiration Date',
    definition: 'The date when an option contract becomes void. After this date, the option can no longer be exercised.',
    category: 'options',
    relatedTerms: ['Time Decay', 'Theta', 'Weekly Options'],
  },
  {
    term: 'In The Money (ITM)',
    definition: 'An option with intrinsic value. A call is ITM when the stock price is above the strike. A put is ITM when the stock is below the strike.',
    category: 'options',
    relatedTerms: ['Out of The Money', 'At The Money', 'Intrinsic Value'],
  },
  {
    term: 'Out of The Money (OTM)',
    definition: 'An option with no intrinsic value. A call is OTM when the stock price is below the strike. A put is OTM when the stock is above the strike.',
    category: 'options',
    relatedTerms: ['In The Money', 'At The Money', 'Extrinsic Value'],
  },
  {
    term: 'Implied Volatility (IV)',
    definition: 'The market\'s forecast of likely movement in a stock\'s price. Higher IV means higher option prices. Often spikes before earnings or major events.',
    category: 'options',
    relatedTerms: ['Historical Volatility', 'IV Crush', 'Vega'],
  },
  {
    term: 'Delta',
    definition: 'Measures how much an option\'s price changes for every $1 move in the underlying stock. Also represents the probability of finishing in-the-money.',
    category: 'options',
    relatedTerms: ['Gamma', 'Greeks', 'Hedge Ratio'],
  },
  {
    term: 'Theta',
    definition: 'Time decay. Measures how much an option loses in value each day as it approaches expiration. Option sellers benefit from theta.',
    category: 'options',
    relatedTerms: ['Time Value', 'Delta', 'Greeks'],
  },
  {
    term: 'Gamma',
    definition: 'Measures the rate of change in delta for every $1 move in the underlying stock. Highest for at-the-money options near expiration.',
    category: 'options',
    relatedTerms: ['Delta', 'Greeks', 'Gamma Risk'],
  },
  {
    term: 'Vega',
    definition: 'Measures how much an option\'s price changes for every 1% change in implied volatility. Long options benefit from rising IV.',
    category: 'options',
    relatedTerms: ['Implied Volatility', 'Greeks', 'IV Crush'],
  },
  {
    term: 'IV Crush',
    definition: 'A sharp drop in implied volatility after an anticipated event (like earnings). Can cause option prices to fall even if the stock moves in the expected direction.',
    category: 'options',
    relatedTerms: ['Implied Volatility', 'Vega', 'Earnings'],
  },
  {
    term: 'Assignment',
    definition: 'When an option seller is required to fulfill their obligation—buying (put) or selling (call) shares at the strike price when the buyer exercises.',
    category: 'options',
    relatedTerms: ['Exercise', 'Early Assignment', 'Pin Risk'],
  },

  // Technical Analysis
  {
    term: 'Support',
    definition: 'A price level where buying pressure is strong enough to prevent the price from falling further. Acts as a "floor" for the stock price.',
    category: 'technical',
    relatedTerms: ['Resistance', 'Breakout', 'Breakdown'],
  },
  {
    term: 'Resistance',
    definition: 'A price level where selling pressure is strong enough to prevent the price from rising further. Acts as a "ceiling" for the stock price.',
    category: 'technical',
    relatedTerms: ['Support', 'Breakout', 'Pullback'],
  },
  {
    term: 'Moving Average',
    definition: 'A trend indicator that smooths price data by averaging prices over a period (e.g., 50-day, 200-day). Used to identify trend direction and support/resistance.',
    category: 'technical',
    relatedTerms: ['SMA', 'EMA', 'Golden Cross'],
  },
  {
    term: 'RSI',
    definition: 'Relative Strength Index. A momentum oscillator (0-100) that measures overbought (>70) or oversold (<30) conditions.',
    category: 'technical',
    relatedTerms: ['Overbought', 'Oversold', 'Divergence'],
  },
  {
    term: 'MACD',
    definition: 'Moving Average Convergence Divergence. A trend-following momentum indicator showing the relationship between two moving averages.',
    category: 'technical',
    relatedTerms: ['Signal Line', 'Histogram', 'Crossover'],
  },
  {
    term: 'Candlestick',
    definition: 'A charting method showing the open, high, low, and close prices. The body shows open-close range; wicks show high-low range.',
    category: 'technical',
    relatedTerms: ['Doji', 'Hammer', 'Engulfing Pattern'],
  },
  {
    term: 'Breakout',
    definition: 'When a stock\'s price moves above a resistance level or below a support level with increased volume. Often signals the start of a new trend.',
    category: 'technical',
    relatedTerms: ['Resistance', 'Volume', 'False Breakout'],
  },
  {
    term: 'Gap',
    definition: 'A price area where no trading occurs, creating a "gap" on the chart. Gaps often occur after earnings or major news.',
    category: 'technical',
    relatedTerms: ['Gap Up', 'Gap Down', 'Gap Fill'],
  },

  // Fundamental Analysis
  {
    term: 'P/E Ratio',
    definition: 'Price-to-Earnings Ratio. Stock price divided by earnings per share. Indicates how much investors pay per dollar of earnings. Lower may indicate value.',
    category: 'fundamental',
    relatedTerms: ['Forward P/E', 'PEG Ratio', 'Valuation'],
  },
  {
    term: 'EPS',
    definition: 'Earnings Per Share. A company\'s profit divided by outstanding shares. Higher EPS generally indicates greater profitability.',
    category: 'fundamental',
    relatedTerms: ['P/E Ratio', 'Earnings', 'Diluted EPS'],
  },
  {
    term: 'Revenue',
    definition: 'Total income generated from sales before expenses are deducted. Also called the "top line" because it\'s the first line on the income statement.',
    category: 'fundamental',
    relatedTerms: ['Net Income', 'Gross Profit', 'Growth Rate'],
  },
  {
    term: 'Free Cash Flow',
    definition: 'Cash generated by operations minus capital expenditures. Represents money available for dividends, buybacks, or debt reduction.',
    category: 'fundamental',
    relatedTerms: ['Cash Flow', 'EBITDA', 'Operating Income'],
  },
  {
    term: 'Debt-to-Equity',
    definition: 'A measure of financial leverage comparing total debt to shareholders\' equity. Higher ratios indicate more debt financing.',
    category: 'fundamental',
    relatedTerms: ['Leverage', 'Balance Sheet', 'Equity'],
  },
  {
    term: 'Book Value',
    definition: 'The net asset value of a company (assets minus liabilities). Price-to-Book compares stock price to book value per share.',
    category: 'fundamental',
    relatedTerms: ['P/B Ratio', 'Net Assets', 'Intangible Assets'],
  },

  // Strategies
  {
    term: 'Covered Call',
    definition: 'Owning 100 shares and selling a call option against them. Generates income but caps upside. Best in neutral to slightly bullish markets.',
    category: 'strategies',
    relatedTerms: ['Call Option', 'Premium', 'Buy-Write'],
  },
  {
    term: 'Cash-Secured Put',
    definition: 'Selling a put option while holding enough cash to buy the shares if assigned. Generates income while waiting to buy a stock at a lower price.',
    category: 'strategies',
    relatedTerms: ['Put Option', 'Assignment', 'Wheel Strategy'],
  },
  {
    term: 'Iron Condor',
    definition: 'A neutral strategy selling both a put spread and call spread. Profits when the stock stays within a range. Limited risk and reward.',
    category: 'strategies',
    relatedTerms: ['Spread', 'Credit Spread', 'Range-Bound'],
  },
  {
    term: 'Straddle',
    definition: 'Buying both a call and put at the same strike and expiration. Profits from large moves in either direction. Often used before earnings.',
    category: 'strategies',
    relatedTerms: ['Strangle', 'Volatility', 'Breakeven'],
  },
  {
    term: 'Vertical Spread',
    definition: 'Buying and selling options of the same type and expiration but different strikes. Limits both risk and reward compared to single options.',
    category: 'strategies',
    relatedTerms: ['Debit Spread', 'Credit Spread', 'Bull Call Spread'],
  },
  {
    term: 'Wheel Strategy',
    definition: 'Rotating between selling puts (to acquire stock) and covered calls (to sell stock). Generates consistent premium income.',
    category: 'strategies',
    relatedTerms: ['Cash-Secured Put', 'Covered Call', 'Income Strategy'],
  },
  {
    term: 'Dollar-Cost Averaging',
    definition: 'Investing a fixed amount at regular intervals regardless of price. Reduces impact of volatility and removes emotion from timing decisions.',
    category: 'strategies',
    relatedTerms: ['Investing', 'Risk Management', 'Long-Term'],
  },

  // Risk Management
  {
    term: 'Stop-Loss',
    definition: 'An order to sell a security when it reaches a specific price to limit losses. Essential for risk management in trading.',
    category: 'risk',
    relatedTerms: ['Trailing Stop', 'Risk Management', 'Position Size'],
  },
  {
    term: 'Position Sizing',
    definition: 'Determining how much capital to allocate to a single trade. Common rule: risk no more than 1-2% of portfolio on any single trade.',
    category: 'risk',
    relatedTerms: ['Risk Management', 'Portfolio', 'Diversification'],
  },
  {
    term: 'Risk/Reward Ratio',
    definition: 'The potential profit compared to potential loss on a trade. A 1:3 ratio means risking $1 to potentially make $3.',
    category: 'risk',
    relatedTerms: ['Stop-Loss', 'Take Profit', 'Win Rate'],
  },
  {
    term: 'Diversification',
    definition: 'Spreading investments across different assets, sectors, or strategies to reduce risk. "Don\'t put all your eggs in one basket."',
    category: 'risk',
    relatedTerms: ['Correlation', 'Asset Allocation', 'Portfolio'],
  },
  {
    term: 'Hedging',
    definition: 'Taking an offsetting position to reduce risk. Example: buying puts to protect a stock position from downside.',
    category: 'risk',
    relatedTerms: ['Put Option', 'Protective Put', 'Insurance'],
  },
  {
    term: 'Max Drawdown',
    definition: 'The largest peak-to-trough decline in portfolio value. Important metric for evaluating trading strategy risk.',
    category: 'risk',
    relatedTerms: ['Risk Management', 'Volatility', 'Recovery'],
  },
  {
    term: 'Margin',
    definition: 'Borrowed money from your broker to trade. Amplifies both gains and losses. A margin call occurs when equity falls below requirements.',
    category: 'risk',
    relatedTerms: ['Leverage', 'Margin Call', 'Buying Power'],
  },
  {
    term: 'Liquidity Risk',
    definition: 'The risk of not being able to buy or sell an asset quickly without significantly affecting the price. Low-volume stocks have higher liquidity risk.',
    category: 'risk',
    relatedTerms: ['Volume', 'Bid/Ask Spread', 'Slippage'],
  },
];

export const categoryLabels: Record<GlossaryTerm['category'], string> = {
  basics: 'Basics',
  options: 'Options',
  technical: 'Technical Analysis',
  fundamental: 'Fundamental Analysis',
  strategies: 'Strategies',
  risk: 'Risk Management',
};

export const categoryIcons: Record<GlossaryTerm['category'], string> = {
  basics: '📊',
  options: '📈',
  technical: '📉',
  fundamental: '📋',
  strategies: '🎯',
  risk: '🛡️',
};
