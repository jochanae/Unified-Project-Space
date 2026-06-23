import { describe, it, expect } from 'vitest';
import { filterRowsByGeo, describeFilter, type GeoFilter } from '../GeoInsightsPanel';

const rows = [
  { country: 'US', region: 'CA', city: 'San Francisco', postal_code: '94110', pipeline_stage: 'won', created_at: '2026-01-01' },
  { country: 'US', region: 'CA', city: 'Los Angeles', postal_code: '90001', pipeline_stage: 'new', created_at: '2026-01-02' },
  { country: 'US', region: 'NY', city: 'New York', postal_code: '10001', pipeline_stage: 'won', created_at: '2026-01-03' },
  { country: 'CA', region: 'ON', city: 'Toronto', postal_code: 'M5H', pipeline_stage: 'won', created_at: '2026-01-04' },
];

describe('filterRowsByGeo', () => {
  it('returns all rows when no filter is set', () => {
    expect(filterRowsByGeo(rows, null)).toHaveLength(4);
    expect(filterRowsByGeo(rows, undefined)).toHaveLength(4);
    expect(filterRowsByGeo(rows, {})).toHaveLength(4);
  });

  it('drills down by country', () => {
    const out = filterRowsByGeo(rows, { country: 'US' });
    expect(out).toHaveLength(3);
    expect(out.every(r => r.country === 'US')).toBe(true);
  });

  it('drills down by region', () => {
    const out = filterRowsByGeo(rows, { region: 'CA' });
    expect(out).toHaveLength(2);
  });

  it('drills down by city', () => {
    const out = filterRowsByGeo(rows, { city: 'Toronto' });
    expect(out).toHaveLength(1);
    expect(out[0].country).toBe('CA');
  });

  it('drills down by postal_code', () => {
    const out = filterRowsByGeo(rows, { postal_code: '94110' });
    expect(out).toHaveLength(1);
  });

  it('combines multiple filters with AND', () => {
    const out = filterRowsByGeo(rows, { country: 'US', region: 'CA' });
    expect(out).toHaveLength(2);
    expect(out.every(r => r.country === 'US' && r.region === 'CA')).toBe(true);
  });

  it('returns empty when filter matches nothing', () => {
    const out = filterRowsByGeo(rows, { country: 'ZZ' });
    expect(out).toHaveLength(0);
  });
});

describe('describeFilter', () => {
  it('returns empty string for null/undefined/empty', () => {
    expect(describeFilter(null)).toBe('');
    expect(describeFilter(undefined)).toBe('');
    expect(describeFilter({})).toBe('');
  });

  it('formats single-key filters', () => {
    expect(describeFilter({ country: 'US' })).toBe('Country: US');
    expect(describeFilter({ region: 'CA' })).toBe('Region: CA');
    expect(describeFilter({ city: 'NYC' })).toBe('City: NYC');
    expect(describeFilter({ postal_code: '94110' })).toBe('ZIP: 94110');
  });

  it('joins multi-key filters with separator in canonical order', () => {
    const f: GeoFilter = { country: 'US', region: 'CA', city: 'SF', postal_code: '94110' };
    expect(describeFilter(f)).toBe('Country: US · Region: CA · City: SF · ZIP: 94110');
  });
});
