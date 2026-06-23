import { motion } from "framer-motion";
import { 
  Wallet, 
  Target, 
  TrendingUp, 
  Receipt, 
  PiggyBank,
  BarChart3,
  Bot,
  Eye
} from "lucide-react";

const features = [
  {
    icon: Wallet,
    title: "Smart Budgeting",
    description: "Create unlimited budgets, track every dollar, and stay on top of your spending with intelligent categorization.",
    color: "emerald",
  },
  {
    icon: Receipt,
    title: "Bill Management",
    description: "Never miss a payment. Auto-detect bills from Gmail, get push notifications, and see upcoming expenses at a glance.",
    color: "blue",
  },
  {
    icon: Target,
    title: "Savings Goals",
    description: "Set and track multiple savings goals. Watch your progress and celebrate milestones together.",
    color: "purple",
  },
  {
    icon: TrendingUp,
    title: "Debt Payoff",
    description: "Snowball or avalanche method. See exactly how to become debt-free faster.",
    color: "rose",
  },
  {
    icon: PiggyBank,
    title: "Vision Board",
    description: "Visualize your financial dreams. Create boards for goals, dreams, and motivations.",
    color: "pink",
  },
  {
    icon: BarChart3,
    title: "Reports & Analytics",
    description: "Detailed insights into your spending patterns, trends, and financial health over time.",
    color: "orange",
  },
  {
    icon: Bot,
    title: "Bloom — Financial Architect",
    description: "Not a chatbot that resets. Bloom builds Strategic Memory of your financial world — a living model that learns, remembers, and engineers your next move.",
    color: "teal",
  },
  {
    icon: Eye,
    title: "What-If Simulator",
    description: "See how different financial decisions would impact your future before you make them.",
    color: "indigo",
  },
];

export const CoreFeaturesSection = () => {
  return (
    <section className="py-20">
      <div className="container">
        {/* Section header */}
        <div className="text-center mb-16">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-emerald-600 dark:text-emerald-400 font-medium mb-2"
          >
            Powerful Features
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="font-display text-3xl md:text-4xl font-bold mb-4"
          >
            Everything You Need to Succeed
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-muted-foreground text-lg max-w-2xl mx-auto"
          >
            Budgeting, bills, debt, savings, and smart insights — all in one place.
          </motion.p>
        </div>

        {/* Features grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, idx) => {
            const cardStyle = 
              feature.color === "emerald" ? "bg-gradient-to-br from-white/70 via-emerald-50/40 to-emerald-100/30 border-emerald-200/60 dark:from-slate-800/70 dark:via-emerald-900/20 dark:to-emerald-800/30 dark:border-emerald-700/40" :
              feature.color === "blue" ? "bg-gradient-to-br from-white/70 via-blue-50/40 to-blue-100/30 border-blue-200/60 dark:from-slate-800/70 dark:via-blue-900/20 dark:to-blue-800/30 dark:border-blue-700/40" :
              feature.color === "purple" ? "bg-gradient-to-br from-white/70 via-purple-50/40 to-purple-100/30 border-purple-200/60 dark:from-slate-800/70 dark:via-purple-900/20 dark:to-purple-800/30 dark:border-purple-700/40" :
              feature.color === "rose" ? "bg-gradient-to-br from-white/70 via-rose-50/40 to-rose-100/30 border-rose-200/60 dark:from-slate-800/70 dark:via-rose-900/20 dark:to-rose-800/30 dark:border-rose-700/40" :
              feature.color === "pink" ? "bg-gradient-to-br from-white/70 via-pink-50/40 to-pink-100/30 border-pink-200/60 dark:from-slate-800/70 dark:via-pink-900/20 dark:to-pink-800/30 dark:border-pink-700/40" :
              feature.color === "orange" ? "bg-gradient-to-br from-white/70 via-orange-50/40 to-orange-100/30 border-orange-200/60 dark:from-slate-800/70 dark:via-orange-900/20 dark:to-orange-800/30 dark:border-orange-700/40" :
              feature.color === "teal" ? "bg-gradient-to-br from-white/70 via-teal-50/40 to-teal-100/30 border-teal-200/60 dark:from-slate-800/70 dark:via-teal-900/20 dark:to-teal-800/30 dark:border-teal-700/40" :
              "bg-gradient-to-br from-white/70 via-indigo-50/40 to-indigo-100/30 border-indigo-200/60 dark:from-slate-800/70 dark:via-indigo-900/20 dark:to-indigo-800/30 dark:border-indigo-700/40";
            
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.05 }}
                whileHover={{ y: -4 }}
                className={`group relative p-6 rounded-2xl border backdrop-blur-md shadow-lg shadow-black/5 hover:shadow-xl transition-all duration-300 ${cardStyle}`}
              >
                {/* Subtle shimmer overlay */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-white/20 via-transparent to-white/10 dark:from-white/5 dark:to-white/5 pointer-events-none" />
                
                <div className={`relative w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110 ${
                  feature.color === "emerald" ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" :
                  feature.color === "blue" ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" :
                  feature.color === "purple" ? "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400" :
                  feature.color === "rose" ? "bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400" :
                  feature.color === "pink" ? "bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400" :
                  feature.color === "orange" ? "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400" :
                  feature.color === "teal" ? "bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400" :
                  "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400"
                }`}>
                  <feature.icon className="h-6 w-6" />
                </div>
                
                <h3 className="relative font-semibold text-lg mb-2">{feature.title}</h3>
                <p className="relative text-sm text-muted-foreground">{feature.description}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
