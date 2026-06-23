/**
 * LOADING COINS - Original Fast Stacking
 * 5-coin stack animation
 */

interface LoadingCoinsProps {
  size?: 'sm' | 'md' | 'lg';
  message?: string;
  className?: string;
}

const sizeMap = {
  sm: { coin: 'w-6 h-6', gap: 'gap-1' },
  md: { coin: 'w-10 h-10', gap: 'gap-1.5' },
  lg: { coin: 'w-14 h-14', gap: 'gap-2' },
};

export function LoadingCoins({ size = 'md', message, className }: LoadingCoinsProps) {
  const coins = [0, 1, 2, 3, 4];
  const colors = ['#2563EB', '#7C3AED', '#9333EA', '#C026D3', '#DB2777'];

  return (
    <div className={`flex flex-col items-center justify-center ${sizeMap[size].gap} ${className || ''}`}>
      <div className="relative flex flex-col-reverse items-center">
        {coins.map((index) => (
          <div
            key={index}
            className={`${sizeMap[size].coin} rounded-full shadow-lg`}
            style={{
              backgroundColor: colors[index],
              animation: `stackCoin 0.8s ease-in-out infinite`,
              animationDelay: `${index * 0.1}s`,
              transform: `translateY(${-index * 4}px)`,
            }}
          />
        ))}
      </div>
      {message && <p className="mt-4 text-sm text-muted-foreground">{message}</p>}
      <style>{`
        @keyframes stackCoin {
          0%, 100% { transform: translateY(0) scale(1); opacity: 1; }
          50% { transform: translateY(-10px) scale(1.05); opacity: 0.8; }
        }
      `}</style>
    </div>
  );
}

export default LoadingCoins;
