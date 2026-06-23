import { useState } from 'react';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  FileDown,
  Building2,
  Wallet,
  MessageSquarePlus,
  CheckCircle2,
  ExternalLink,
  FileSpreadsheet,
  BookOpen,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';

const SUPPORTED_BROKERS = [
  {
    id: 'robinhood',
    name: 'Robinhood',
    icon: '🪶',
    description: 'Commission-free stock and crypto trading',
    exportPath: 'Account → Statements → Export Trade History',
    format: 'CSV',
  },
  {
    id: 'schwab',
    name: 'Charles Schwab',
    icon: '💼',
    description: 'Banking, brokerage, and wealth (includes thinkorswim)',
    exportPath: 'History → Export → CSV Download',
    format: 'CSV',
  },
  {
    id: 'fidelity',
    name: 'Fidelity',
    icon: '📊',
    description: 'Investment management and retirement',
    exportPath: 'Accounts → Activity & Orders → Download',
    format: 'CSV',
  },
  {
    id: 'etrade',
    name: 'E*TRADE',
    icon: '📈',
    description: 'Online brokerage by Morgan Stanley',
    exportPath: 'Accounts → Transaction History → Export',
    format: 'CSV',
  },
  {
    id: 'interactive_brokers',
    name: 'Interactive Brokers',
    icon: '🌐',
    description: 'Professional trading platform',
    exportPath: 'Reports → Flex Queries → Activity',
    format: 'CSV/XML',
  },
  {
    id: 'webull',
    name: 'Webull',
    icon: '🦬',
    description: 'Commission-free trading with advanced tools',
    exportPath: 'Account → Order History → Export',
    format: 'CSV',
  },
  {
    id: 'tastytrade',
    name: 'tastytrade',
    icon: '🍕',
    description: 'Options and futures focused platform',
    exportPath: 'History → Transaction History → Download CSV',
    format: 'CSV',
  },
  {
    id: 'tradier',
    name: 'Tradier',
    icon: '⚡',
    description: 'API-first brokerage for active traders',
    exportPath: 'Account → History → Export',
    format: 'CSV',
  },
];

const CRYPTO_EXCHANGES = [
  {
    id: 'coinbase',
    name: 'Coinbase',
    icon: '🪙',
    description: 'Most trusted crypto exchange for beginners',
    exportPath: 'Taxes → Generate Report → Transaction History',
    format: 'CSV',
  },
  {
    id: 'binance',
    name: 'Binance',
    icon: '🔶',
    description: 'Largest crypto exchange by volume',
    exportPath: 'Orders → Trade History → Export',
    format: 'CSV',
  },
  {
    id: 'kraken',
    name: 'Kraken',
    icon: '🐙',
    description: 'Secure crypto exchange with advanced features',
    exportPath: 'History → Export → Trades',
    format: 'CSV',
  },
  {
    id: 'gemini',
    name: 'Gemini',
    icon: '♊',
    description: 'Regulated crypto exchange by the Winklevoss twins',
    exportPath: 'Account → Statements → Download History',
    format: 'CSV',
  },
];

