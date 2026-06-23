import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AdminUser {
  id: string;
  email: string;
  org_id: string;
  role: string;
  created_at: string | null;
  org_name?: string;
  org_plan?: string;
  is_admin?: boolean;
}

interface AdminStats {
  totalUsers: number;
  totalOrgs: number;
  totalProjects: number;
  activeSubscriptions: number;
}

export function useAdminData() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [stats, setStats] = useState<AdminStats>({ totalUsers: 0, totalOrgs: 0, totalProjects: 0, activeSubscriptions: 0 });
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch users with org info
      const { data: usersData } = await supabase
        .from('users')
        .select('id, email, org_id, role, created_at')
        .order('created_at', { ascending: false });

      const { data: orgsData } = await supabase
        .from('organizations')
        .select('id, name, plan');

      const { data: projectsData } = await supabase
        .from('projects')
        .select('id');

      const { data: subsData } = await supabase
        .from('subscriptions')
        .select('id, user_id, status, product_id');

      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('user_id, role');

      const orgMap = new Map((orgsData || []).map(o => [o.id, o]));
      const roleSet = new Set((rolesData || []).filter(r => r.role === 'admin').map(r => r.user_id));

      const enrichedUsers: AdminUser[] = (usersData || []).map(u => {
        const org = orgMap.get(u.org_id);
        return {
          ...u,
          org_name: org?.name || 'Unknown',
          org_plan: org?.plan || 'free',
          is_admin: roleSet.has(u.id),
        };
      });

      setUsers(enrichedUsers);
      setStats({
        totalUsers: enrichedUsers.length,
        totalOrgs: (orgsData || []).length,
        totalProjects: (projectsData || []).length,
        activeSubscriptions: (subsData || []).filter(s => s.status === 'active').length,
      });
    } catch (err) {
      console.error('Admin data fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return { users, stats, loading, refetch: fetchData };
}
