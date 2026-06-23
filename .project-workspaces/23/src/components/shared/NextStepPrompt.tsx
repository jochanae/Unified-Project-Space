import { ArrowRight, Loader2, Sparkles, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LivePulseDot } from './LivePulseDot';

/**
 * NextStepPrompt — the inline "what next?" card that appears beneath a freshly
 * generated artifact and either offers a one-click next action OR confirms
 * where the artifact now lives. Once an action has been taken it never
 * disappears entirely — it becomes a receipt.
 */
interface BasePromptProps {
  /** Optional override icon. Defaults to a gold Sparkles. */
  icon?: React.ReactNode;
}

interface ActionPromptProps extends BasePromptProps {
  mode: 'action';
  text: string;
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
}

interface ReceiptPromptProps extends BasePromptProps {
  mode: 'receipt';
  text: string;
  onClick?: () => void;
  /** When true, renders a small green pulse dot in place of the sparkles. */
  pulse?: boolean;
}

type NextStepPromptProps = ActionPromptProps | ReceiptPromptProps;

export function NextStepPrompt(props: NextStepPromptProps) {
  const isReceipt = props.mode === 'receipt';
  return (
    <div
      className="rounded-xl border border-gold/20 bg-gold/5 px-4 py-3 flex items-center justify-between gap-3 animate-in fade-in duration-500"
      role="group"
    >
      <div className="flex items-center gap-2 min-w-0">
        {props.icon ? (
          props.icon
        ) : isReceipt && (props as ReceiptPromptProps).pulse ? (
          <LivePulseDot color="gold" className="shrink-0" />
        ) : isReceipt ? (
          <Check className="h-3.5 w-3.5 text-gold shrink-0" />
        ) : (
          <Sparkles className="h-3.5 w-3.5 text-gold shrink-0" />
        )}
        <span className="text-xs text-gold/90 truncate">{props.text}</span>
      </div>
      {props.mode === 'action' ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={props.onClick}
          disabled={props.disabled || props.loading}
          className="h-7 w-7 p-0 text-gold hover:text-gold hover:bg-gold/15 shrink-0"
          aria-label={props.text}
        >
          {props.loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <ArrowRight className="h-3.5 w-3.5" />
          )}
        </Button>
      ) : props.onClick ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={props.onClick}
          className="h-7 w-7 p-0 text-gold hover:text-gold hover:bg-gold/15 shrink-0"
          aria-label={props.text}
        >
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      ) : null}
    </div>
  );
}
