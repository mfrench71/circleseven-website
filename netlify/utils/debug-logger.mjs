/**
 * Debug Logger for Netlify Functions
 *
 * Only logs when DEBUG environment variable is set to 'true'.
 * Use this instead of console.log in production code.
 */

const isDebug = process.env.DEBUG === 'true';

export const debug = {
  log: (...args) => isDebug && console.log(...args),
  info: (...args) => isDebug && console.info(...args),
  warn: (...args) => console.warn(...args), // Always show warnings
  error: (...args) => console.error(...args), // Always show errors
};

export default debug;
