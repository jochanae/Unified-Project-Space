// Broker-specific CSV parsers for trade import
import { TradeInput } from '@/hooks/useTrades';

export interface BrokerParser {
  name: string;
  detect: (headers: string[]) => boolean;
  parse: (row: string[], headers: string[]) => TradeInput | null;
}

// Schwab export format
const schwabParser: BrokerParser = {
  name: 'Charles Schwab',
  detect: (headers) => {
    const headerStr = headers.join(',').toLowerCase();
    return headerStr.includes('action') && 
           headerStr.includes('symbol') && 
           (headerStr.includes('quantity') || headerStr.includes('qty')) &&
           headerStr.includes('price');
  },
  parse: (row, headers) => {
    const getValue = (names: string[]) => {
      for (const name of names) {
        const idx = headers.findIndex(h => h.toLowerCase().includes(name.toLowerCase()));
        if (idx !== -1) return row[idx]?.trim() || '';
      }
      return '';
    };

    const symbol = getValue(['symbol']).replace(/[^A-Z]/g, '');
    const action = getValue(['action']).toLowerCase();
    const quantity = parseFloat(getValue(['quantity', 'qty']).replace(/[^0-9.-]/g, '')) || 0;
    const price = parseFloat(getValue(['price']).replace(/[^0-9.-]/g, '')) || 0;
    const date = getValue(['date', 'trade date', 'settlement date']);

    if (!symbol || !price || !quantity) return null;

    // Schwab uses Buy/Sell actions
    const isBuy = action.includes('buy') || action.includes('bought');
    const isSell = action.includes('sell') || action.includes('sold');

    return {
      symbol,
      trade_type: isBuy ? 'long' : 'short',
      entry_price: price,
      quantity: Math.abs(quantity),
      entry_date: parseDate(date) || new Date().toISOString(),
      status: isSell ? 'closed' : 'open',
      notes: `Imported from Schwab - ${action}`,
    };
  },
};

// Fidelity export format
const fidelityParser: BrokerParser = {
  name: 'Fidelity',
  detect: (headers) => {
    const headerStr = headers.join(',').toLowerCase();
    return (headerStr.includes('symbol') || headerStr.includes('security')) && 
           headerStr.includes('quantity') &&
           (headerStr.includes('last price') || headerStr.includes('price paid'));
  },
  parse: (row, headers) => {
    const getValue = (names: string[]) => {
      for (const name of names) {
        const idx = headers.findIndex(h => h.toLowerCase().includes(name.toLowerCase()));
        if (idx !== -1) return row[idx]?.trim() || '';
      }
      return '';
    };

    const symbol = getValue(['symbol', 'security']).replace(/[^A-Z]/g, '');
    const quantity = parseFloat(getValue(['quantity']).replace(/[^0-9.-]/g, '')) || 0;
    const price = parseFloat(getValue(['last price', 'price paid', 'average cost']).replace(/[^0-9.-]/g, '')) || 0;
    const date = getValue(['date acquired', 'purchase date', 'trade date']);

    if (!symbol || !price || !quantity) return null;

    return {
      symbol,
      trade_type: 'long',
      entry_price: price,
      quantity: Math.abs(quantity),
      entry_date: parseDate(date) || new Date().toISOString(),
      status: 'open',
      notes: 'Imported from Fidelity',
    };
  },
};

// thinkorswim (Schwab) format - formerly TD Ameritrade
const thinkorswimParser: BrokerParser = {
  name: 'thinkorswim (Schwab)',
  detect: (headers) => {
    const headerStr = headers.join(',').toLowerCase();
    return headerStr.includes('symbol') && 
           (headerStr.includes('qty') || headerStr.includes('pos effect')) &&
           (headerStr.includes('avg price') || headerStr.includes('trade price'));
  },
  parse: (row, headers) => {
    const getValue = (names: string[]) => {
      for (const name of names) {
        const idx = headers.findIndex(h => h.toLowerCase().includes(name.toLowerCase()));
        if (idx !== -1) return row[idx]?.trim() || '';
      }
      return '';
    };

    const symbol = getValue(['symbol', 'underlying']).replace(/[^A-Z]/g, '');
    const quantity = parseFloat(getValue(['qty', 'quantity']).replace(/[^0-9.-]/g, '')) || 0;
    const price = parseFloat(getValue(['avg price', 'trade price', 'price']).replace(/[^0-9.-]/g, '')) || 0;
    const date = getValue(['exec time', 'date', 'trade date']);
    const side = getValue(['side', 'pos effect']).toLowerCase();

    if (!symbol || !price) return null;

    const isBuy = side.includes('buy') || side.includes('to_open') || side.includes('to open');
    
    return {
      symbol,
      trade_type: isBuy ? 'long' : 'short',
      entry_price: price,
      quantity: Math.abs(quantity) || 1,
      entry_date: parseDate(date) || new Date().toISOString(),
      status: 'open',
      notes: `Imported from thinkorswim - ${side}`,
    };
  },
};

