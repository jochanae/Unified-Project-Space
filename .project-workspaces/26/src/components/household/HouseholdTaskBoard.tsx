import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, CalendarDays, CalendarRange, List, RotateCcw, Users, ChevronLeft, ChevronRight, Check, Clock, Repeat, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format, startOfWeek, endOfWeek, addDays, addWeeks, subWeeks, startOfMonth, endOfMonth, addMonths, subMonths, eachDayOfInterval, isSameDay, isToday } from "date-fns";
import { CreateTaskModal } from "./CreateTaskModal";
import { AssignTaskModal } from "./AssignTaskModal";
import { QuickSetupModal } from "./QuickSetupModal";
import { cn } from "@/lib/utils";

interface HouseholdTask {
  id: string;
  title: string;
  description: string | null;
  default_reward: number;
  category: string;
  is_recurring: boolean;
  recurrence_pattern: string;
  rotation_enabled: boolean;
  is_active: boolean;
}

interface TaskAssignment {
  id: string;
  task_id: string;
  assigned_to_user_id: string | null;
  assigned_to_kid_id: string | null;
  reward_amount: number;
  due_date: string | null;
  status: string;
  completed_at: string | null;
  household_tasks?: HouseholdTask;
  kids_profiles?: { display_name: string; avatar_emoji: string } | null;
  profiles?: { first_name: string; last_name: string } | null;
}

interface AssignableMember {
  id: string;
  name: string;
  type: "kid" | "adult";
  avatar?: string;
}

interface HouseholdTaskBoardProps {
  familyGroupId?: string;
  linkedKids: Array<{
    kid_profile_id: string;
    kid_profile: {
      id: string;
      display_name: string;
      avatar_emoji: string;
    };
  }>;
  onRefresh?: () => void;
}

