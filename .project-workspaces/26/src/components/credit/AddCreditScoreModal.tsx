import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { CalendarIcon, Loader2, Mail } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface AddCreditScoreModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  previousScore?: number;
  significantChangeThreshold?: number;
}

const bureaus = [
  { value: 'Experian', label: 'Experian' },
  { value: 'Equifax', label: 'Equifax' },
  { value: 'TransUnion', label: 'TransUnion' },
];

const AddCreditScoreModal = ({ 
  open, 
  onOpenChange, 
  onSuccess,
  previousScore,
  significantChangeThreshold = 20
}: AddCreditScoreModalProps) => {
  const { user } = useAuth();
  const [score, setScore] = useState('');
  const [bureau, setBureau] = useState('Experian');
  const [scoreDate, setScoreDate] = useState<Date>(new Date());
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sendEmailAlert, setSendEmailAlert] = useState(true);

  const checkAndSendAlert = async (newScore: number) => {
    if (!previousScore || !sendEmailAlert) return;

    const change = newScore - previousScore;
    
    // Check if change is significant
    if (Math.abs(change) >= significantChangeThreshold) {
      try {
        const { error } = await supabase.functions.invoke('credit-score-alert', {
          body: {
            userEmail: user?.email,
            userName: user?.user_metadata?.first_name || 'User',
            previousScore,
            newScore,
            change,
            bureau,
            scoreDate: format(scoreDate, 'yyyy-MM-dd')
          }
        });

        if (error) {
          console.error('Error sending email alert:', error);
          // Don't show error to user, just log it
        } else {
          toast.success('Email alert sent for significant score change!');
        }
      } catch (error) {
        console.error('Error invoking credit-score-alert function:', error);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('You must be logged in to add a credit score');
      return;
    }

    const scoreNum = parseInt(score);
    if (isNaN(scoreNum) || scoreNum < 300 || scoreNum > 850) {
      toast.error('Please enter a valid credit score between 300 and 850');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const { error } = await supabase.from('credit_scores').insert({
        user_id: user.id,
        score: scoreNum,
        bureau,
        score_date: format(scoreDate, 'yyyy-MM-dd'),
        notes: notes.trim() || null,
      });

      if (error) throw error;

      // Send email alert if significant change detected
      await checkAndSendAlert(scoreNum);

      toast.success('Credit score added successfully!');
      onSuccess();
      onOpenChange(false);
      
      // Reset form
      setScore('');
      setBureau('Experian');
      setScoreDate(new Date());
      setNotes('');
    } catch (error) {
      console.error('Error adding credit score:', error);
      toast.error('Failed to add credit score');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Credit Score</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="score">Credit Score</Label>
            <Input
              id="score"
              type="number"
              min={300}
              max={850}
              placeholder="Enter score (300-850)"
              value={score}
              onChange={(e) => setScore(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              Enter your credit score from your credit report
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bureau">Credit Bureau</Label>
            <Select value={bureau} onValueChange={setBureau}>
              <SelectTrigger>
                <SelectValue placeholder="Select bureau" />
              </SelectTrigger>
              <SelectContent>
                {bureaus.map((b) => (
                  <SelectItem key={b.value} value={b.value}>
                    {b.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Score Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !scoreDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {scoreDate ? format(scoreDate, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={scoreDate}
                  onSelect={(date) => date && setScoreDate(date)}
                  initialFocus
                  disabled={(date) => date > new Date()}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Any notes about this score..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          {previousScore && (
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Email Alerts</p>
                  <p className="text-xs text-muted-foreground">
                    Get notified if score changes by {significantChangeThreshold}+ points
                  </p>
                </div>
              </div>
              <Switch
                checked={sendEmailAlert}
                onCheckedChange={setSendEmailAlert}
              />
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="flex-1">
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Add Score'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddCreditScoreModal;
