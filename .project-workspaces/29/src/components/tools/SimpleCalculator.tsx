import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calculator, Delete } from 'lucide-react';

interface SimpleCalculatorProps {
  onClose: () => void;
}

export function SimpleCalculator({ onClose }: SimpleCalculatorProps) {
  const [display, setDisplay] = useState('0');
  const [previousValue, setPreviousValue] = useState<number | null>(null);
  const [operation, setOperation] = useState<string | null>(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);

  const inputDigit = (digit: string) => {
    if (waitingForOperand) {
      setDisplay(digit);
      setWaitingForOperand(false);
    } else {
      setDisplay(display === '0' ? digit : display + digit);
    }
  };

  const inputDecimal = () => {
    if (waitingForOperand) {
      setDisplay('0.');
      setWaitingForOperand(false);
      return;
    }
    if (!display.includes('.')) {
      setDisplay(display + '.');
    }
  };

  const clear = () => {
    setDisplay('0');
    setPreviousValue(null);
    setOperation(null);
    setWaitingForOperand(false);
  };

  const backspace = () => {
    if (display.length === 1 || (display.length === 2 && display.startsWith('-'))) {
      setDisplay('0');
    } else {
      setDisplay(display.slice(0, -1));
    }
  };

  const toggleSign = () => {
    const value = parseFloat(display);
    setDisplay(String(value * -1));
  };

  const inputPercent = () => {
    const value = parseFloat(display);
    setDisplay(String(value / 100));
  };

  const performOperation = (nextOperation: string) => {
    const inputValue = parseFloat(display);

    if (previousValue === null) {
      setPreviousValue(inputValue);
    } else if (operation) {
      const result = calculate(previousValue, inputValue, operation);
      setDisplay(String(result));
      setPreviousValue(result);
    }

    setWaitingForOperand(true);
    setOperation(nextOperation);
  };

  const calculate = (prev: number, current: number, op: string): number => {
    switch (op) {
      case '+':
        return prev + current;
      case '-':
        return prev - current;
      case '×':
        return prev * current;
      case '÷':
        return current !== 0 ? prev / current : 0;
      default:
        return current;
    }
  };

  const handleEquals = () => {
    if (operation === null || previousValue === null) return;

    const inputValue = parseFloat(display);
    const result = calculate(previousValue, inputValue, operation);

    setDisplay(String(result));
    setPreviousValue(null);
    setOperation(null);
    setWaitingForOperand(true);
  };

  const buttonClass = "h-12 text-lg font-semibold transition-all active:scale-95";
  const numberClass = `${buttonClass} bg-card border border-border text-foreground hover:bg-accent`;
  const operatorClass = `${buttonClass} bg-primary text-primary-foreground hover:bg-primary/90`;
  const functionClass = `${buttonClass} bg-muted text-foreground hover:bg-muted/80`;

  return (
    <Card className="w-72 shadow-2xl border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Calculator className="h-4 w-4" />
          Calculator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {/* Display */}
        <div className="bg-muted rounded-lg p-3 text-right">
          <div className="text-xs text-muted-foreground h-4">
            {previousValue !== null && operation && `${previousValue} ${operation}`}
          </div>
          <div className="text-2xl font-mono font-bold truncate">
            {display}
          </div>
        </div>

        {/* Keypad */}
        <div className="grid grid-cols-4 gap-1.5">
          <Button className={functionClass} onClick={clear}>AC</Button>
          <Button className={functionClass} onClick={toggleSign}>±</Button>
          <Button className={functionClass} onClick={inputPercent}>%</Button>
          <Button className={operatorClass} onClick={() => performOperation('÷')}>÷</Button>

          <Button className={numberClass} onClick={() => inputDigit('7')}>7</Button>
          <Button className={numberClass} onClick={() => inputDigit('8')}>8</Button>
          <Button className={numberClass} onClick={() => inputDigit('9')}>9</Button>
          <Button className={operatorClass} onClick={() => performOperation('×')}>×</Button>

          <Button className={numberClass} onClick={() => inputDigit('4')}>4</Button>
          <Button className={numberClass} onClick={() => inputDigit('5')}>5</Button>
          <Button className={numberClass} onClick={() => inputDigit('6')}>6</Button>
          <Button className={operatorClass} onClick={() => performOperation('-')}>−</Button>

          <Button className={numberClass} onClick={() => inputDigit('1')}>1</Button>
          <Button className={numberClass} onClick={() => inputDigit('2')}>2</Button>
          <Button className={numberClass} onClick={() => inputDigit('3')}>3</Button>
          <Button className={operatorClass} onClick={() => performOperation('+')}>+</Button>

          <Button className={numberClass} onClick={backspace}>
            <Delete className="h-4 w-4" />
          </Button>
          <Button className={numberClass} onClick={() => inputDigit('0')}>0</Button>
          <Button className={numberClass} onClick={inputDecimal}>.</Button>
          <Button className={`${operatorClass} bg-gain hover:bg-gain/90`} onClick={handleEquals}>=</Button>
        </div>
      </CardContent>
    </Card>
  );
}
