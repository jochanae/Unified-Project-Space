import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Star, TrendingUp, Target, Flame, Heart, Lightbulb, Coins } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface KidsEncouragementBannerProps {
  kidId: string;
  isUnder10: boolean;
  isDarkMode?: boolean;
}

// Fun money facts for kids
const MONEY_FACTS_PLAYFUL = [
  { text: "Did you know? Piggy banks have been around for over 600 years! 🐷", icon: "🐷" },
  { text: "The first coins were made from gold and silver over 2,600 years ago! ✨", icon: "🪙" },
  { text: "In Japan, some people believe saving makes you lucky! 🍀", icon: "🎋" },
  { text: "A dollar bill can be folded about 4,000 times before it tears! 💪", icon: "💵" },
  { text: "Bees make honey, and you make savings grow! Both take time! 🐝", icon: "🍯" },
  { text: "The tooth fairy leaves money because teeth are precious - just like your savings! 🦷", icon: "🧚" },
  { text: "Squirrels save nuts for winter - you're saving for your dreams! 🐿️", icon: "🌰" },
  { text: "A penny saved is a penny earned - that's what Benjamin Franklin said! 🎩", icon: "💡" },
  { text: "The word 'bank' comes from the Italian word for 'bench'! 🪑", icon: "🏦" },
  { text: "Money doesn't grow on trees, but your savings can grow like one! 🌳", icon: "🌱" },
];

const MONEY_FACTS_TEEN = [
  { text: "Compound interest is called the 8th wonder of the world - your money makes money!", icon: "📈" },
  { text: "Warren Buffett bought his first stock at age 11. You're starting early too!", icon: "📊" },
  { text: "The average millionaire has 7 streams of income. Start building yours!", icon: "💰" },
  { text: "50/30/20 rule: 50% needs, 30% wants, 20% savings. You've got this!", icon: "🎯" },
  { text: "Einstein called compound interest 'the most powerful force in the universe'", icon: "🧠" },
  { text: "Saving just $5/week = $260/year. Small steps, big results!", icon: "🚀" },
  { text: "The S&P 500 has averaged 10% returns over 100 years. Time is your friend!", icon: "📈" },
  { text: "70% of wealthy families lose their wealth by the 2nd generation. Be different!", icon: "🏆" },
  { text: "A budget isn't limiting - it's giving every dollar a job!", icon: "📋" },
  { text: "The best investment you can make is in yourself. Keep learning!", icon: "📚" },
];

// Encouraging cheers
const CHEERS_PLAYFUL = [
  { text: "You're a savings superstar! Keep shining! ⭐", icon: "🌟" },
  { text: "Way to go, money champ! You're amazing! 🏆", icon: "🎉" },
  { text: "Your piggy bank is so proud of you! 🐷💕", icon: "🐷" },
  { text: "You're growing your money garden beautifully! 🌻", icon: "🌱" },
  { text: "Super saver alert! That's YOU! 🦸", icon: "💪" },
  { text: "Every coin counts, and you're counting them all! 🪙", icon: "✨" },
  { text: "You're making smart choices! High five! ✋", icon: "🙌" },
  { text: "Look at you go! Your future self says thanks! 🎁", icon: "🎀" },
  { text: "Saving is your superpower! Use it wisely! 🦸‍♀️", icon: "⚡" },
  { text: "You're building something amazing, one coin at a time! 🏗️", icon: "🧱" },
];

const CHEERS_TEEN = [
  { text: "Building wealth one smart decision at a time. Respect! 💪", icon: "🔥" },
  { text: "Your future self is already thanking you. Keep it up!", icon: "🙏" },
  { text: "Financial freedom starts with moves like yours!", icon: "🚀" },
  { text: "You're ahead of 90% of people your age. Seriously!", icon: "📈" },
  { text: "Smart money moves = smart life moves. You get it!", icon: "🧠" },
  { text: "Consistency beats intensity. You're proving it!", icon: "💯" },
  { text: "Money skills now = freedom later. You're on track!", icon: "🎯" },
  { text: "Not everyone your age thinks about money. You're different!", icon: "⭐" },
  { text: "Building habits that millionaires started with!", icon: "💎" },
  { text: "Your discipline is impressive. Keep that energy!", icon: "⚡" },
];

// Tips
const TIPS_PLAYFUL = [
  { text: "Try to save a little bit every time you get money! 💡", icon: "💡" },
  { text: "Before buying something, wait one day to think about it! 🤔", icon: "⏰" },
  { text: "Ask yourself: Do I need it or just want it? 🎯", icon: "🤷" },
  { text: "Doing chores is a great way to earn more! 🧹", icon: "💪" },
  { text: "Set a goal and watch your savings grow toward it! 🎯", icon: "🌈" },
];

const TIPS_TEEN = [
  { text: "Pay yourself first - save before you spend!", icon: "💡" },
  { text: "Track every dollar for a week. You'll be surprised!", icon: "📝" },
  { text: "The 24-hour rule: Wait a day before impulse buys!", icon: "⏰" },
  { text: "Automate your savings - make it effortless!", icon: "🤖" },
  { text: "Learn one new money concept each week!", icon: "📚" },
];

