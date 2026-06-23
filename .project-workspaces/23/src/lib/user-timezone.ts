/**
 * Global user-timezone preference.
 *
 * When a user picks a timezone in Settings, every time-formatting call site
 * across the app should respect it without having to be manually rewired.
 * To achieve that without auditing 35+ files, we patch the most common
 * time-formatting APIs once, on module import, so they default `timeZone`
 * to the user's saved preference when no timezone was explicitly passed.
 *
 *  - Date.prototype.toLocaleString / toLocaleDateString / toLocaleTimeString
 *  - new Intl.DateTimeFormat(...)
 *
 * Explicit `timeZone` options always win, so library code that needs UTC or
 * a specific zone is unaffected.
 */

const browserTz = (() => {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone; }
  catch { return 'UTC'; }
})();

let _userTz: string | null = null;

export function getUserTimezone(): string {
  return _userTz || browserTz;
}

export function getBrowserTimezone(): string {
  return browserTz;
}

const listeners = new Set<(tz: string) => void>();

export function setUserTimezone(tz: string | null | undefined): void {
  const next = tz && tz.trim() ? tz.trim() : null;
  if (next === _userTz) return;
  _userTz = next;
  const effective = getUserTimezone();
  listeners.forEach(l => { try { l(effective); } catch {} });
}

export function subscribeUserTimezone(cb: (tz: string) => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

// ---- monkey-patch (idempotent) ------------------------------------------------

type AnyFn = (...args: any[]) => any;

const PATCH_FLAG = '__intoiq_tz_patched__';

function withTz(opts: any): any {
  const tz = getUserTimezone();
  if (!tz) return opts;
  if (opts && typeof opts === 'object' && 'timeZone' in opts && opts.timeZone) {
    return opts;
  }
  return { ...(opts || {}), timeZone: tz };
}

function patchDateMethod(name: 'toLocaleString' | 'toLocaleDateString' | 'toLocaleTimeString') {
  const proto = Date.prototype as any;
  const original: AnyFn = proto[name];
  if (!original || original[PATCH_FLAG]) return;
  const patched = function (this: Date, locales?: any, options?: any) {
    return original.call(this, locales, withTz(options));
  } as AnyFn;
  (patched as any)[PATCH_FLAG] = true;
  proto[name] = patched;
}

function patchIntlDateTimeFormat() {
  const Original = Intl.DateTimeFormat as any;
  if (!Original || Original[PATCH_FLAG]) return;
  const Patched: any = function (this: any, locales?: any, options?: any) {
    if (!(this instanceof Patched)) {
      return new Patched(locales, options);
    }
    return new Original(locales, withTz(options));
  };
  Patched.prototype = Original.prototype;
  Patched.supportedLocalesOf = Original.supportedLocalesOf?.bind(Original);
  Patched[PATCH_FLAG] = true;
  // Preserve a reference to the un-patched constructor for advanced callers.
  (Patched as any).__original = Original;
  try { (Intl as any).DateTimeFormat = Patched; } catch {}
}

patchDateMethod('toLocaleString');
patchDateMethod('toLocaleDateString');
patchDateMethod('toLocaleTimeString');
patchIntlDateTimeFormat();

// ---- formatting helpers -------------------------------------------------------

export function formatDate(d: Date | string | number, opts?: Intl.DateTimeFormatOptions): string {
  const date = d instanceof Date ? d : new Date(d);
  return new Intl.DateTimeFormat(undefined, opts).format(date);
}

export function formatDateTime(d: Date | string | number): string {
  return formatDate(d, { dateStyle: 'medium', timeStyle: 'short' });
}

export function formatTime(d: Date | string | number): string {
  return formatDate(d, { timeStyle: 'short' });
}
