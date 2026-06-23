import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookOpen, Video, FileText, FolderOpen, Users, BarChart3, MessageSquare, Bot, ClipboardCheck, Settings, Newspaper } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { AdminLessons } from '@/components/admin/AdminLessons';
import { AdminVideos } from '@/components/admin/AdminVideos';
import { AdminResources } from '@/components/admin/AdminResources';
import { AdminCategories } from '@/components/admin/AdminCategories';
import { AdminUsers } from '@/components/admin/AdminUsers';
import { AdminAnalytics } from '@/components/admin/AdminAnalytics';
import { AdminFeedback } from '@/components/admin/AdminFeedback';
import { AdminContentAutomation } from '@/components/admin/AdminContentAutomation';
import { AdminBetaTests } from '@/components/admin/AdminBetaTests';
import { AdminSettings } from '@/components/admin/AdminSettings';
import { AdminBlog } from '@/components/admin/AdminBlog';

export default function Admin() {
  const { user, role, isLoading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('analytics');

  useEffect(() => {
    if (!isLoading && (!user || (role !== 'admin' && role !== 'super_admin'))) {
      navigate('/dashboard');
    }
  }, [user, role, isLoading, navigate]);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <LoadingSpinner size="md" />
        </div>
      </DashboardLayout>
    );
  }

  if (!user || (role !== 'admin' && role !== 'super_admin')) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Content Management</h1>
          <p className="text-muted-foreground">
            Manage lessons, videos, and educational resources
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-5 lg:grid-cols-11 lg:w-auto lg:inline-flex">
            <TabsTrigger value="analytics" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Analytics</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Settings</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Users</span>
            </TabsTrigger>
            <TabsTrigger value="automation" className="gap-2">
              <Bot className="h-4 w-4" />
              <span className="hidden sm:inline">Automation</span>
            </TabsTrigger>
            <TabsTrigger value="lessons" className="gap-2">
              <BookOpen className="h-4 w-4" />
              <span className="hidden sm:inline">Lessons</span>
            </TabsTrigger>
            <TabsTrigger value="videos" className="gap-2">
              <Video className="h-4 w-4" />
              <span className="hidden sm:inline">Videos</span>
            </TabsTrigger>
            <TabsTrigger value="resources" className="gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Resources</span>
            </TabsTrigger>
            <TabsTrigger value="categories" className="gap-2">
              <FolderOpen className="h-4 w-4" />
              <span className="hidden sm:inline">Categories</span>
            </TabsTrigger>
            <TabsTrigger value="feedback" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">Feedback</span>
            </TabsTrigger>
            <TabsTrigger value="beta-tests" className="gap-2">
              <ClipboardCheck className="h-4 w-4" />
              <span className="hidden sm:inline">Beta Tests</span>
            </TabsTrigger>
            <TabsTrigger value="blog" className="gap-2">
              <Newspaper className="h-4 w-4" />
              <span className="hidden sm:inline">Blog</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="settings">
            <AdminSettings />
          </TabsContent>
          <TabsContent value="analytics">
            <AdminAnalytics />
          </TabsContent>
          <TabsContent value="users">
            <AdminUsers />
          </TabsContent>
          <TabsContent value="automation">
            <AdminContentAutomation />
          </TabsContent>
          <TabsContent value="lessons">
            <AdminLessons />
          </TabsContent>
          <TabsContent value="videos">
            <AdminVideos />
          </TabsContent>
          <TabsContent value="resources">
            <AdminResources />
          </TabsContent>
          <TabsContent value="categories">
            <AdminCategories />
          </TabsContent>
          <TabsContent value="feedback">
            <AdminFeedback />
          </TabsContent>
          <TabsContent value="beta-tests">
            <AdminBetaTests />
          </TabsContent>
          <TabsContent value="blog">
            <AdminBlog />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
