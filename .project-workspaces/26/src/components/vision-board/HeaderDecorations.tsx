import { motion } from 'framer-motion';

interface HeaderDecorationsProps {
  isKidsMode?: boolean;
}

export function HeaderDecorations({ isKidsMode = false }: HeaderDecorationsProps) {
  if (isKidsMode) {
    return (
      <>
        {/* Floating stars for kids mode */}
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={`star-${i}`}
            className="absolute text-2xl"
            style={{
              left: `${10 + i * 12}%`,
              top: `${20 + (i % 3) * 25}%`,
            }}
            animate={{
              y: [-10, 10, -10],
              rotate: [0, 15, -15, 0],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 3 + i * 0.5,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: i * 0.3,
            }}
          >
            ⭐
          </motion.div>
        ))}
        
        {/* Rainbow arc */}
        <motion.div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-48 opacity-20"
          style={{
            background: 'linear-gradient(180deg, transparent 0%, rgba(255,0,0,0.3) 20%, rgba(255,165,0,0.3) 40%, rgba(255,255,0,0.3) 60%, rgba(0,128,0,0.3) 80%, rgba(0,0,255,0.3) 100%)',
            borderRadius: '50% 50% 0 0',
          }}
          animate={{
            opacity: [0.1, 0.25, 0.1],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      </>
    );
  }

  return (
    <>
      {/* Floating geometric shapes */}
      <motion.div
        className="absolute top-10 left-10 w-20 h-20 border-2 border-purple-500/30 rounded-lg"
        animate={{
          rotate: [0, 90, 180, 270, 360],
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: 'linear',
        }}
      />
      
      <motion.div
        className="absolute top-20 right-20 w-16 h-16 border-2 border-cyan-500/30 rounded-full"
        animate={{
          y: [-20, 20, -20],
          x: [-10, 10, -10],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
      
      <motion.div
        className="absolute bottom-40 left-20 w-12 h-12 bg-gradient-to-br from-pink-500/20 to-purple-500/20 rounded-lg"
        animate={{
          rotate: [45, 135, 45],
          scale: [1, 1.2, 1],
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
      
      {/* Subtle grid pattern overlay */}
      <div 
        className="absolute inset-0 opacity-[0.02] pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(139, 92, 246, 0.5) 1px, transparent 1px),
            linear-gradient(90deg, rgba(139, 92, 246, 0.5) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
        }}
      />
    </>
  );
}
