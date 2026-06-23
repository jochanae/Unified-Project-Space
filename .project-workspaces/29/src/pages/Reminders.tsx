import { useState } from 'react';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { useReminders, Reminder } from '@/hooks/useReminders';
import { PushNotificationToggle } from '@/components/notifications/PushNotificationToggle';
import { Clock, Plus, MoreHorizontal, Pencil, Trash2, Check, X, TrendingUp, BookOpen, Calendar, Bell, Smartphone } from 'lucide-react';
import { format, isToday, isTomorrow, isPast } from 'date-fns';
import { cn } from '@/lib/utils';

const typeConfig: Record<Reminder['type'], { icon: typeof Clock; color: string; label: string }> = {
  trade: { icon: TrendingUp, color: 'text-chart-4 bg-chart-4/10', label: 'Trade' },
  learning: { icon: BookOpen, color: 'text-chart-3 bg-chart-3/10', label: 'Learning' },
  journal: { icon: Calendar, color: 'text-primary bg-primary/10', label: 'Journal' },
};

function formatTriggerTime(dateStr: string) {
  const date = new Date(dateStr);
  if (isToday(date)) {
    return `Today at ${format(date, 'h:mm a')}`;
  }
  if (isTomorrow(date)) {
    return `Tomorrow at ${format(date, 'h:mm a')}`;
  }
  return format(date, 'MMM d, yyyy h:mm a');
}

interface ReminderFormData {
  title: string;
  description: string;
  type: 'trade' | 'learning' | 'journal';
  trigger_at: string;
  repeat_interval: 'none' | 'daily' | 'weekly' | 'monthly';
}

const defaultFormData: ReminderFormData = {
  title: '',
  description: '',
  type: 'trade',
  trigger_at: '',
  repeat_interval: 'none',
};