export const KidsEncouragementBanner = ({ kidId, isUnder10, isDarkMode = false }: KidsEncouragementBannerProps) => {
  const [personalMessage, setPersonalMessage] = useState<{ text: string; icon: string } | null>(null);
  const [displayMessage, setDisplayMessage] = useState<{ text: string; icon: string } | null>(null);

  // Combine all static messages based on age
  const staticMessages = useMemo(() => {
    if (isUnder10) {
      return [...MONEY_FACTS_PLAYFUL, ...CHEERS_PLAYFUL, ...TIPS_PLAYFUL];
    }
    return [...MONEY_FACTS_TEEN, ...CHEERS_TEEN, ...TIPS_TEEN];
  }, [isUnder10]);

  // Fetch personal achievements for dynamic messages
  useEffect(() => {
    const fetchPersonalData = async () => {
      try {
        // Get kid's profile for streak
        const { data: profile } = await supabase
          .from("kids_profiles")
          .select("streak_days, total_earned, total_saved, current_balance")
          .eq("id", kidId)
          .single();

        // Get recent chores completed this week
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        
        const { data: recentChores } = await supabase
          .from("kid_chores")
          .select("id")
          .eq("kid_id", kidId)
          .eq("status", "approved")
          .gte("completed_at", weekAgo.toISOString());

        // Get savings goal progress
        const { data: goals } = await supabase
          .from("kid_savings_goals")
          .select("title, current_amount, target_amount")
          .eq("kid_id", kidId)
          .eq("is_completed", false)
          .limit(1);

        // Build personal messages based on data
        const personalMessages: { text: string; icon: string }[] = [];

        if (profile?.streak_days && profile.streak_days > 1) {
          if (isUnder10) {
            personalMessages.push({ 
              text: `${profile.streak_days}-day streak! You're on fire! 🔥`, 
              icon: "🔥" 
            });
          } else {
            personalMessages.push({ 
              text: `${profile.streak_days} days strong. Consistency wins! 🔥`, 
              icon: "🔥" 
            });
          }
        }

        if (recentChores && recentChores.length > 0) {
          if (isUnder10) {
            personalMessages.push({ 
              text: `Wow! You finished ${recentChores.length} chore${recentChores.length > 1 ? 's' : ''} this week! 🌟`, 
              icon: "⭐" 
            });
          } else {
            personalMessages.push({ 
              text: `${recentChores.length} chore${recentChores.length > 1 ? 's' : ''} completed this week. Earning that money! 💪`, 
              icon: "💪" 
            });
          }
        }

        if (goals && goals.length > 0) {
          const goal = goals[0];
          const progress = Math.round((goal.current_amount / goal.target_amount) * 100);
          if (progress >= 50) {
            if (isUnder10) {
              personalMessages.push({ 
                text: `You're ${progress}% to your "${goal.title}" goal! Almost there! 🎯`, 
                icon: "🎯" 
              });
            } else {
              personalMessages.push({ 
                text: `${progress}% toward "${goal.title}". The finish line is in sight!`, 
                icon: "🎯" 
              });
            }
          }
        }

        if (profile?.total_saved && profile.total_saved >= 10) {
          if (isUnder10) {
            personalMessages.push({ 
              text: `You've saved $${profile.total_saved.toFixed(0)} total! That's incredible! 💰`, 
              icon: "💰" 
            });
          } else {
            personalMessages.push({ 
              text: `$${profile.total_saved.toFixed(0)} saved so far. Real wealth building! 💰`, 
              icon: "💰" 
            });
          }
        }

        // Pick a random personal message if available
        if (personalMessages.length > 0) {
          const randomPersonal = personalMessages[Math.floor(Math.random() * personalMessages.length)];
          setPersonalMessage(randomPersonal);
        }
      } catch (error) {
        console.error("Error fetching personal data:", error);
      }
    };

    fetchPersonalData();
  }, [kidId, isUnder10]);

  // Select message to display (prioritize personal, fall back to static)
  useEffect(() => {
    // Use date-based seed for consistent daily rotation
    const today = new Date().toDateString();
    const seed = today.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
    
    // 40% chance to show personal message if available
    const showPersonal = personalMessage && Math.random() < 0.4;
    
    if (showPersonal && personalMessage) {
      setDisplayMessage(personalMessage);
    } else {
      // Pick from static pool based on day
      const index = seed % staticMessages.length;
      setDisplayMessage(staticMessages[index]);
    }
  }, [personalMessage, staticMessages]);

  if (!displayMessage) return null;

  const IconComponent = isUnder10 ? Sparkles : TrendingUp;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={displayMessage.text}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        transition={{ duration: 0.3 }}
        className={`mx-3 mb-3 rounded-2xl p-3 ${
          isUnder10
            ? isDarkMode
              ? "bg-gradient-to-r from-purple-900/40 to-pink-900/40 border border-purple-500/20"
              : "bg-gradient-to-r from-purple-100/80 to-pink-100/80 border border-purple-200/50"
            : isDarkMode
              ? "bg-gradient-to-r from-slate-800/60 to-emerald-900/40 border border-emerald-500/20"
              : "bg-gradient-to-r from-slate-100/80 to-emerald-100/80 border border-emerald-200/50"
        }`}
      >
        <div className="flex items-center gap-3">
          <div className={`text-2xl flex-shrink-0 ${isUnder10 ? "animate-bounce" : ""}`}>
            {displayMessage.icon}
          </div>
          <p className={`text-sm font-medium leading-snug ${
            isUnder10
              ? isDarkMode ? "text-purple-200" : "text-purple-700"
              : isDarkMode ? "text-emerald-200" : "text-slate-700"
          }`}>
            {displayMessage.text}
          </p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};