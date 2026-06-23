import { useState } from "react";
import { Globe, ArrowRightLeft, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const currencies = [
  { code: "USD", name: "US Dollar", symbol: "$", rate: 1 },
  { code: "EUR", name: "Euro", symbol: "€", rate: 0.92 },
  { code: "GBP", name: "British Pound", symbol: "£", rate: 0.79 },
  { code: "JPY", name: "Japanese Yen", symbol: "¥", rate: 149.50 },
  { code: "CAD", name: "Canadian Dollar", symbol: "C$", rate: 1.36 },
  { code: "AUD", name: "Australian Dollar", symbol: "A$", rate: 1.53 },
  { code: "MXN", name: "Mexican Peso", symbol: "$", rate: 17.15 },
  { code: "INR", name: "Indian Rupee", symbol: "₹", rate: 83.12 },
];

export const CurrencyCardContent = () => {
  const [amount, setAmount] = useState("100");
  const [fromCurrency, setFromCurrency] = useState("USD");
  const [toCurrency, setToCurrency] = useState("EUR");

  const fromRate = currencies.find(c => c.code === fromCurrency)?.rate || 1;
  const toRate = currencies.find(c => c.code === toCurrency)?.rate || 1;
  const convertedAmount = (parseFloat(amount || "0") / fromRate) * toRate;
  const toSymbol = currencies.find(c => c.code === toCurrency)?.symbol || "";

  const handleSwap = () => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">Quick currency conversion</p>
        <Button variant="ghost" size="icon" className="h-6 w-6">
          <RefreshCw className="h-3 w-3" />
        </Button>
      </div>
      
      <div className="space-y-2">
        <div className="flex gap-1.5 items-center">
          <Input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="h-8 text-sm flex-1"
            placeholder="Amount"
          />
          <Select value={fromCurrency} onValueChange={setFromCurrency}>
            <SelectTrigger className="h-8 w-20 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {currencies.map((c) => (
                <SelectItem key={c.code} value={c.code} className="text-xs">
                  {c.code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex justify-center">
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleSwap}>
            <ArrowRightLeft className="h-3 w-3 text-primary" />
          </Button>
        </div>
        
        <div className="flex gap-1.5 items-center">
          <div className="h-8 flex-1 bg-muted/50 rounded-md flex items-center px-2">
            <span className="text-sm font-medium">
              {toSymbol}{convertedAmount.toFixed(2)}
            </span>
          </div>
          <Select value={toCurrency} onValueChange={setToCurrency}>
            <SelectTrigger className="h-8 w-20 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {currencies.map((c) => (
                <SelectItem key={c.code} value={c.code} className="text-xs">
                  {c.code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <p className="text-[10px] text-muted-foreground text-center">
        1 {fromCurrency} = {(toRate / fromRate).toFixed(4)} {toCurrency}
      </p>
    </div>
  );
};
