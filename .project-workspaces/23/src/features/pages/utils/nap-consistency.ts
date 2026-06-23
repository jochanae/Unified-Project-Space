/**
 * NAP (Name, Address, Phone) consistency checker.
 * Compares the canonical business profile against external directory listings
 * (Google, Yelp, Bing, Apple Maps, Facebook) so creators can spot mismatches
 * that hurt local SEO trust signals.
 */
import type { LocalBusinessInfo } from './local-business-schema';

export interface DirectoryListing {
  /** Stable id, e.g. 'google' */
  key: string;
  /** Pretty name shown in UI */
  label: string;
  /** Public profile URL the user pasted */
  url?: string;
  /** What the directory shows */
  name?: string;
  address?: string;
  phone?: string;
}

export const DEFAULT_DIRECTORIES: DirectoryListing[] = [
  { key: 'google', label: 'Google Business Profile' },
  { key: 'yelp', label: 'Yelp' },
  { key: 'bing', label: 'Bing Places' },
  { key: 'apple', label: 'Apple Maps' },
  { key: 'facebook', label: 'Facebook' },
];

export type FieldStatus = 'match' | 'mismatch' | 'missing';

export interface FieldCheck {
  field: 'name' | 'address' | 'phone';
  status: FieldStatus;
  canonical: string;
  found: string;
}

export interface DirectoryReport {
  listing: DirectoryListing;
  checks: FieldCheck[];
  /** 0..100 across the 3 NAP fields */
  score: number;
}

export interface NapReport {
  canonical: { name: string; address: string; phone: string };
  reports: DirectoryReport[];
  /** Average score across listings that have any data */
  overallScore: number;
}

const normalize = (s: string | undefined | null): string =>
  (s || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '')
    .trim();

const normalizePhone = (s: string | undefined | null): string =>
  (s || '').replace(/\D+/g, '').replace(/^1/, '');

export function flattenAddress(info: LocalBusinessInfo): string {
  const a = info.address || ({} as LocalBusinessInfo['address']);
  return [a.street, a.city, a.region, a.postalCode, a.country].filter(Boolean).join(', ');
}

function compareField(
  field: FieldCheck['field'],
  canonical: string,
  found: string
): FieldCheck {
  if (!found?.trim()) return { field, status: 'missing', canonical, found: '' };
  const a = field === 'phone' ? normalizePhone(canonical) : normalize(canonical);
  const b = field === 'phone' ? normalizePhone(found) : normalize(found);
  return {
    field,
    status: a && b && a === b ? 'match' : 'mismatch',
    canonical,
    found,
  };
}

export function buildNapReport(
  canonical: LocalBusinessInfo,
  listings: DirectoryListing[]
): NapReport {
  const cName = canonical.name || '';
  const cAddress = flattenAddress(canonical);
  const cPhone = canonical.telephone || '';

  const reports: DirectoryReport[] = listings.map((listing) => {
    const checks: FieldCheck[] = [
      compareField('name', cName, listing.name || ''),
      compareField('address', cAddress, listing.address || ''),
      compareField('phone', cPhone, listing.phone || ''),
    ];
    const matches = checks.filter((c) => c.status === 'match').length;
    const provided = checks.filter((c) => c.status !== 'missing').length;
    const score = provided ? Math.round((matches / 3) * 100) : 0;
    return { listing, checks, score };
  });

  const used = reports.filter((r) =>
    r.checks.some((c) => c.status !== 'missing')
  );
  const overallScore = used.length
    ? Math.round(used.reduce((sum, r) => sum + r.score, 0) / used.length)
    : 0;

  return {
    canonical: { name: cName, address: cAddress, phone: cPhone },
    reports,
    overallScore,
  };
}
