import { motion } from 'framer-motion';

interface LoadingCoinsV2Props {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'stacking' | 'blooming' | 'pinwheel';
  colorScheme?: 'brand' | 'emerald';
}

export function LoadingCoinsV2({ 
  message = "Preparing your dashboard…", 
  size = 'md',
  variant = 'blooming',
  colorScheme = 'brand'
}: LoadingCoinsV2Props) {
  const sizeConfig = {
    sm: { container: 'w-24 h-24', coin: 'w-10 h-10', coinPx: 40, text: 'text-sm', orb: 'w-4 h-4', orbRadius: 35 },
    md: { container: 'w-40 h-40', coin: 'w-10 h-10', coinPx: 40, text: 'text-base', orb: 'w-5 h-5', orbRadius: 50 },
    lg: { container: 'w-56 h-56', coin: 'w-14 h-14', coinPx: 56, text: 'text-lg', orb: 'w-6 h-6', orbRadius: 70 },
  };

  const colorConfig = {
    brand: {
      // blue-600 → purple-600 → pink-700
      coinGradient: 'from-blue-600 via-purple-600 to-pink-700',
      glowColor: 'rgba(147, 51, 234, 0.5)',
      orbGradients: [
        'from-blue-600 via-purple-600 to-pink-700',
        'from-purple-600 via-pink-600 to-blue-600',
        'from-pink-600 via-blue-600 to-purple-600',
        'from-blue-500 via-purple-500 to-pink-600',
        'from-purple-500 via-pink-500 to-blue-500',
      ],
    },
    emerald: {
      // blue-600 → emerald-500 → teal-600
      coinGradient: 'from-blue-600 via-emerald-500 to-teal-600',
      glowColor: 'rgba(16, 185, 129, 0.5)',
      orbGradients: [
        'from-blue-600 via-emerald-500 to-teal-600',
        'from-emerald-500 via-teal-500 to-blue-600',
        'from-teal-500 via-blue-600 to-emerald-500',
        'from-blue-500 via-emerald-400 to-teal-500',
        'from-emerald-400 via-teal-400 to-blue-500',
      ],
    },
  };

  const config = sizeConfig[size];
  const colors = colorConfig[colorScheme];
  const cycleDuration = 2.5;
  const staggerDelay = 0.3;

  // Pentagon positions (5 orbs at 72° intervals)
  const getOrbPosition = (index: number) => {
    const angle = (index * 72 - 90) * (Math.PI / 180); // Start from top (-90°)
    return {
      x: Math.cos(angle) * config.orbRadius,
      y: Math.sin(angle) * config.orbRadius,
    };
  };

  if (variant === 'stacking') {
    return (
      <div className="flex flex-col items-center justify-center gap-6">
        <div className={`relative ${config.container} flex items-center justify-center`}>
          {[0, 1, 2, 3, 4].map((i) => (
            <motion.div
              key={i}
              className={`absolute ${config.coin} rounded-full bg-gradient-to-br ${colors.coinGradient} shadow-lg`}
              initial={{ y: -100, opacity: 0, scale: 0.5 }}
              animate={{ 
                y: i * -4,
                opacity: 1, 
                scale: 1,
              }}
              transition={{
                duration: 0.6,
                delay: i * 0.6,
                repeat: Infinity,
                repeatDelay: 2.4,
                ease: 'easeOut',
              }}
              style={{
                boxShadow: `0 4px 20px ${colors.glowColor}`,
              }}
            />
          ))}
        </div>

        {message && (
          <motion.p
            className={`${config.text} text-muted-foreground font-medium`}
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            {message}
          </motion.p>
        )}
      </div>
    );
  }

  if (variant === 'pinwheel') {
    return (
      <div className="flex flex-col items-center justify-center gap-6">
        <div className={`relative ${config.container}`}>
          {/* Radiating pulse rings from center */}
          {[0, 1, 2].map((i) => (
            <motion.div
              key={`pulse-${i}`}
              className="absolute inset-0 m-auto rounded-full"
              style={{
                width: config.coinPx,
                height: config.coinPx,
                border: `2px solid ${colors.glowColor}`,
              }}
              animate={{
                scale: [1, 2.5, 3],
                opacity: [0.6, 0.2, 0],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: i * 0.5,
                ease: 'easeOut',
              }}
            />
          ))}

          {/* The whole pinwheel spins together - center + orbs */}
          <motion.div
            className="absolute inset-0"
            animate={{ rotate: 360 }}
            transition={{
              duration: 0.8,
              repeat: Infinity,
              ease: 'linear',
            }}
          >
            {/* Center coin */}
            <div
              className={`absolute inset-0 m-auto ${config.coin} rounded-full bg-gradient-to-br ${colors.coinGradient}`}
              style={{
                boxShadow: `0 0 30px ${colors.glowColor}, 0 0 60px ${colors.glowColor}`,
              }}
            />

            {/* Orbiting coins - 5 orbs with trails */}
            {[0, 1, 2, 3, 4].map((i) => {
              const pos = getOrbPosition(i);
              const trailAngle = (i * 72 - 90 - 30) * (Math.PI / 180);
              const trailPos = {
                x: Math.cos(trailAngle) * config.orbRadius * 0.85,
                y: Math.sin(trailAngle) * config.orbRadius * 0.85,
              };
              
              return (
                <div key={i}>
                  {/* Trail effect */}
                  <div
                    className={`absolute ${config.orb} rounded-full bg-gradient-to-br ${colors.orbGradients[i]} opacity-30`}
                    style={{
                      top: '50%',
                      left: '50%',
                      marginTop: '-10px',
                      marginLeft: '-10px',
                      transform: `translate(${trailPos.x}px, ${trailPos.y}px)`,
                      filter: 'blur(4px)',
                    }}
                  />
                  {/* Main orb - bright and visible */}
                  <div
                    className={`absolute ${config.orb} rounded-full bg-gradient-to-br ${colors.orbGradients[i]}`}
                    style={{
                      top: '50%',
                      left: '50%',
                      marginTop: '-10px',
                      marginLeft: '-10px',
                      transform: `translate(${pos.x}px, ${pos.y}px)`,
                      boxShadow: `0 0 10px ${colors.glowColor}, 0 0 20px ${colors.glowColor}`,
                    }}
                  />
                </div>
              );
            })}
          </motion.div>
        </div>

        {message && (
          <motion.p
            className={`${config.text} text-muted-foreground font-medium`}
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            {message}
          </motion.p>
        )}
      </div>
    );
  }

  // Default: blooming variant - Matches CoinsBloom reference
  // Small center gradient ball + large soft radiating rings + floating background orbs
  return (
    <div className="flex flex-col items-center justify-center gap-6">
      <div className={`relative ${config.container} flex items-center justify-center`}>
        
        {/* Large soft radiating rings - expanding outward */}
        {[0, 1, 2].map((i) => (
          <motion.div
            key={`ring-${i}`}
            className="absolute rounded-full"
            style={{
              width: config.coinPx * 0.8,
              height: config.coinPx * 0.8,
              backgroundColor: colorScheme === 'brand' 
                ? 'rgba(216, 180, 254, 0.4)' // soft lavender
                : 'rgba(167, 243, 208, 0.4)', // soft mint
            }}
            animate={{
              scale: [1, 4, 6],
              opacity: [0.5, 0.2, 0],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              delay: i * 1,
              ease: 'easeOut',
            }}
          />
        ))}

        {/* Floating background orbs - decorative */}
        {[
          { x: -60, y: -40, size: 0.6, delay: 0 },
          { x: 50, y: 30, size: 0.5, delay: 0.5 },
          { x: -30, y: 50, size: 0.4, delay: 1 },
        ].map((orb, i) => (
          <motion.div
            key={`orb-${i}`}
            className="absolute rounded-full"
            style={{
              width: config.coinPx * orb.size,
              height: config.coinPx * orb.size,
              backgroundColor: colorScheme === 'brand'
                ? i % 2 === 0 ? 'rgba(191, 219, 254, 0.5)' : 'rgba(233, 213, 255, 0.5)' // light blue / light purple
                : 'rgba(167, 243, 208, 0.4)',
              filter: 'blur(2px)',
              transform: `translate(${orb.x}px, ${orb.y}px)`,
            }}
            animate={{
              y: [orb.y, orb.y - 10, orb.y],
              opacity: [0.4, 0.6, 0.4],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              delay: orb.delay,
              ease: 'easeInOut',
            }}
          />
        ))}

        {/* Center gradient ball - small, spinning */}
        <motion.div
          className="absolute rounded-full"
          style={{
            width: config.coinPx * 0.7,
            height: config.coinPx * 0.7,
            background: colorScheme === 'brand'
              ? 'linear-gradient(135deg, #8b5cf6 0%, #a855f7 30%, #d946ef 60%, #ec4899 100%)'
              : 'linear-gradient(135deg, #2563eb 0%, #10b981 50%, #0d9488 100%)',
            boxShadow: colorScheme === 'brand'
              ? '0 4px 20px rgba(168, 85, 247, 0.4)'
              : '0 4px 20px rgba(16, 185, 129, 0.4)',
          }}
          animate={{ 
            rotate: 360,
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
      </div>

      {message && (
        <motion.p
          className={`${config.text} text-muted-foreground font-medium text-center`}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          {message}
        </motion.p>
      )}
    </div>
  );
}
