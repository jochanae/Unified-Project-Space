import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { History, Trash2, TrendingUp, TrendingDown, Minus, MoreVertical } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface CreditScore {
  id: string;
  score: number;
  bureau: string;
  score_date: string;
  notes: string | null;
  created_at: string;
}

interface CreditScoreHistoryProps {
  creditScores: CreditScore[];
  isLoading: boolean;
  onRefresh: () => void;
}

const getScoreColor = (score: number): string => {
  if (score >= 800) return 'text-emerald-500';
  if (score >= 740) return 'text-green-500';
  if (score >= 670) return 'text-lime-500';
  if (score >= 580) return 'text-yellow-500';
  return 'text-red-500';
};

const getBureauColor = (bureau: string): string => {
  switch (bureau) {
    case 'Experian': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    case 'Equifax': return 'bg-red-500/20 text-red-400 border-red-500/30';
    case 'TransUnion': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
    default: return 'bg-muted text-muted-foreground';
  }
};

const CreditScoreHistory = ({ creditScores, isLoading, onRefresh }: CreditScoreHistoryProps) => {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!deleteId) return;
    
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('credit_scores')
        .delete()
        .eq('id', deleteId);

      if (error) throw error;
      
      toast.success('Credit score deleted');
      onRefresh();
    } catch (error) {
      console.error('Error deleting credit score:', error);
      toast.error('Failed to delete credit score');
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (creditScores.length === 0) {
    return null;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            Score History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {creditScores.map((score, index) => {
              const prevScore = creditScores[index + 1];
              const change = prevScore ? score.score - prevScore.score : 0;
              
              return (
                <motion.div
                  key={score.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center justify-between p-4 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col">
                      <span className={`text-2xl font-bold ${getScoreColor(score.score)}`}>
                        {score.score}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {format(parseISO(score.score_date), 'MMM d, yyyy')}
                      </span>
                    </div>
                    
                    <div className="flex flex-col gap-1">
                      <Badge variant="outline" className={getBureauColor(score.bureau)}>
                        {score.bureau}
                      </Badge>
                      {change !== 0 && (
                        <div className={`flex items-center gap-1 text-xs ${
                          change > 0 ? 'text-emerald-400' : 'text-red-400'
                        }`}>
                          {change > 0 ? (
                            <TrendingUp className="h-3 w-3" />
                          ) : (
                            <TrendingDown className="h-3 w-3" />
                          )}
                          <span>{change > 0 ? '+' : ''}{change} pts</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {score.notes && (
                      <span className="text-xs text-muted-foreground max-w-[150px] truncate hidden sm:block">
                        {score.notes}
                      </span>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => setDeleteId(score.id)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Credit Score</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this credit score? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default CreditScoreHistory;
