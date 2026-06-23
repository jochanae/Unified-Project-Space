/**
 * Gated logger — only outputs in development.
 * Use instead of console.log / console.warn in production builds.
 */
const isDev = import.meta.env.DEV;

export const logger = {
  log: (...args: unknown[]) => {
    if (isDev) console.log(...args);
  },
  warn: (...args: unknown[]) => {
    if (isDev) console.warn(...args);
  },
  /** Always logs — errors should be visible even in production */
  error: (...args: unknown[]) => {
    console.error(...args);
  },
};