export const HouseholdTaskBoard = ({ familyGroupId, linkedKids, onRefresh }: HouseholdTaskBoardProps) => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<HouseholdTask[]>([]);
  const [assignments, setAssignments] = useState<TaskAssignment[]>([]);
  const [view, setView] = useState<"list" | "week" | "month">("list");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showQuickSetup, setShowQuickSetup] = useState(false);
  const [selectedTask, setSelectedTask] = useState<HouseholdTask | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const assignableMembers: AssignableMember[] = linkedKids.map(k => ({
    id: k.kid_profile_id,
    name: k.kid_profile.display_name,
    type: "kid" as const,
    avatar: k.kid_profile.avatar_emoji
  }));

  const fetchTasks = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from("household_tasks")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setTasks(data);
    }
  };

  const fetchAssignments = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("household_task_assignments")
      .select(`
        *,
        household_tasks(*),
        kids_profiles(display_name, avatar_emoji)
      `)
      .eq("assigned_by", user.id)
      .order("due_date", { ascending: true });

    if (!error && data) {
      setAssignments(data as any);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchTasks();
    fetchAssignments();
  }, [user]);

  const handleQuickAssign = (task: HouseholdTask) => {
    setSelectedTask(task);
    setShowAssignModal(true);
  };

  const handleCompleteAssignment = async (assignmentId: string) => {
    const { error } = await supabase
      .from("household_task_assignments")
      .update({ 
        status: "completed", 
        completed_at: new Date().toISOString() 
      })
      .eq("id", assignmentId);

    if (error) {
      toast.error("Failed to complete task");
    } else {
      toast.success("Task marked complete!");
      fetchAssignments();
    }
  };

  const handleApproveAssignment = async (assignment: TaskAssignment) => {
    const { error } = await supabase
      .from("household_task_assignments")
      .update({ 
        status: "approved", 
        approved_at: new Date().toISOString(),
        approved_by: user?.id
      })
      .eq("id", assignment.id);

    if (error) {
      toast.error("Failed to approve task");
      return;
    }

    // Add reward to kid's balance if applicable
    if (assignment.assigned_to_kid_id && assignment.reward_amount > 0) {
      const { data: kidProfile } = await supabase
        .from("kids_profiles")
        .select("current_balance")
        .eq("id", assignment.assigned_to_kid_id)
        .single();

      if (kidProfile) {
        await supabase
          .from("kids_profiles")
          .update({ 
            current_balance: kidProfile.current_balance + assignment.reward_amount,
            total_earned: kidProfile.current_balance + assignment.reward_amount
          })
          .eq("id", assignment.assigned_to_kid_id);
      }
    }

    toast.success("Task approved!");
    fetchAssignments();
    onRefresh?.();
  };

  // Calendar helpers
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getAssignmentsForDate = (date: Date) => {
    return assignments.filter(a => 
      a.due_date && isSameDay(new Date(a.due_date), date)
    );
  };

  const navigatePrev = () => {
    if (view === "week") {
      setCurrentDate(subWeeks(currentDate, 1));
    } else {
      setCurrentDate(subMonths(currentDate, 1));
    }
  };

  const navigateNext = () => {
    if (view === "week") {
      setCurrentDate(addWeeks(currentDate, 1));
    } else {
      setCurrentDate(addMonths(currentDate, 1));
    }
  };

  const pendingApproval = assignments.filter(a => a.status === "completed");
  const activeTasks = assignments.filter(a => a.status === "pending");

  return (
    <div className="space-y-4">
      {/* Header Controls */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Button
            variant={view === "list" ? "default" : "outline"}
            size="sm"
            onClick={() => setView("list")}
            className="gap-1.5"
          >
            <List className="h-4 w-4" />
            <span className="hidden sm:inline">Tasks</span>
          </Button>
          <Button
            variant={view === "week" ? "default" : "outline"}
            size="sm"
            onClick={() => setView("week")}
            className="gap-1.5"
          >
            <CalendarDays className="h-4 w-4" />
            <span className="hidden sm:inline">Week</span>
          </Button>
          <Button
            variant={view === "month" ? "default" : "outline"}
            size="sm"
            onClick={() => setView("month")}
            className="gap-1.5"
          >
            <CalendarRange className="h-4 w-4" />
            <span className="hidden sm:inline">Month</span>
          </Button>
        </div>
        
        <div className="flex items-center gap-2">
          <Button onClick={() => setShowQuickSetup(true)} size="sm" variant="outline" className="gap-1.5">
            <Sparkles className="h-4 w-4 text-amber-500" />
            <span className="hidden sm:inline">Quick Setup</span>
          </Button>
          <Button onClick={() => setShowCreateModal(true)} size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Add Task</span>
          </Button>
        </div>
      </div>

      {/* Pending Approvals Alert */}
      {pendingApproval.length > 0 && (
        <Card className="border-amber-500/50 bg-amber-500/5">
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-600" />
                <span className="text-sm font-medium">
                  {pendingApproval.length} task{pendingApproval.length > 1 ? "s" : ""} awaiting approval
                </span>
              </div>
              <Button variant="outline" size="sm" onClick={() => setView("list")}>
                Review
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* List View */}
      {view === "list" && (
        <div className="space-y-4">
          {/* Master Task List */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <List className="h-4 w-4" />
                Master Task List
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {isLoading ? (
                <div className="py-8 text-center text-muted-foreground">Loading...</div>
              ) : tasks.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-muted-foreground mb-3">No tasks yet</p>
                  <Button onClick={() => setShowCreateModal(true)} variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-1" />
                    Create your first task
                  </Button>
                </div>
              ) : (
                tasks.map(task => (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{task.title}</span>
                        {task.is_recurring && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            <Repeat className="h-3 w-3 mr-0.5" />
                            {task.recurrence_pattern}
                          </Badge>
                        )}
                        {task.rotation_enabled && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            <RotateCcw className="h-3 w-3 mr-0.5" />
                            Rotating
                          </Badge>
                        )}
                      </div>
                      {task.default_reward > 0 && (
                        <p className="text-xs text-muted-foreground">
                          Default: ${task.default_reward.toFixed(2)}
                        </p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleQuickAssign(task)}
                      className="gap-1"
                    >
                      <Users className="h-3.5 w-3.5" />
                      Assign
                    </Button>
                  </motion.div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Active Assignments */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Active Assignments
                {activeTasks.length > 0 && (
                  <Badge variant="secondary">{activeTasks.length}</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {activeTasks.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No active assignments
                </p>
              ) : (
                activeTasks.map(assignment => (
                  <div
                    key={assignment.id}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">
                        {assignment.kids_profiles?.avatar_emoji || "👤"}
                      </span>
                      <div>
                        <p className="font-medium text-sm">
                          {assignment.household_tasks?.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {assignment.kids_profiles?.display_name || "Adult"} 
                          {assignment.due_date && ` • Due ${format(new Date(assignment.due_date), "MMM d")}`}
                        </p>
                      </div>
                    </div>
                    {assignment.reward_amount > 0 && (
                      <Badge variant="outline" className="text-emerald-600">
                        ${assignment.reward_amount.toFixed(2)}
                      </Badge>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Pending Approval */}
          {pendingApproval.length > 0 && (
            <Card className="border-amber-500/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2 text-amber-600">
                  <Check className="h-4 w-4" />
                  Awaiting Approval
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {pendingApproval.map(assignment => (
                  <div
                    key={assignment.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-amber-500/30 bg-amber-500/5"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">
                        {assignment.kids_profiles?.avatar_emoji || "👤"}
                      </span>
                      <div>
                        <p className="font-medium text-sm">
                          {assignment.household_tasks?.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {assignment.kids_profiles?.display_name || "Adult"} marked complete
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleApproveAssignment(assignment)}
                      className="gap-1"
                    >
                      <Check className="h-3.5 w-3.5" />
                      Approve
                      {assignment.reward_amount > 0 && ` $${assignment.reward_amount.toFixed(2)}`}
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Week View */}
      {view === "week" && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="icon" onClick={navigatePrev}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <CardTitle className="text-base">
                {format(weekStart, "MMM d")} - {format(weekEnd, "MMM d, yyyy")}
              </CardTitle>
              <Button variant="ghost" size="icon" onClick={navigateNext}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-1">
              {weekDays.map(day => {
                const dayAssignments = getAssignmentsForDate(day);
                return (
                  <div
                    key={day.toISOString()}
                    className={cn(
                      "min-h-[100px] p-2 rounded-lg border text-center",
                      isToday(day) && "border-primary bg-primary/5"
                    )}
                  >
                    <p className="text-xs font-medium text-muted-foreground">
                      {format(day, "EEE")}
                    </p>
                    <p className={cn(
                      "text-sm font-bold mb-2",
                      isToday(day) && "text-primary"
                    )}>
                      {format(day, "d")}
                    </p>
                    <div className="space-y-1">
                      {dayAssignments.slice(0, 3).map(a => (
                        <div
                          key={a.id}
                          className={cn(
                            "text-[10px] p-1 rounded truncate",
                            a.status === "completed" ? "bg-amber-100 text-amber-800" :
                            a.status === "approved" ? "bg-emerald-100 text-emerald-800" :
                            "bg-muted"
                          )}
                        >
                          {a.household_tasks?.title}
                        </div>
                      ))}
                      {dayAssignments.length > 3 && (
                        <p className="text-[10px] text-muted-foreground">
                          +{dayAssignments.length - 3} more
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Month View */}
      {view === "month" && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="icon" onClick={navigatePrev}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <CardTitle className="text-base">
                {format(currentDate, "MMMM yyyy")}
              </CardTitle>
              <Button variant="ghost" size="icon" onClick={navigateNext}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-1 mb-1">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
                <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {/* Pad start of month */}
              {Array.from({ length: monthStart.getDay() }).map((_, i) => (
                <div key={`pad-${i}`} className="min-h-[60px]" />
              ))}
              {monthDays.map(day => {
                const dayAssignments = getAssignmentsForDate(day);
                return (
                  <div
                    key={day.toISOString()}
                    className={cn(
                      "min-h-[60px] p-1 rounded border text-center",
                      isToday(day) && "border-primary bg-primary/5"
                    )}
                  >
                    <p className={cn(
                      "text-xs font-medium",
                      isToday(day) && "text-primary"
                    )}>
                      {format(day, "d")}
                    </p>
                    {dayAssignments.length > 0 && (
                      <div className="mt-1">
                        <Badge variant="secondary" className="text-[9px] px-1">
                          {dayAssignments.length}
                        </Badge>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modals */}
      <CreateTaskModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        familyGroupId={familyGroupId}
        onSuccess={() => {
          fetchTasks();
          setShowCreateModal(false);
        }}
      />

      {selectedTask && (
        <AssignTaskModal
          open={showAssignModal}
          onOpenChange={setShowAssignModal}
          task={selectedTask}
          assignableMembers={assignableMembers}
          onSuccess={() => {
            fetchAssignments();
            setShowAssignModal(false);
            setSelectedTask(null);
          }}
        />
      )}

      <QuickSetupModal
        open={showQuickSetup}
        onOpenChange={setShowQuickSetup}
        familyGroupId={familyGroupId}
        onSuccess={() => {
          fetchTasks();
        }}
      />
    </div>
  );
};
