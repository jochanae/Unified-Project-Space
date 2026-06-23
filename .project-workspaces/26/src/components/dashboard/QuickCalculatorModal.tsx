import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calculator, Delete, Divide, Minus, Plus, X, Percent, Equal } from "lucide-react";

interface QuickCalculatorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QuickCalculatorModal({ open, onOpenChange }: QuickCalculatorModalProps) {
  const [display, setDisplay] = useState("0");
  const [previousValue, setPreviousValue] = useState<number | null>(null);
  const [operation, setOperation] = useState<string | null>(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);
  const [history, setHistory] = useState<string[]>([]);

  const inputDigit = (digit: string) => {
    if (waitingForOperand) {
      setDisplay(digit);
      setWaitingForOperand(false);
    } else {
      setDisplay(display === "0" ? digit : display + digit);
    }
  };

  const inputDecimal = () => {
    if (waitingForOperand) {
      setDisplay("0.");
      setWaitingForOperand(false);
      return;
    }
    if (!display.includes(".")) {
      setDisplay(display + ".");
    }
  };

  const clear = () => {
    setDisplay("0");
    setPreviousValue(null);
    setOperation(null);
    setWaitingForOperand(false);
  };

  const clearEntry = () => {
    setDisplay("0");
  };

  const performOperation = (nextOperation: string) => {
    const inputValue = parseFloat(display);

    if (previousValue === null) {
      setPreviousValue(inputValue);
    } else if (operation) {
      const currentValue = previousValue || 0;
      let result = 0;

      switch (operation) {
        case "+":
          result = currentValue + inputValue;
          break;
        case "-":
          result = currentValue - inputValue;
          break;
        case "×":
          result = currentValue * inputValue;
          break;
        case "÷":
          result = inputValue !== 0 ? currentValue / inputValue : 0;
          break;
        case "%":
          result = currentValue * (inputValue / 100);
          break;
        default:
          result = inputValue;
      }

      const historyEntry = `${currentValue} ${operation} ${inputValue} = ${result}`;
      setHistory(prev => [historyEntry, ...prev.slice(0, 4)]);
      setDisplay(String(result));
      setPreviousValue(result);
    }

    setWaitingForOperand(true);
    setOperation(nextOperation);
  };

  const calculate = () => {
    if (!operation || previousValue === null) return;

    const inputValue = parseFloat(display);
    let result = 0;

    switch (operation) {
      case "+":
        result = previousValue + inputValue;
        break;
      case "-":
        result = previousValue - inputValue;
        break;
      case "×":
        result = previousValue * inputValue;
        break;
      case "÷":
        result = inputValue !== 0 ? previousValue / inputValue : 0;
        break;
      case "%":
        result = previousValue * (inputValue / 100);
        break;
    }

    const historyEntry = `${previousValue} ${operation} ${inputValue} = ${result}`;
    setHistory(prev => [historyEntry, ...prev.slice(0, 4)]);
    
    setDisplay(String(result));
    setPreviousValue(null);
    setOperation(null);
    setWaitingForOperand(true);
  };

  const toggleSign = () => {
    const value = parseFloat(display);
    setDisplay(String(-value));
  };

  const CalcButton = ({ 
    children, 
    onClick, 
    variant = "default",
    className = ""
  }: { 
    children: React.ReactNode; 
    onClick: () => void; 
    variant?: "default" | "operator" | "equal" | "function";
    className?: string;
  }) => {
    const baseStyles = "h-14 w-14 text-lg font-semibold rounded-xl transition-all active:scale-95";
    const variants = {
      default: "bg-muted hover:bg-muted/80 text-foreground",
      operator: "bg-primary/20 hover:bg-primary/30 text-primary",
      equal: "bg-gradient-to-r from-primary to-purple-600 hover:opacity-90 text-white",
      function: "bg-secondary hover:bg-secondary/80 text-secondary-foreground"
    };

    return (
      <Button 
        onClick={onClick} 
        className={`${baseStyles} ${variants[variant]} ${className}`}
      >
        {children}
      </Button>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xs p-4">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            Quick Calculator
          </DialogTitle>
        </DialogHeader>

        {/* Display */}
        <div className="bg-muted rounded-xl p-4 mb-2">
          <div className="text-right">
            {operation && previousValue !== null && (
              <div className="text-sm text-muted-foreground mb-1">
                {previousValue} {operation}
              </div>
            )}
            <div className="text-3xl font-bold text-foreground truncate">
              {display}
            </div>
          </div>
        </div>

        {/* History */}
        {history.length > 0 && (
          <div className="bg-muted/50 rounded-lg p-2 mb-2 max-h-20 overflow-y-auto">
            {history.map((entry, i) => (
              <div key={i} className="text-xs text-muted-foreground truncate">
                {entry}
              </div>
            ))}
          </div>
        )}

        {/* Keypad */}
        <div className="grid grid-cols-4 gap-2">
          <CalcButton onClick={clear} variant="function">C</CalcButton>
          <CalcButton onClick={clearEntry} variant="function">CE</CalcButton>
          <CalcButton onClick={toggleSign} variant="function">±</CalcButton>
          <CalcButton onClick={() => performOperation("÷")} variant="operator">
            <Divide className="h-5 w-5" />
          </CalcButton>

          <CalcButton onClick={() => inputDigit("7")}>7</CalcButton>
          <CalcButton onClick={() => inputDigit("8")}>8</CalcButton>
          <CalcButton onClick={() => inputDigit("9")}>9</CalcButton>
          <CalcButton onClick={() => performOperation("×")} variant="operator">
            <X className="h-5 w-5" />
          </CalcButton>

          <CalcButton onClick={() => inputDigit("4")}>4</CalcButton>
          <CalcButton onClick={() => inputDigit("5")}>5</CalcButton>
          <CalcButton onClick={() => inputDigit("6")}>6</CalcButton>
          <CalcButton onClick={() => performOperation("-")} variant="operator">
            <Minus className="h-5 w-5" />
          </CalcButton>

          <CalcButton onClick={() => inputDigit("1")}>1</CalcButton>
          <CalcButton onClick={() => inputDigit("2")}>2</CalcButton>
          <CalcButton onClick={() => inputDigit("3")}>3</CalcButton>
          <CalcButton onClick={() => performOperation("+")} variant="operator">
            <Plus className="h-5 w-5" />
          </CalcButton>

          <CalcButton onClick={() => performOperation("%")} variant="function">
            <Percent className="h-4 w-4" />
          </CalcButton>
          <CalcButton onClick={() => inputDigit("0")}>0</CalcButton>
          <CalcButton onClick={inputDecimal}>.</CalcButton>
          <CalcButton onClick={calculate} variant="equal">
            <Equal className="h-5 w-5" />
          </CalcButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}
