import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Gamepad2, PiggyBank, Trophy, Sparkles, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { KidsBloomLogo } from "@/components/kidsbloom/KidsBloomLogo";

export default function KidsBloomHome() {
  const navigate = useNavigate();

  const features = [
    {
      icon: PiggyBank,
      title: "Save & Earn",
      description: "Set goals and watch your savings grow!",
      color: "from-emerald-400 to-teal-500",
    },
    {
      icon: Gamepad2,
      title: "Fun Games",
      description: "Learn money skills through play",
      color: "from-pink-400 to-purple-500",
    },
    {
      icon: BookOpen,
      title: "Video Lessons",
      description: "Watch and learn at your own pace",
      color: "from-amber-400 to-orange-500",
    },
    {
      icon: Trophy,
      title: "Earn Rewards",
      description: "Complete chores and get paid!",
      color: "from-cyan-400 to-blue-500",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-50 via-emerald-50/30 to-cyan-50/50 dark:from-slate-900 dark:via-emerald-950/30 dark:to-cyan-950/50">
      {/* Header */}
      <header className="p-4 flex items-center justify-between">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-emerald-600 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>CoinsBloom</span>
        </button>
        <KidsBloomLogo size="md" variant="modern" />
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate("/kidsbloom/login")}
          className="border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400"
        >
          Sign In
        </Button>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-lg mx-auto space-y-6"
        >
          {/* Animated Icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.2 }}
            className="w-24 h-24 mx-auto rounded-3xl bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-500 flex items-center justify-center shadow-xl"
          >
            <Sparkles className="h-12 w-12 text-white" />
          </motion.div>

          <div className="space-y-3">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-500 bg-clip-text text-transparent">
              Welcome to KidsBloom
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-300">
              Your fun place to learn about money, save for goals, and earn rewards!
            </p>
          </div>

          {/* Feature Grid */}
          <div className="grid grid-cols-2 gap-3 pt-4">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + index * 0.1 }}
                className="p-4 rounded-xl bg-white/80 dark:bg-slate-800/50 border border-white/50 dark:border-slate-700/50 shadow-sm"
              >
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${feature.color} flex items-center justify-center mb-2`}>
                  <feature.icon className="h-5 w-5 text-white" />
                </div>
                <h3 className="font-semibold text-sm text-slate-700 dark:text-slate-200">{feature.title}</h3>
                <p className="text-xs text-slate-600 dark:text-slate-300">{feature.description}</p>
              </motion.div>
            ))}
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col gap-3 pt-4">
            <Button
              onClick={() => navigate("/kidsbloom/signup")}
              className="w-full h-14 text-lg bg-gradient-to-r from-emerald-400 via-teal-500 to-cyan-600 hover:from-emerald-500 hover:via-teal-600 hover:to-cyan-700 text-white shadow-lg backdrop-blur-sm border border-white/20"
            >
              Create My Account <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/kidsbloom/login")}
              className="w-full h-12 text-base border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950/50"
            >
              I Already Have an Account
            </Button>
          </div>

          {/* Parent Link */}
          <p className="text-sm text-slate-600 pt-4">
            Are you a parent?{" "}
            <Link to="/" className="text-emerald-600 hover:underline font-medium">
              Go to CoinsBloom
            </Link>
          </p>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="p-4 text-center text-xs text-slate-500">
        <p>Part of the CoinsBloom family</p>
      </footer>
    </div>
  );
}
