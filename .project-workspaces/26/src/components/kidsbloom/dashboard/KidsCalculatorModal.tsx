import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

interface KidsCalculatorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  variant: "playful" | "modern";
}

export function KidsCalculatorModal({ open, onOpenChange, variant }: KidsCalculatorModalProps) {
  const [display, setDisplay] = useState("0");
  const [previousValue, setPreviousValue] = useState<number | null>(null);
  const [operation, setOperation] = useState<string | null>(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);
  const isPlayful = variant === "playful";

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
      }

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
    }

    setDisplay(String(result));
    setPreviousValue(null);
    setOperation(null);
    setWaitingForOperand(true);
  };

  const buttonClass = isPlayful
    ? "h-14 text-xl font-bold rounded-xl bg-white/80 hover:bg-white text-purple-700 shadow-sm"
    : "h-14 text-xl font-semibold rounded-lg bg-white/10 hover:bg-white/20 text-white";

  const operatorClass = isPlayful
    ? "h-14 text-xl font-bold rounded-xl bg-purple-500 hover:bg-purple-600 text-white"
    : "h-14 text-xl font-semibold rounded-lg bg-violet-600 hover:bg-violet-700 text-white";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`max-w-xs ${isPlayful 
        ? "bg-gradient-to-b from-purple-100 to-pink-100 border-purple-200" 
        : "bg-gradient-to-b from-slate-900 to-indigo-950 border-white/10"
      }`}>
        <DialogHeader>
          <DialogTitle className={isPlayful ? "text-purple-600" : "text-white"}>
            {isPlayful ? "🧮 Calculator" : "Calculator"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {/* Display */}
          <motion.div
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            className={`p-4 rounded-xl text-right text-3xl font-bold ${
              isPlayful 
                ? "bg-white/80 text-purple-800" 
                : "bg-black/30 text-white"
            }`}
          >
            {display}
          </motion.div>

          {/* Buttons */}
          <div className="grid grid-cols-4 gap-2">
            <Button onClick={clear} className={`${buttonClass} col-span-2 bg-red-100 hover:bg-red-200 text-red-600`}>
              Clear
            </Button>
            <Button onClick={() => performOperation("÷")} className={operatorClass}>÷</Button>
            <Button onClick={() => performOperation("×")} className={operatorClass}>×</Button>

            <Button onClick={() => inputDigit("7")} className={buttonClass}>7</Button>
            <Button onClick={() => inputDigit("8")} className={buttonClass}>8</Button>
            <Button onClick={() => inputDigit("9")} className={buttonClass}>9</Button>
            <Button onClick={() => performOperation("-")} className={operatorClass}>-</Button>

            <Button onClick={() => inputDigit("4")} className={buttonClass}>4</Button>
            <Button onClick={() => inputDigit("5")} className={buttonClass}>5</Button>
            <Button onClick={() => inputDigit("6")} className={buttonClass}>6</Button>
            <Button onClick={() => performOperation("+")} className={operatorClass}>+</Button>

            <Button onClick={() => inputDigit("1")} className={buttonClass}>1</Button>
            <Button onClick={() => inputDigit("2")} className={buttonClass}>2</Button>
            <Button onClick={() => inputDigit("3")} className={buttonClass}>3</Button>
            <Button onClick={calculate} className={`${operatorClass} row-span-2 h-full bg-green-500 hover:bg-green-600`}>=</Button>

            <Button onClick={() => inputDigit("0")} className={`${buttonClass} col-span-2`}>0</Button>
            <Button onClick={inputDecimal} className={buttonClass}>.</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
