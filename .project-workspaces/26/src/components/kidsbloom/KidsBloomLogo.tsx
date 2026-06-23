import { motion } from "framer-motion";

interface KidsBloomLogoProps {
  size?: "sm" | "md" | "lg";
  variant?: "playful" | "modern";
}

export const KidsBloomLogo = ({ size = "md", variant = "playful" }: KidsBloomLogoProps) => {
  const sizes = {
    sm: { container: "w-8 h-8", coin: "w-4 h-4", orb: "w-2 h-2", text: "text-lg" },
    md: { container: "w-10 h-10", coin: "w-5 h-5", orb: "w-2.5 h-2.5", text: "text-2xl" },
    lg: { container: "w-14 h-14", coin: "w-7 h-7", orb: "w-3 h-3", text: "text-4xl" },
  };

  const isPlayful = variant === "playful";
  const config = sizes[size];
  const cycleDuration = 2.5;
  const staggerDelay = 0.15;

  // Kid-friendly rainbow colors for the 5 orbiting circles
  const orbColors = [
    "from-pink-400 to-pink-500",      // Pink
    "from-purple-400 to-purple-500",  // Purple  
    "from-cyan-400 to-cyan-500",      // Cyan
    "from-emerald-400 to-emerald-500", // Green
    "from-amber-400 to-amber-500",    // Gold/Yellow
  ];

  // Pentagon positions for 5 orbiting circles
  const getOrbPosition = (index: number) => {
    const angle = (index * 72 - 90) * (Math.PI / 180); // Start from top
    const radius = 16;
    return {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
    };
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex items-center gap-2"
    >
      {/* Animated Circle Flower - CoinsBloom Style */}
      <div className={`relative ${config.container} flex items-center justify-center`}>
        {/* Central spinning gradient circle - Gold/Yellow center */}
        <motion.div
          className={`absolute ${config.coin} rounded-full bg-gradient-to-br from-yellow-300 via-amber-400 to-orange-400`}
          initial={{ opacity: 0, scale: 0 }}
          animate={isPlayful ? {
            opacity: [0, 1, 1, 0.9],
            scale: [0, 1, 1.1, 1],
            rotate: [0, 360, 360, 360],
          } : {
            opacity: 1,
            scale: 1,
          }}
          transition={{
            duration: cycleDuration,
            repeat: Infinity,
            ease: 'easeInOut',
            times: [0, 0.3, 0.7, 1],
          }}
          style={{
            boxShadow: '0 0 20px rgba(251, 191, 36, 0.6)',
          }}
        />

        {/* 5 surrounding blurred gradient circles in pentagon pattern */}
        {[0, 1, 2, 3, 4].map((i) => {
          const pos = getOrbPosition(i);
          return (
            <motion.div
              key={i}
              className={`absolute ${config.orb} rounded-full bg-gradient-to-br ${orbColors[i]} blur-[2px]`}
              style={{
                top: '50%',
                left: '50%',
                marginTop: '-5px',
                marginLeft: '-5px',
              }}
              initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
              animate={isPlayful ? {
                opacity: [0, 0.9, 0.9, 0.7],
                scale: [0, 1, 1.15, 1],
                rotate: [0, 360, 360, 360],
                x: [0, pos.x, pos.x, pos.x],
                y: [0, pos.y, pos.y, pos.y],
              } : {
                opacity: 0.9,
                scale: 1,
                x: pos.x,
                y: pos.y,
              }}
              transition={{
                duration: cycleDuration,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: i * staggerDelay,
                times: [0, 0.3, 0.7, 1],
              }}
            />
          );
        })}
      </div>
      
      {/* Gradient Text - Similar to CoinsBloom */}
      <span 
        className={`font-bold ${config.text} bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 bg-clip-text text-transparent`}
      >
        KidsBloom
      </span>
    </motion.div>
  );
};
