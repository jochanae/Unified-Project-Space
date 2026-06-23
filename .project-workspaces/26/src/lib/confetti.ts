import confetti from "canvas-confetti";

export const triggerGoalCelebration = () => {
  const duration = 3000;
  const animationEnd = Date.now() + duration;
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

  const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

  const interval = setInterval(() => {
    const timeLeft = animationEnd - Date.now();

    if (timeLeft <= 0) {
      return clearInterval(interval);
    }

    const particleCount = 50 * (timeLeft / duration);

    // Left side burst
    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
      colors: ["#8B5CF6", "#EC4899", "#10B981", "#F59E0B", "#3B82F6"],
    });

    // Right side burst
    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
      colors: ["#8B5CF6", "#EC4899", "#10B981", "#F59E0B", "#3B82F6"],
    });
  }, 250);
};

export const triggerSmallCelebration = () => {
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 },
    colors: ["#8B5CF6", "#EC4899", "#10B981"],
    zIndex: 9999,
  });
};

export const triggerFireworks = () => {
  const duration = 5000;
  const animationEnd = Date.now() + duration;
  const defaults = { startVelocity: 45, spread: 360, ticks: 100, zIndex: 9999 };

  const interval = setInterval(() => {
    const timeLeft = animationEnd - Date.now();

    if (timeLeft <= 0) {
      return clearInterval(interval);
    }

    confetti({
      ...defaults,
      particleCount: 100,
      origin: { x: Math.random(), y: Math.random() * 0.3 },
      colors: ["#8B5CF6", "#EC4899", "#10B981", "#F59E0B", "#3B82F6", "#14B8A6"],
    });
  }, 400);
};