export default function BrokerImportGuide() {
  const { user } = useAuth();
  const [selectedBroker, setSelectedBroker] = useState<string | null>(null);

  const allPlatforms = [...SUPPORTED_BROKERS, ...CRYPTO_EXCHANGES];
  const selected = allPlatforms.find(p => p.id === selectedBroker);

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-chart-2 shadow-lg">
            <FileDown className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Import Trades</h1>
            <p className="text-sm text-muted-foreground">
              Import your trade history from any supported broker via CSV
            </p>
          </div>
        </div>

        {/* Quick Action */}
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="h-8 w-8 text-primary" />
                <div>
                  <h3 className="font-semibold">Ready to import?</h3>
                  <p className="text-sm text-muted-foreground">
                    Head to your Trade Journal to upload your CSV file
                  </p>
                </div>
              </div>
              <Button asChild>
                <Link to="/journal">
                  <BookOpen className="h-4 w-4 mr-2" />
                  Go to Journal
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* How It Works */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-gain" />
              How CSV Import Works
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-4">
              <li className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-semibold">1</span>
                <div>
                  <p className="font-medium">Export from your broker</p>
                  <p className="text-sm text-muted-foreground">Download your trade history as a CSV file from your brokerage platform</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-semibold">2</span>
                <div>
                  <p className="font-medium">Upload to your Journal</p>
                  <p className="text-sm text-muted-foreground">Use the import button in your Trade Journal to upload the CSV</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-semibold">3</span>
                <div>
                  <p className="font-medium">Auto-detect & import</p>
                  <p className="text-sm text-muted-foreground">We automatically detect your broker's format and import your trades</p>
                </div>
              </li>
            </ol>
          </CardContent>
        </Card>

        {/* Supported Brokers */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Supported Brokers
            </CardTitle>
            <CardDescription>
              Click on a broker to see export instructions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              {SUPPORTED_BROKERS.map((broker) => (
                <button
                  key={broker.id}
                  onClick={() => setSelectedBroker(selectedBroker === broker.id ? null : broker.id)}
                  className={`flex items-center justify-between p-4 rounded-lg border transition-colors text-left w-full ${
                    selectedBroker === broker.id 
                      ? 'border-primary bg-primary/5' 
                      : 'hover:border-primary/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{broker.icon}</span>
                    <div>
                      <p className="font-medium">{broker.name}</p>
                      <p className="text-sm text-muted-foreground">{broker.description}</p>
                    </div>
                  </div>
                  <Badge variant="outline">{broker.format}</Badge>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Selected Broker Instructions */}
        {selected && (
          <Card className="border-primary/50 animate-fade-in">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-2xl">{selected.icon}</span>
                Export from {selected.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm font-medium mb-2">Navigation Path:</p>
                  <code className="text-sm text-primary bg-primary/10 px-2 py-1 rounded">
                    {selected.exportPath}
                  </code>
                </div>
                <p className="text-sm text-muted-foreground">
                  Once you've downloaded your {selected.format} file, go to your Trade Journal and click the Import button to upload it.
                </p>
                <Button asChild variant="outline">
                  <Link to="/journal">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Import to Journal
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Crypto Exchanges */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Crypto Exchanges
            </CardTitle>
            <CardDescription>
              Import your crypto trade history
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              {CRYPTO_EXCHANGES.map((exchange) => (
                <button
                  key={exchange.id}
                  onClick={() => setSelectedBroker(selectedBroker === exchange.id ? null : exchange.id)}
                  className={`flex items-center justify-between p-4 rounded-lg border transition-colors text-left w-full ${
                    selectedBroker === exchange.id 
                      ? 'border-primary bg-primary/5' 
                      : 'hover:border-primary/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{exchange.icon}</span>
                    <div>
                      <p className="font-medium">{exchange.name}</p>
                      <p className="text-sm text-muted-foreground">{exchange.description}</p>
                    </div>
                  </div>
                  <Badge variant="outline">{exchange.format}</Badge>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Suggest a Broker */}
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <MessageSquarePlus className="h-8 w-8 text-primary shrink-0" />
              <div className="flex-1">
                <h3 className="font-semibold mb-1">Don't see your broker?</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Let us know which broker you'd like us to add CSV support for.
                </p>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      Suggest a Broker
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Suggest a Broker</DialogTitle>
                      <DialogDescription>
                        Tell us which broker's CSV format you'd like us to support.
                      </DialogDescription>
                    </DialogHeader>
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        const formData = new FormData(e.currentTarget);
                        const brokerName = formData.get('brokerName') as string;
                        const details = formData.get('details') as string;

                        try {
                          await supabase.from('feedback').insert({
                            user_id: user?.id,
                            type: 'feature_request',
                            title: `CSV Import Request: ${brokerName}`,
                            message: details || `Please add CSV import support for ${brokerName}`,
                            page_url: '/broker-import-guide',
                          });
                          toast.success('Thanks! Your suggestion has been submitted.');
                          (e.target as HTMLFormElement).reset();
                        } catch (error) {
                          toast.error('Failed to submit suggestion');
                        }
                      }}
                      className="space-y-4"
                    >
                      <div className="space-y-2">
                        <Label htmlFor="brokerName">Broker Name</Label>
                        <Input
                          id="brokerName"
                          name="brokerName"
                          placeholder="e.g., Vanguard, Merrill Edge..."
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="details">Additional Details (optional)</Label>
                        <Textarea
                          id="details"
                          name="details"
                          placeholder="Any details about their export format..."
                          rows={3}
                        />
                      </div>
                      <Button type="submit" className="w-full">
                        Submit Suggestion
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