// E*TRADE format
const etradeParser: BrokerParser = {
  name: 'E*TRADE',
  detect: (headers) => {
    const headerStr = headers.join(',').toLowerCase();
    return headerStr.includes('symbol') && 
           headerStr.includes('transaction type') &&
           headerStr.includes('shares');
  },
  parse: (row, headers) => {
    const getValue = (names: string[]) => {
      for (const name of names) {
        const idx = headers.findIndex(h => h.toLowerCase().includes(name.toLowerCase()));
        if (idx !== -1) return row[idx]?.trim() || '';
      }
      return '';
    };

    const symbol = getValue(['symbol']).replace(/[^A-Z]/g, '');
    const transactionType = getValue(['transaction type']).toLowerCase();
    const shares = parseFloat(getValue(['shares', 'quantity']).replace(/[^0-9.-]/g, '')) || 0;
    const price = parseFloat(getValue(['price', 'share price']).replace(/[^0-9.-]/g, '')) || 0;
    const date = getValue(['trade date', 'date']);

    if (!symbol || !price || !shares) return null;

    const isBuy = transactionType.includes('bought') || transactionType.includes('buy');

    return {
      symbol,
      trade_type: isBuy ? 'long' : 'short',
      entry_price: price,
      quantity: Math.abs(shares),
      entry_date: parseDate(date) || new Date().toISOString(),
      status: transactionType.includes('sold') || transactionType.includes('sell') ? 'closed' : 'open',
      notes: `Imported from E*TRADE - ${transactionType}`,
    };
  },
};

// Robinhood format
const robinhoodParser: BrokerParser = {
  name: 'Robinhood',
  detect: (headers) => {
    const headerStr = headers.join(',').toLowerCase();
    return headerStr.includes('symbol') && 
           headerStr.includes('side') &&
           headerStr.includes('average price');
  },
  parse: (row, headers) => {
    const getValue = (names: string[]) => {
      for (const name of names) {
        const idx = headers.findIndex(h => h.toLowerCase().includes(name.toLowerCase()));
        if (idx !== -1) return row[idx]?.trim() || '';
      }
      return '';
    };

    const symbol = getValue(['symbol']).replace(/[^A-Z]/g, '');
    const side = getValue(['side']).toLowerCase();
    const quantity = parseFloat(getValue(['quantity', 'shares']).replace(/[^0-9.-]/g, '')) || 0;
    const price = parseFloat(getValue(['average price', 'price']).replace(/[^0-9.-]/g, '')) || 0;
    const date = getValue(['date', 'activity date']);

    if (!symbol || !price || !quantity) return null;

    return {
      symbol,
      trade_type: side === 'buy' ? 'long' : 'short',
      entry_price: price,
      quantity: Math.abs(quantity),
      entry_date: parseDate(date) || new Date().toISOString(),
      status: side === 'sell' ? 'closed' : 'open',
      notes: `Imported from Robinhood - ${side}`,
    };
  },
};

