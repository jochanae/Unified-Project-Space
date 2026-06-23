import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { HelpCircle, Download, CheckCircle2 } from 'lucide-react';
import { supportedBrokers } from '@/lib/brokerParsers';
import { downloadTradeTemplate } from '@/lib/templateDownloads';

export function ImportFormatGuide() {
  const [open, setOpen] = useState(false);

  // Use the shared template download which mirrors the import format exactly
  const handleDownloadTemplate = () => {
    downloadTradeTemplate();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" title="Import format guide">
          <HelpCircle className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Trade Import Guide</DialogTitle>
          <DialogDescription>
            Import trades from your broker or use our standard format
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="intoiq" className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="intoiq">IntoIQ Format</TabsTrigger>
            <TabsTrigger value="brokers">Broker Exports</TabsTrigger>
          </TabsList>

          <TabsContent value="intoiq" className="space-y-4 mt-4">
            <div className="rounded-lg border bg-muted/50 p-4">
              <h4 className="font-medium mb-2">Required Columns</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><code className="bg-background px-1 rounded">Symbol</code> - Stock ticker (e.g., AAPL)</div>
                <div><code className="bg-background px-1 rounded">Entry Price</code> - Price you bought/shorted at</div>
                <div><code className="bg-background px-1 rounded">Quantity</code> - Number of shares</div>
                <div><code className="bg-background px-1 rounded">Entry Date</code> - Date of trade</div>
              </div>
            </div>

            <div className="rounded-lg border bg-muted/50 p-4">
              <h4 className="font-medium mb-2">Optional Columns</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><code className="bg-background px-1 rounded">Type</code> - long or short</div>
                <div><code className="bg-background px-1 rounded">Exit Price</code> - Closing price</div>
                <div><code className="bg-background px-1 rounded">Exit Date</code> - Date closed</div>
                <div><code className="bg-background px-1 rounded">Status</code> - open or closed</div>
                <div><code className="bg-background px-1 rounded">Notes</code> - Trade notes</div>
              </div>
            </div>

            <div className="rounded-lg border p-4">
              <h4 className="font-medium mb-2">Sample CSV</h4>
              <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">
{`Symbol,Type,Entry Price,Exit Price,Quantity,Entry Date,Exit Date,Status,Notes
AAPL,long,175.50,182.30,10,2024-01-15,2024-01-22,closed,Earnings play
MSFT,long,378.00,,5,2024-01-18,,,Holding position`}
              </pre>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-3"
                onClick={handleDownloadTemplate}
              >
                <Download className="h-4 w-4 mr-2" />
                Download Template CSV
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="brokers" className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">
              We automatically detect and parse exports from these brokers:
            </p>

            <div className="space-y-3">
              {supportedBrokers.filter(b => b.name !== 'IntoIQ Format').map((broker) => (
                <div 
                  key={broker.name}
                  className="flex items-center gap-3 rounded-lg border p-3"
                >
                  <CheckCircle2 className="h-5 w-5 text-gain shrink-0" />
                  <div>
                    <div className="font-medium">{broker.name}</div>
                    <div className="text-sm text-muted-foreground">{broker.description}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 mt-4">
              <h4 className="font-medium mb-2">How to Export from Your Broker</h4>
              <ol className="list-decimal list-inside text-sm space-y-2 text-muted-foreground">
                <li>Log into your broker account</li>
                <li>Go to Transaction History or Trade History</li>
                <li>Look for "Export" or "Download" option</li>
                <li>Choose CSV format</li>
                <li>Upload the file here - we'll detect the format automatically!</li>
              </ol>
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="secondary">Pro tip</Badge>
              <span>Export your closed trades to see P&L analysis</span>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
