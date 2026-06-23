import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { B2BReferralDashboard } from "@/components/referrals/B2BReferralDashboard";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

const ReferBusiness = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/signin");
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50/80 via-purple-50/60 to-pink-50/80 dark:from-background dark:via-background dark:to-background">
      <Helmet>
        <title>Refer a Business | CoinsBloom</title>
        <meta name="description" content="Refer businesses to CoinsBloom and earn 10% monthly commission for up to 12 months." />
      </Helmet>

      <div className="container max-w-4xl mx-auto px-4 py-6">
        {/* Back Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/dashboard")}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <B2BReferralDashboard referrerType="user" />
        </motion.div>
      </div>
    </div>
  );
};

export default ReferBusiness;