export default function Reminders() {
  const { reminders, isLoading, createReminder, updateReminder, completeReminder, dismissReminder, deleteReminder } = useReminders();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  const [formData, setFormData] = useState<ReminderFormData>(defaultFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreate = async () => {
    if (!formData.title || !formData.trigger_at) return;
    
    setIsSubmitting(true);
    await createReminder({
      title: formData.title,
      description: formData.description || undefined,
      type: formData.type,
      trigger_at: new Date(formData.trigger_at).toISOString(),
      repeat_interval: formData.repeat_interval,
    });
    setIsSubmitting(false);
    setFormData(defaultFormData);
    setIsCreateOpen(false);
  };

  const handleEdit = async () => {
    if (!editingReminder || !formData.title || !formData.trigger_at) return;
    
    setIsSubmitting(true);
    await updateReminder(editingReminder.id, {
      title: formData.title,
      description: formData.description || undefined,
      type: formData.type,
      trigger_at: new Date(formData.trigger_at).toISOString(),
      repeat_interval: formData.repeat_interval,
    });
    setIsSubmitting(false);
    setEditingReminder(null);
    setFormData(defaultFormData);
    setIsEditOpen(false);
  };

  const openEditDialog = (reminder: Reminder) => {
    setEditingReminder(reminder);
    setFormData({
      title: reminder.title,
      description: reminder.description || '',
      type: reminder.type,
      trigger_at: format(new Date(reminder.trigger_at), "yyyy-MM-dd'T'HH:mm"),
      repeat_interval: reminder.repeat_interval,
    });
    setIsEditOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await deleteReminder(deleteId);
    setDeleteId(null);
  };

  const activeReminders = reminders.filter(r => !r.is_completed && !r.is_dismissed);
  const completedReminders = reminders.filter(r => r.is_completed);

  return (
    <DashboardLayout>
      <div className="container mx-auto p-4 md:p-6 space-y-6 pb-24">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
              <Bell className="h-6 w-6 md:h-7 md:w-7 text-primary" />
              Reminders
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage your trading, learning, and journaling reminders
            </p>
          </div>
          
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="glow-button">
                <Plus className="h-4 w-4 mr-2" />
                New Reminder
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Reminder</DialogTitle>
                <DialogDescription>
                  Set up a new reminder to stay on track with your trading goals.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    placeholder="Review market open..."
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description (optional)</Label>
                  <Textarea
                    id="description"
                    placeholder="Add more details..."
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select
                      value={formData.type}
                      onValueChange={(value: 'trade' | 'learning' | 'journal') => 
                        setFormData(prev => ({ ...prev, type: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="trade">Trade</SelectItem>
                        <SelectItem value="learning">Learning</SelectItem>
                        <SelectItem value="journal">Journal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Repeat</Label>
                    <Select
                      value={formData.repeat_interval}
                      onValueChange={(value: 'none' | 'daily' | 'weekly' | 'monthly') => 
                        setFormData(prev => ({ ...prev, repeat_interval: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">One-time</SelectItem>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="trigger_at">Date & Time</Label>
                  <Input
                    id="trigger_at"
                    type="datetime-local"
                    value={formData.trigger_at}
                    onChange={(e) => setFormData(prev => ({ ...prev, trigger_at: e.target.value }))}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreate} disabled={isSubmitting || !formData.title || !formData.trigger_at}>
                  {isSubmitting ? 'Creating...' : 'Create Reminder'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Push Notification Settings */}
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-primary" />
              Stay Notified
            </CardTitle>
            <CardDescription>
              Enable push notifications to receive alerts on your device when reminders are due — even when the app is closed.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PushNotificationToggle />
          </CardContent>
        </Card>

        {/* Active Reminders */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Active Reminders
            </CardTitle>
            <CardDescription>
              {activeReminders.length} active reminder{activeReminders.length !== 1 ? 's' : ''}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent" />
              </div>
            ) : activeReminders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No active reminders</p>
                <p className="text-sm mt-1">Create one to stay on track!</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead className="hidden md:table-cell">Description</TableHead>
                      <TableHead>Due</TableHead>
                      <TableHead className="hidden sm:table-cell">Repeat</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeReminders.map((reminder) => {
                      const config = typeConfig[reminder.type];
                      const Icon = config.icon;
                      const isOverdue = isPast(new Date(reminder.trigger_at));
                      
                      return (
                        <TableRow key={reminder.id}>
                          <TableCell>
                            <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg', config.color)}>
                              <Icon className="h-4 w-4" />
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">{reminder.title}</TableCell>
                          <TableCell className="hidden md:table-cell text-muted-foreground max-w-[200px] truncate">
                            {reminder.description || '-'}
                          </TableCell>
                          <TableCell>
                            <span className={cn(isOverdue && 'text-warning')}>
                              {formatTriggerTime(reminder.trigger_at)}
                            </span>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            {reminder.repeat_interval !== 'none' ? (
                              <Badge variant="secondary" className="capitalize">
                                {reminder.repeat_interval}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-gain hover:text-gain hover:bg-gain/10"
                                onClick={() => completeReminder(reminder.id)}
                                title="Complete"
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => openEditDialog(reminder)}>
                                    <Pencil className="h-4 w-4 mr-2" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => dismissReminder(reminder.id)}>
                                    <X className="h-4 w-4 mr-2" />
                                    Dismiss
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={() => setDeleteId(reminder.id)}
                                    className="text-destructive focus:text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Completed Reminders */}
        {completedReminders.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Check className="h-5 w-5 text-gain" />
                Completed
              </CardTitle>
              <CardDescription>
                {completedReminders.length} completed reminder{completedReminders.length !== 1 ? 's' : ''}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Was Due</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {completedReminders.map((reminder) => {
                      const config = typeConfig[reminder.type];
                      const Icon = config.icon;
                      
                      return (
                        <TableRow key={reminder.id} className="opacity-60">
                          <TableCell>
                            <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg', config.color)}>
                              <Icon className="h-4 w-4" />
                            </div>
                          </TableCell>
                          <TableCell className="font-medium line-through">{reminder.title}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatTriggerTime(reminder.trigger_at)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={() => setDeleteId(reminder.id)}
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Edit Dialog */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Reminder</DialogTitle>
              <DialogDescription>
                Update your reminder details.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-title">Title</Label>
                <Input
                  id="edit-title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description">Description (optional)</Label>
                <Textarea
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value: 'trade' | 'learning' | 'journal') => 
                      setFormData(prev => ({ ...prev, type: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="trade">Trade</SelectItem>
                      <SelectItem value="learning">Learning</SelectItem>
                      <SelectItem value="journal">Journal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Repeat</Label>
                  <Select
                    value={formData.repeat_interval}
                    onValueChange={(value: 'none' | 'daily' | 'weekly' | 'monthly') => 
                      setFormData(prev => ({ ...prev, repeat_interval: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">One-time</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-trigger_at">Date & Time</Label>
                <Input
                  id="edit-trigger_at"
                  type="datetime-local"
                  value={formData.trigger_at}
                  onChange={(e) => setFormData(prev => ({ ...prev, trigger_at: e.target.value }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleEdit} disabled={isSubmitting || !formData.title || !formData.trigger_at}>
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Reminder</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this reminder? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
