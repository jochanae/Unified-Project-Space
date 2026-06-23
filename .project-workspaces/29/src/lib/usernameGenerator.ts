// Fun trading-themed username generator

const adjectives = [
  'Bullish', 'Bearish', 'Diamond', 'Golden', 'Swift', 'Lucky', 'Steady', 
  'Sharp', 'Bold', 'Wise', 'Rising', 'Savvy', 'Epic', 'Mega', 'Ultra',
  'Clever', 'Quick', 'Strong', 'Bright', 'Cool', 'Slick', 'Smart'
];

const nouns = [
  'Trader', 'Bull', 'Bear', 'Whale', 'Wolf', 'Eagle', 'Hawk', 'Lion',
  'Shark', 'Fox', 'Titan', 'Maven', 'Guru', 'Pro', 'Ace', 'King',
  'Queen', 'Chief', 'Boss', 'Star', 'Hero', 'Champ', 'Legend'
];

const getRandomElement = <T>(arr: T[]): T => {
  return arr[Math.floor(Math.random() * arr.length)];
};

const getRandomNumber = (min: number, max: number): number => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

export const generateUsername = (): string => {
  const adjective = getRandomElement(adjectives);
  const noun = getRandomElement(nouns);
  const number = getRandomNumber(1, 99);
  
  return `${adjective}${noun}${number}`;
};

export const generateMultipleUsernames = (count: number = 5): string[] => {
  const usernames: string[] = [];
  const usedCombos = new Set<string>();
  
  while (usernames.length < count) {
    const username = generateUsername();
    if (!usedCombos.has(username)) {
      usedCombos.add(username);
      usernames.push(username);
    }
  }
  
  return usernames;
};
