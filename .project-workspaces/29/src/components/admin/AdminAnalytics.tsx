import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, BookOpen, TrendingUp, MessageSquare, UserPlus } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { format, subDays, startOfDay, eachDayOfInterval } from 'date-fns';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

export function AdminAnalytics() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-analytics'],
    queryFn: async () => {
      const now = new Date();
      const thirtyDaysAgo = subDays(now, 30);

      // Get total users
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Get new users in last 30 days
      const { data: recentUsers } = await supabase
        .from('profiles')
        .select('created_at')
        .gte('created_at', thirtyDaysAgo.toISOString());

      // Get total lessons
      const { count: totalLessons } = await supabase
        .from('lessons')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'published');

      // Get lesson progress
      const { count: lessonsCompleted } = await supabase
        .from('user_lesson_progress')
        .select('*', { count: 'exact', head: true })
        .eq('completed', true);

      // Get total trades logged
      const { count: totalTrades } = await supabase
        .from('trades')
        .select('*', { count: 'exact', head: true });

      // Get feedback count
      const { count: feedbackCount } = await supabase
        .from('feedback')
        .select('*', { count: 'exact', head: true });

      // Get signups by day for chart
      const days = eachDayOfInterval({ start: thirtyDaysAgo, end: now });
      const signupsByDay = days.map((day) => {
        const dayStart = startOfDay(day);
        const dayEnd = new Date(dayStart);
        dayEnd.setDate(dayEnd.getDate() + 1);

        const count = recentUsers?.filter((u) => {
          const date = new Date(u.created_at);
          return date >= dayStart && date < dayEnd;
        }).length || 0;

        return {
          date: format(day, 'MMM d'),
          signups: count,
        };
      });

      return {
        totalUsers: totalUsers || 0,
        newUsers: recentUsers?.length || 0,
        totalLessons: totalLessons || 0,
        lessonsCompleted: lessonsCompleted || 0,
        totalTrades: totalTrades || 0,
        feedbackCount: feedbackCount || 0,
        signupsByDay,
      };
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="md" />
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Users',
      value: stats?.totalUsers || 0,
      icon: Users,
      description: `+${stats?.newUsers || 0} this month`,
      color: 'text-primary',
    },
    {
      title: 'Published Lessons',
      value: stats?.totalLessons || 0,
      icon: BookOpen,
      description: `${stats?.lessonsCompleted || 0} completions`,
      color: 'text-gain',
    },
    {
      title: 'Trades Logged',
      value: stats?.totalTrades || 0,
      icon: TrendingUp,
      description: 'In journal',
      color: 'text-gold',
    },
    {
      title: 'Feedback Items',
      value: stats?.feedbackCount || 0,
      icon: MessageSquare,
      description: 'User submissions',
      color: 'text-chart-5',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Signups Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            User Signups (Last 30 Days)
          </CardTitle>
          <CardDescription>New user registrations over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats?.signupsByDay || []}>
                <defs>
                  <linearGradient id="signupGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="signups"
                  stroke="hsl(var(--primary))"
                  fill="url(#signupGradient)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
