import { useNavigate } from 'react-router-dom';
import { useAppContext } from '@/contexts/AppContext';
import PlansTab from '@/components/PlansTab';

export default function PlansPage() {
  const navigate = useNavigate();
  const { user, activeConnection } = useAppContext();

  if (!user) return null;

  return (
    <PlansTab
      userId={user.id}
      onBack={() => navigate(-1)}
      onOpenChat={activeConnection ? (memberId) => navigate(`/chat/${memberId}`) : undefined}
    />
  );
}
