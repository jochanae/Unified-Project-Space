import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { 
  Calendar, 
  Clock, 
  Plus, 
  Trash2, 
  MessageSquare, 
  Bot, 
  Loader2,
  Send,
  Edit
} from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { toast } from 'sonner';
import { format } from 'date-fns';

type PostType = 'trade_idea' | 'discussion' | 'chat_message';
type Frequency = 'daily' | 'weekly' | 'monthly';
type TriggerType = 'quiet_thread' | 'new_user_post' | 'keywords' | 'scheduled';

interface ScheduledPost {
  id: string;
  post_type: PostType;
  title: string | null;
  content: string;
  symbol?: string | null;
  trade_direction?: string | null;
  asset_class?: string | null;
  category?: string | null;
  scheduled_for: string;
  status: string;
  created_at: string;
}

interface DiscussionPrompt {
  id: string;
  title: string;
  content: string;
  category: string;
  frequency: Frequency;
  day_of_week?: number | null;
  time_of_day: string;
  is_active: boolean;
  next_post_at: string | null;
}

interface BotTemplate {
  id: string;
  trigger_type: TriggerType;
  trigger_keywords: string[] | null;
  reply_templates: string[];
  min_hours_quiet: number | null;
  is_active: boolean;
}

export function AdminContentAutomation() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('scheduled');
  
  // Scheduled Posts
  const { data: scheduledPosts = [], isLoading: loadingPosts } = useQuery({
    queryKey: ['admin-scheduled-posts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scheduled_posts')
        .select('*')
        .order('scheduled_for', { ascending: true });
      if (error) throw error;
      return data as ScheduledPost[];
    },
  });

  // Discussion Prompts
  const { data: prompts = [], isLoading: loadingPrompts } = useQuery({
    queryKey: ['admin-discussion-prompts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('discussion_prompts')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as DiscussionPrompt[];
    },
  });

  // Bot Templates
  const { data: templates = [], isLoading: loadingTemplates } = useQuery({
    queryKey: ['admin-bot-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bot_reply_templates')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as BotTemplate[];
    },
  });

  const deletePost = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('scheduled_posts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-scheduled-posts'] });
      toast.success('Post deleted');
    },
  });

  const togglePrompt = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('discussion_prompts')
        .update({ is_active })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-discussion-prompts'] });
      toast.success('Prompt updated');
    },
  });

  const toggleTemplate = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('bot_reply_templates')
        .update({ is_active })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-bot-templates'] });
      toast.success('Template updated');
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-5 w-5" />
          Content Automation
        </CardTitle>
        <CardDescription>
          Schedule posts, create discussion prompts, and configure automated replies
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="scheduled" className="gap-2">
              <Calendar className="h-4 w-4" />
              Scheduled ({scheduledPosts.filter(p => p.status === 'pending').length})
            </TabsTrigger>
            <TabsTrigger value="prompts" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              Prompts ({prompts.filter(p => p.is_active).length})
            </TabsTrigger>
            <TabsTrigger value="bot" className="gap-2">
              <Bot className="h-4 w-4" />
              Bot Replies ({templates.filter(t => t.is_active).length})
            </TabsTrigger>
          </TabsList>

          {/* Scheduled Posts Tab */}
          <TabsContent value="scheduled" className="mt-4">
            <div className="flex justify-end mb-4">
              <ScheduledPostDialog userId={user?.id} />
            </div>
            
            {loadingPosts ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner size="sm" />
              </div>
            ) : scheduledPosts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No scheduled posts yet. Create one to get started!
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Content</TableHead>
                    <TableHead>Scheduled For</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scheduledPosts.map((post) => (
                    <TableRow key={post.id}>
                      <TableCell>
                        <Badge variant="outline">{post.post_type.replace('_', ' ')}</Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {post.title || post.content.slice(0, 50)}...
                      </TableCell>
                      <TableCell>
                        {format(new Date(post.scheduled_for), 'MMM d, yyyy h:mm a')}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={post.status === 'pending' ? 'secondary' : 
                                   post.status === 'published' ? 'default' : 'destructive'}
                        >
                          {post.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deletePost.mutate(post.id)}
                          disabled={post.status === 'published'}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>

          {/* Discussion Prompts Tab */}
          <TabsContent value="prompts" className="mt-4">
            <div className="flex justify-end mb-4">
              <PromptDialog userId={user?.id} />
            </div>
            
            {loadingPrompts ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner size="sm" />
              </div>
            ) : prompts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No discussion prompts configured. Create recurring topics to engage your community!
              </div>
            ) : (
              <div className="space-y-4">
                {prompts.map((prompt) => (
                  <Card key={prompt.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <h4 className="font-medium">{prompt.title}</h4>
                        <p className="text-sm text-muted-foreground line-clamp-2">{prompt.content}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Badge variant="outline">{prompt.category}</Badge>
                          <span>•</span>
                          <span className="capitalize">{prompt.frequency}</span>
                          <span>•</span>
                          <Clock className="h-3 w-3" />
                          <span>{prompt.time_of_day}</span>
                        </div>
                      </div>
                      <Switch
                        checked={prompt.is_active}
                        onCheckedChange={(checked) => 
                          togglePrompt.mutate({ id: prompt.id, is_active: checked })
                        }
                      />
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Bot Replies Tab */}
          <TabsContent value="bot" className="mt-4">
            <div className="flex justify-end mb-4">
              <BotTemplateDialog userId={user?.id} />
            </div>
            
            {loadingTemplates ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner size="sm" />
              </div>
            ) : templates.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No bot templates configured. Add automated replies to keep conversations active!
              </div>
            ) : (
              <div className="space-y-4">
                {templates.map((template) => (
                  <Card key={template.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <Badge variant="outline" className="capitalize">
                          {template.trigger_type.replace('_', ' ')}
                        </Badge>
                        {template.trigger_keywords && template.trigger_keywords.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {template.trigger_keywords.map((kw) => (
                              <Badge key={kw} variant="secondary" className="text-xs">
                                {kw}
                              </Badge>
                            ))}
                          </div>
                        )}
                        <p className="text-sm text-muted-foreground">
                          {template.reply_templates.length} reply template(s)
                        </p>
                        {template.min_hours_quiet && (
                          <p className="text-xs text-muted-foreground">
                            Triggers after {template.min_hours_quiet}h of inactivity
                          </p>
                        )}
                      </div>
                      <Switch
                        checked={template.is_active}
                        onCheckedChange={(checked) => 
                          toggleTemplate.mutate({ id: template.id, is_active: checked })
                        }
                      />
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

// Dialog for creating scheduled posts
function ScheduledPostDialog({ userId }: { userId?: string }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [postType, setPostType] = useState<PostType>('discussion');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [symbol, setSymbol] = useState('');
  const [direction, setDirection] = useState('long');
  const [assetClass, setAssetClass] = useState('stocks');
  const [category, setCategory] = useState('general');
  const [scheduledFor, setScheduledFor] = useState('');

  const handleSubmit = async () => {
    if (!userId || !content || !scheduledFor) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('scheduled_posts').insert({
        created_by: userId,
        post_type: postType,
        title: title || null,
        content,
        symbol: postType === 'trade_idea' ? symbol : null,
        trade_direction: postType === 'trade_idea' ? direction : null,
        asset_class: postType === 'trade_idea' ? assetClass : null,
        category: postType === 'discussion' ? category : null,
        scheduled_for: new Date(scheduledFor).toISOString(),
      });

      if (error) throw error;

      toast.success('Post scheduled!');
      queryClient.invalidateQueries({ queryKey: ['admin-scheduled-posts'] });
      setOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error scheduling post:', error);
      toast.error('Failed to schedule post');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setContent('');
    setSymbol('');
    setScheduledFor('');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Schedule Post
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Schedule a Post</DialogTitle>
          <DialogDescription>
            Create content that will be automatically published at a specific time.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Post Type</Label>
            <Select value={postType} onValueChange={(v) => setPostType(v as PostType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="trade_idea">Trade Idea</SelectItem>
                <SelectItem value="discussion">Discussion Thread</SelectItem>
                <SelectItem value="chat_message">Chat Message</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Title</Label>
            <Input 
              value={title} 
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Post title..."
            />
          </div>

          {postType === 'trade_idea' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Symbol</Label>
                <Input 
                  value={symbol} 
                  onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                  placeholder="AAPL"
                />
              </div>
              <div className="space-y-2">
                <Label>Direction</Label>
                <Select value={direction} onValueChange={setDirection}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="long">Long</SelectItem>
                    <SelectItem value="short">Short</SelectItem>
                    <SelectItem value="neutral">Neutral</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {postType === 'discussion' && (
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="strategies">Strategies</SelectItem>
                  <SelectItem value="analysis">Analysis</SelectItem>
                  <SelectItem value="help">Help & Questions</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Content *</Label>
            <Textarea 
              value={content} 
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your post content..."
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label>Schedule For *</Label>
            <Input 
              type="datetime-local"
              value={scheduledFor}
              onChange={(e) => setScheduledFor(e.target.value)}
            />
          </div>

          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting}
            className="w-full gap-2"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Schedule Post
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Dialog for creating discussion prompts
function PromptDialog({ userId }: { userId?: string }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('general');
  const [frequency, setFrequency] = useState<Frequency>('weekly');
  const [dayOfWeek, setDayOfWeek] = useState('1');
  const [timeOfDay, setTimeOfDay] = useState('09:00');

  const handleSubmit = async () => {
    if (!userId || !title || !content) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('discussion_prompts').insert({
        created_by: userId,
        title,
        content,
        category,
        frequency,
        day_of_week: frequency === 'weekly' ? parseInt(dayOfWeek) : null,
        time_of_day: timeOfDay,
        is_active: true,
      });

      if (error) throw error;

      toast.success('Prompt created!');
      queryClient.invalidateQueries({ queryKey: ['admin-discussion-prompts'] });
      setOpen(false);
    } catch (error) {
      console.error('Error creating prompt:', error);
      toast.error('Failed to create prompt');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Add Prompt
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Discussion Prompt</DialogTitle>
          <DialogDescription>
            Set up recurring discussion topics to engage your community.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Title *</Label>
            <Input 
              value={title} 
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Weekly Trading Wins Thread"
            />
          </div>

          <div className="space-y-2">
            <Label>Content *</Label>
            <Textarea 
              value={content} 
              onChange={(e) => setContent(e.target.value)}
              placeholder="Share your best trades this week..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="strategies">Strategies</SelectItem>
                  <SelectItem value="analysis">Analysis</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Frequency</Label>
              <Select value={frequency} onValueChange={(v) => setFrequency(v as Frequency)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {frequency === 'weekly' && (
            <div className="space-y-2">
              <Label>Day of Week</Label>
              <Select value={dayOfWeek} onValueChange={setDayOfWeek}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Sunday</SelectItem>
                  <SelectItem value="1">Monday</SelectItem>
                  <SelectItem value="2">Tuesday</SelectItem>
                  <SelectItem value="3">Wednesday</SelectItem>
                  <SelectItem value="4">Thursday</SelectItem>
                  <SelectItem value="5">Friday</SelectItem>
                  <SelectItem value="6">Saturday</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Time of Day</Label>
            <Input 
              type="time"
              value={timeOfDay}
              onChange={(e) => setTimeOfDay(e.target.value)}
            />
          </div>

          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting}
            className="w-full"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Create Prompt
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Dialog for creating bot templates
function BotTemplateDialog({ userId }: { userId?: string }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [triggerType, setTriggerType] = useState<TriggerType>('quiet_thread');
  const [keywords, setKeywords] = useState('');
  const [replies, setReplies] = useState('');
  const [minHours, setMinHours] = useState('24');

  const handleSubmit = async () => {
    if (!userId || !replies) {
      toast.error('Please add at least one reply template');
      return;
    }

    setIsSubmitting(true);
    try {
      const replyArray = replies.split('\n').filter(r => r.trim());
      const keywordArray = keywords ? keywords.split(',').map(k => k.trim()) : null;

      const { error } = await supabase.from('bot_reply_templates').insert({
        created_by: userId,
        trigger_type: triggerType,
        trigger_keywords: triggerType === 'keywords' ? keywordArray : null,
        reply_templates: replyArray,
        min_hours_quiet: triggerType === 'quiet_thread' ? parseInt(minHours) : null,
        is_active: true,
      });

      if (error) throw error;

      toast.success('Bot template created!');
      queryClient.invalidateQueries({ queryKey: ['admin-bot-templates'] });
      setOpen(false);
    } catch (error) {
      console.error('Error creating template:', error);
      toast.error('Failed to create template');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Add Template
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Bot Reply Template</DialogTitle>
          <DialogDescription>
            Configure automated replies to keep your community engaged.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Trigger Type</Label>
            <Select value={triggerType} onValueChange={(v) => setTriggerType(v as TriggerType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="quiet_thread">Quiet Thread</SelectItem>
                <SelectItem value="new_user_post">New User Post</SelectItem>
                <SelectItem value="keywords">Keywords Match</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {triggerType === 'quiet_thread' && (
            <div className="space-y-2">
              <Label>Hours of Inactivity</Label>
              <Input 
                type="number"
                value={minHours}
                onChange={(e) => setMinHours(e.target.value)}
                min="1"
                max="168"
              />
            </div>
          )}

          {triggerType === 'keywords' && (
            <div className="space-y-2">
              <Label>Keywords (comma-separated)</Label>
              <Input 
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                placeholder="help, question, newbie"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>Reply Templates (one per line) *</Label>
            <Textarea 
              value={replies}
              onChange={(e) => setReplies(e.target.value)}
              placeholder="Great question! Here's what I think...&#10;Welcome to the community! Feel free to ask anything.&#10;This is a common topic - check out our guides!"
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              The bot will randomly pick one of these replies.
            </p>
          </div>

          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting}
            className="w-full"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Create Template
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
