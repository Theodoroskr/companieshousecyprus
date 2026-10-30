import { describe,it,expect } from 'vitest';
import { guideWeek, canPublishGuide } from './weekly-guides';
import { FORMATION_GUIDE_SOURCE } from './company-setup';
describe('weekly guide rules',()=>{
  it('deduplicates generation by Monday UTC week',()=>{ expect(guideWeek(new Date('2026-10-30T20:16:00Z'))).toBe('2026-10-26'); expect(guideWeek(new Date('2026-11-01T23:59:59Z'))).toBe('2026-10-26'); expect(guideWeek(new Date('2026-11-02T00:00:00Z'))).toBe('2026-11-02'); });
  it('only reviewed-ready drafts can be published',()=>{ expect(canPublishGuide('draft')).toBe(true); for(const status of ['generating','failed','rejected','published']) expect(canPublishGuide(status)).toBe(false); });
  it('formation packages start at 1500 before VAT',()=>{ expect(FORMATION_GUIDE_SOURCE.starting_price_eur).toBe(1500); expect(FORMATION_GUIDE_SOURCE.vat).toBe('additional'); });
});