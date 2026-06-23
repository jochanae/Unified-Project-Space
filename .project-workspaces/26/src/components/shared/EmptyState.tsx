import { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  actionPath?: string;
  onAction?: () => void;
  variant?: 'default' | 'minimal' | 'glass';
  className?: string;
}

export const EmptyState = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionPath,
  onAction,
  variant = 'default',
  className = '',
}: EmptyStateProps) => {
  const navigate = useNavigate();

  const handleAction = () => {
    if (onAction) {
      onAction();
    } else if (actionPath) {
      navigate(actionPath);
    }
  };

  const baseStyles = 'flex flex-col items-center justify-center text-center p-6 rounded-2xl animate-fade-in';
  
  const variantStyles = {
    default: 'bg-card/50 border border-border/50',
    minimal: 'bg-transparent',
    glass: 'bg-card/30 backdrop-blur-md border border-border/30 shadow-lg',
  };

  return (
    <div className={`${baseStyles} ${variantStyles[variant]} ${className}`}>
      <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
        <Icon className="h-8 w-8 text-primary" />
      </div>
      
      <h3 className="text-lg font-semibold text-foreground mb-2">
        {title}
      </h3>
      
      <p className="text-muted-foreground text-sm max-w-xs mb-4">
        {description}
      </p>
      
      {(actionLabel && (actionPath || onAction)) && (
        <Button 
          onClick={handleAction}
          className="gradient-primary text-primary-foreground hover:opacity-90 transition-opacity"
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
};

export default EmptyState;