// Webull format
const webullParser: BrokerParser = {
  name: 'Webull',
  detect: (headers) => {
    const headerStr = headers.join(',').toLowerCase();
    return headerStr.includes('symbol') && 
           headerStr.includes('side') &&
           (headerStr.includes('filled price') || headerStr.includes('avg price'));
  },
  parse: (row, headers) => {
    const getValue = (names: string[]) => {
      for (const name of names) {
        const idx = headers.findIndex(h => h.toLowerCase().includes(name.toLowerCase()));
        if (idx !== -1) return row[idx]?.trim() || '';
      }
      return '';
    };

    const symbol = getValue(['symbol']).replace(/[^A-Z]/g, '');
    const side = getValue(['side']).toLowerCase();
    const quantity = parseFloat(getValue(['filled qty', 'quantity', 'qty']).replace(/[^0-9.-]/g, '')) || 0;
    const price = parseFloat(getValue(['filled price', 'avg price', 'price']).replace(/[^0-9.-]/g, '')) || 0;
    const date = getValue(['filled time', 'date', 'create time']);

    if (!symbol || !price || !quantity) return null;

    return {
      symbol,
      trade_type: side === 'buy' ? 'long' : 'short',
      entry_price: price,
      quantity: Math.abs(quantity),
      entry_date: parseDate(date) || new Date().toISOString(),
      status: side === 'sell' ? 'closed' : 'open',
      notes: `Imported from Webull - ${side}`,
    };
  },
};

// Generic/IntoIQ format
const genericParser: BrokerParser = {
  name: 'Generic/IntoIQ',
  detect: () => true, // Fallback parser
  parse: (row, headers) => {
    const getValue = (names: string[]) => {
      for (const name of names) {
        const idx = headers.findIndex(h => h.toLowerCase() === name.toLowerCase());
        if (idx !== -1) return row[idx]?.trim() || '';
      }
      // Also try partial match
      for (const name of names) {
        const idx = headers.findIndex(h => h.toLowerCase().includes(name.toLowerCase()));
        if (idx !== -1) return row[idx]?.trim() || '';
      }
      return '';
    };

    const symbol = getValue(['symbol']);
    const tradeType = getValue(['type', 'trade_type', 'side']);
    const entryPrice = parseFloat(getValue(['entry price', 'entry_price', 'price'])) || 0;
    const exitPrice = parseFloat(getValue(['exit price', 'exit_price'])) || null;
    const quantity = parseFloat(getValue(['quantity', 'qty', 'shares'])) || 1;
    const entryDate = getValue(['entry date', 'entry_date', 'date']);
    const exitDate = getValue(['exit date', 'exit_date']);
    const status = getValue(['status']);
    const notes = getValue(['notes', 'note', 'comment']);

    if (!symbol || !entryPrice) return null;

    return {
      symbol: symbol.toUpperCase(),
      trade_type: tradeType.toLowerCase().includes('short') ? 'short' : 'long',
      entry_price: entryPrice,
      exit_price: exitPrice,
      quantity,
      entry_date: parseDate(entryDate) || new Date().toISOString(),
      exit_date: exitDate ? parseDate(exitDate) : null,
      status: status.toLowerCase() === 'closed' || exitPrice ? 'closed' : 'open',
      notes,
    };
  },
};

// All parsers in priority order
export const brokerParsers: BrokerParser[] = [
  schwabParser,
  fidelityParser,
  thinkorswimParser,
  etradeParser,
  robinhoodParser,
  webullParser,
  genericParser, // Fallback
];

// Detect which broker format the CSV is from
export function detectBroker(headers: string[]): BrokerParser {
  for (const parser of brokerParsers) {
    if (parser !== genericParser && parser.detect(headers)) {
      return parser;
    }
  }
  return genericParser;
}

// Parse date in various formats
function parseDate(dateStr: string): string | null {
  if (!dateStr) return null;
  
  // Try various formats
  const formats = [
    // ISO format
    /^(\d{4})-(\d{2})-(\d{2})/,
    // US format MM/DD/YYYY
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})/,
    // US format MM-DD-YYYY
    /^(\d{1,2})-(\d{1,2})-(\d{4})/,
  ];

  for (const format of formats) {
    const match = dateStr.match(format);
    if (match) {
      try {
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) {
          return date.toISOString();
        }
      } catch {
        continue;
      }
    }
  }

  // Try native Date parsing
  try {
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date.toISOString();
    }
  } catch {
    return null;
  }

  return null;
}

// Supported brokers list for UI
export const supportedBrokers = [
  { name: 'IntoIQ Format', description: 'Our standard CSV format' },
  { name: 'Charles Schwab', description: 'Export from Schwab.com' },
  { name: 'thinkorswim (Schwab)', description: 'Export from thinkorswim platform' },
  { name: 'Fidelity', description: 'Export from Fidelity.com' },
  { name: 'E*TRADE', description: 'Export from etrade.com' },
  { name: 'Robinhood', description: 'Export from Robinhood app' },
  { name: 'Webull', description: 'Export from Webull app' },
];
