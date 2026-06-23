import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Bug, MessageSquare, Lightbulb, Star, AlertCircle, Eye, Trash2 } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Json } from '@/integrations/supabase/types';

interface FeedbackItem {
  id: string;
  user_id: string | null;
  type: string;
  title: string | null;
  message: string;
  rating: number | null;
  error_data: Json | null;
  page_url: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
}

const typeConfig: Record<string, { icon: typeof Bug; label: string; color: string }> = {
  error: { icon: AlertCircle, label: 'Error', color: 'text-destructive bg-destructive/10' },
  bug: { icon: Bug, label: 'Bug', color: 'text-destructive bg-destructive/10' },
  feedback: { icon: MessageSquare, label: 'Feedback', color: 'text-primary bg-primary/10' },
  feature_request: { icon: Lightbulb, label: 'Feature', color: 'text-gold bg-gold/10' },
  satisfaction: { icon: Star, label: 'Rating', color: 'text-gain bg-gain/10' },
};

const statusConfig: Record<string, string> = {
  new: 'bg-blue-500/10 text-blue-500',
  reviewed: 'bg-amber-500/10 text-amber-500',
  in_progress: 'bg-primary/10 text-primary',
  resolved: 'bg-gain/10 text-gain',
  dismissed: 'bg-muted text-muted-foreground',
};

export function AdminFeedback() {
  const [selectedItem, setSelectedItem] = useState<FeedbackItem | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [adminNotes, setAdminNotes] = useState('');
  const queryClient = useQueryClient();

  const { data: feedback, isLoading } = useQuery({
    queryKey: ['admin-feedback'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feedback')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as FeedbackItem[];
    },
  });

  const updateFeedback = useMutation({
    mutationFn: async ({ id, status, admin_notes }: { id: string; status?: string; admin_notes?: string }) => {
      const updates: Record<string, string> = {};
      if (status) updates.status = status;
      if (admin_notes !== undefined) updates.admin_notes = admin_notes;

      const { error } = await supabase
        .from('feedback')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-feedback'] });
      toast.success('Feedback updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update: ${error.message}`);
    },
  });

  const dismissAll = useMutation({
    mutationFn: async () => {
      const ids = filteredFeedback?.map((f) => f.id) || [];
      if (ids.length === 0) return;
      const { error } = await supabase
        .from('feedback')
        .delete()
        .in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-feedback'] });
      toast.success('All visible items deleted');
    },
    onError: (error: Error) => {
      toast.error(`Failed: ${error.message}`);
    },
  });

  const filteredFeedback = feedback?.filter((item) => {
    if (filterType !== 'all' && item.type !== filterType) return false;
    if (filterStatus !== 'all' && item.status !== filterStatus) return false;
    return true;
  });

  const openDetails = (item: FeedbackItem) => {
    setSelectedItem(item);
    setAdminNotes(item.admin_notes || '');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="md" />
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3">
            <div>
              <CardTitle>Feedback & Reports</CardTitle>
              <CardDescription>Review user feedback, bug reports, and errors</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-28 h-9 text-xs">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="error">Errors</SelectItem>
                  <SelectItem value="bug">Bugs</SelectItem>
                  <SelectItem value="feedback">Feedback</SelectItem>
                  <SelectItem value="feature_request">Features</SelectItem>
                  <SelectItem value="satisfaction">Ratings</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-28 h-9 text-xs">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="reviewed">Reviewed</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="dismissed">Dismissed</SelectItem>
                </SelectContent>
              </Select>
              {filteredFeedback && filteredFeedback.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 text-xs"
                  onClick={() => dismissAll.mutate()}
                  disabled={dismissAll.isPending}
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Dismiss All ({filteredFeedback.length})
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Mobile card layout */}
          <div className="space-y-3">
            {filteredFeedback?.map((item) => {
              const config = typeConfig[item.type] || typeConfig.feedback;
              const TypeIcon = config.icon;
              return (
                <div
                  key={item.id}
                  className="border border-border/50 rounded-xl p-3 space-y-2 cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() => openDetails(item)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="secondary" className={`${config.color} text-[11px]`}>
                      <TypeIcon className="h-3 w-3 mr-1" />
                      {config.label}
                    </Badge>
                    <Badge variant="secondary" className={`${statusConfig[item.status]} text-[11px]`}>
                      {item.status}
                    </Badge>
                  </div>
                  <p className="text-sm leading-snug line-clamp-2">
                    {item.title || item.message.substring(0, 80)}
                  </p>
                  {item.page_url && (
                    <p className="text-[11px] text-muted-foreground truncate">
                      {item.page_url.replace(/https?:\/\/[^/]+/, '')}
                    </p>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground">
                      {format(new Date(item.created_at), 'MMM d, yyyy · h:mm a')}
                    </span>
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                      <Eye className="h-3 w-3 mr-1" />
                      View
                    </Button>
                  </div>
                </div>
              );
            })}
            {(!filteredFeedback || filteredFeedback.length === 0) && (
              <div className="text-center py-8 text-muted-foreground">
                No feedback items found
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Feedback Details</DialogTitle>
            <DialogDescription>
              Submitted {selectedItem && format(new Date(selectedItem.created_at), 'PPpp')}
            </DialogDescription>
          </DialogHeader>

          {selectedItem && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Type</label>
                <div className="mt-1">
                  <Badge variant="secondary" className={typeConfig[selectedItem.type]?.color}>
                    {typeConfig[selectedItem.type]?.label || selectedItem.type}
                  </Badge>
                </div>
              </div>

              {selectedItem.title && (
                <div>
                  <label className="text-sm font-medium">Subject</label>
                  <p className="mt-1 text-sm text-muted-foreground break-words">{selectedItem.title}</p>
                </div>
              )}

              <div>
                <label className="text-sm font-medium">Message</label>
                <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap break-words">
                  {selectedItem.message}
                </p>
              </div>

              {selectedItem.rating && (
                <div>
                  <label className="text-sm font-medium">Rating</label>
                  <p className="mt-1 text-gold text-lg">
                    {'★'.repeat(selectedItem.rating)}{'☆'.repeat(5 - selectedItem.rating)}
                  </p>
                </div>
              )}

              {selectedItem.error_data && (
                <div>
                  <label className="text-sm font-medium">Error Details</label>
                  <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-auto max-h-32 break-all whitespace-pre-wrap">
                    {JSON.stringify(selectedItem.error_data, null, 2)}
                  </pre>
                </div>
              )}

              {selectedItem.page_url && (
                <div>
                  <label className="text-sm font-medium">Page</label>
                  <p className="mt-1 text-xs text-muted-foreground break-all">
                    {selectedItem.page_url}
                  </p>
                </div>
              )}

              <div>
                <label className="text-sm font-medium">Status</label>
                <Select
                  value={selectedItem.status}
                  onValueChange={(status) =>
                    updateFeedback.mutate({ id: selectedItem.id, status })
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="reviewed">Reviewed</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="dismissed">Dismissed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Admin Notes</label>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add internal notes..."
                  className="mt-1"
                  rows={3}
                />
                <Button
                  size="sm"
                  className="mt-2"
                  onClick={() =>
                    updateFeedback.mutate({ id: selectedItem.id, admin_notes: adminNotes })
                  }
                  disabled={updateFeedback.isPending}
                >
                  Save Notes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
