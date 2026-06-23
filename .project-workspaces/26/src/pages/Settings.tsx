import { useEffect, useState, useRef } from 'react';
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useAuth } from '@/contexts/AuthContext';

import coinsbloomLogo from '@/assets/coinsbloom-logo.png';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

import { SettingsHero } from '@/components/settings/SettingsHero';
import { SettingsQuickActions } from '@/components/settings/SettingsQuickActions';
import { SettingsMenu } from '@/components/settings/SettingsMenu';
import { ProfileSection } from '@/components/settings/ProfileSection';
import { DashboardAppearanceSection } from '@/components/settings/DashboardAppearanceSection';
import { SecuritySection } from '@/components/settings/SecuritySection';
import { SettingsInfoCard } from '@/components/settings/SettingsInfoCard';
import { BillingSection } from '@/components/settings/BillingSection';
import { NotificationsSection } from '@/components/settings/NotificationsSection';
import { PrivacySection } from '@/components/settings/PrivacySection';
import { VoiceIntegrationSection } from '@/components/settings/VoiceIntegrationSection';

type SettingsSection = 'home' | 'profile' | 'security' | 'notifications' | 'privacy' | 'dashboard' | 'billing' | 'help' | 'integrations' | 'payment-links' | 'kids' | 'export' | 'reset' | 'support' | 'voice';

export default function Settings() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSection, setActiveSection] = useState<SettingsSection>('home');
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/signin');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [activeSection]);

  const handleNavigate = (section: string) => {
    setActiveSection(section as SettingsSection);
  };

  const handleBack = () => {
    if (activeSection === 'home') {
      navigate('/');
    } else {
      setActiveSection('home');
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center loading-screen-bg">
        <LoadingSpinner size="lg" text="Loading settings..." />
      </div>
    );
  }

  const renderSection = () => {
    switch (activeSection) {
      case 'profile':
        return <ProfileSection user={user} />;
      case 'security':
        return <SecuritySection user={user} />;
      case 'dashboard':
        return <DashboardAppearanceSection />;
      case 'notifications':
        return <NotificationsSection />;
      case 'privacy':
        return <PrivacySection />;
      case 'billing':
        return <BillingSection />;
      case 'integrations':
      case 'voice':
        return <VoiceIntegrationSection />;
      case 'help':
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Help & Support</h2>
            <p className="text-muted-foreground">
              <Button variant="link" className="p-0 h-auto" onClick={() => navigate('/help')}>
                Visit Help Center
              </Button>
            </p>
          </div>
        );
      case 'home':
      default:
        return (
          <>
            <SettingsQuickActions onNavigate={handleNavigate} />
            <SettingsMenu onNavigate={handleNavigate} />
            <SettingsInfoCard />
          </>
        );
    }
  };

  return (
    <div className="min-h-screen flex flex-col relative bg-gradient-to-b from-muted/50 to-background">
      <Helmet>
        <title>Settings | CoinsBloom - Manage Your Account</title>
        <meta name="description" content="Manage your CoinsBloom account settings. Update profile, security, notifications, and customize your financial dashboard." />
        <meta name="robots" content="noindex" />
      </Helmet>
      

      {/* Header */}
      <header className="sticky top-0 z-50 w-full bg-muted/80 backdrop-blur-lg border-b border-border/50 rounded-b-3xl">
        <div className="container max-w-6xl mx-auto flex h-16 items-center gap-4">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Link to="/" className="flex items-center gap-3">
            <img src={coinsbloomLogo} alt="CoinsBloom" className="h-8 w-8 rounded-lg" />
            <span className="font-display text-xl font-bold bg-gradient-to-r from-purple-600 via-pink-500 to-purple-700 bg-clip-text text-transparent">
              CoinsBloom
            </span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <motion.main
        ref={contentRef}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex-grow relative z-10 overflow-auto"
      >
        <div className="container max-w-6xl mx-auto pb-8">
          {activeSection === 'home' ? (
            <>
              <SettingsHero searchQuery={searchQuery} onSearchChange={setSearchQuery} />
              <div className="px-4 space-y-6 mt-4">
                {renderSection()}
              </div>
            </>
          ) : (
            <div className="p-4 space-y-6">
              {renderSection()}
            </div>
          )}

          {/* Logged in as */}
          {activeSection === 'home' && (
            <div className="px-4 mt-4">
              <p className="text-sm text-muted-foreground">Logged in as: {user.email}</p>
            </div>
          )}
        </div>
      </motion.main>
    </div>
  );
}
