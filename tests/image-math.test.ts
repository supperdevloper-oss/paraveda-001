import { describe, expect, it } from 'vitest';
import { buildLadder, computeImagePlan, centerCropRect, rotationBounds, startQualitySearch, nextQualityProbe, recordQualityProbe, qualitySearchConverged } from '../src/lib/engines/image-math';

describe('image geometry', () => {
  it('clamps crop rectangles inside decoded image pixels', () => {
    const plan = computeImagePlan(100, 80, { resize: { mode: 'keep' }, crop: { x: 0.9, y: 0.8, w: 0.5, h: 0.5 } });
    expect(plan.crop).toEqual({ x: 90, y: 64, w: 10, h: 16 });
  });
  it('halves large reductions before the final resize', () => {
    expect(buildLadder({ w: 4000, h: 2000 }, { w: 500, h: 250 })).toEqual([
      { w: 2000, h: 1000 }, { w: 1000, h: 500 }, { w: 500, h: 250 },
    ]);
  });
  it('rotates dimensions exactly for axis-aligned turns and bounds arbitrary turns', () => {
    expect(rotationBounds({ w: 40, h: 20 }, 90)).toEqual({ w: 20, h: 40 });
    expect(rotationBounds({ w: 40, h: 20 }, 0)).toEqual({ w: 40, h: 20 });
    expect(rotationBounds({ w: 100, h: 20 }, 89.8)).toEqual({ w: 21, h: 101 });
    const diagonal = rotationBounds({ w: 100, h: 100 }, 45);
    expect(diagonal.w).toBeGreaterThanOrEqual(141);
    expect(diagonal.h).toBeGreaterThanOrEqual(141);
  });
  it('rejects outputs exceeding browser canvas limits', () => {
    expect(() => computeImagePlan(150, 2, { resize: { mode: 'keep' }, maxCanvasDimension: 100 })).toThrow(/canvas limit/i);
    expect(() => computeImagePlan(100, 100, { resize: { mode: 'keep' }, maxCanvasDimension: 50 })).toThrow(/canvas limit|megapixels/i);
  });
  it('centres cover crops', () => {
    expect(centerCropRect({ w: 400, h: 200 }, { w: 1, h: 1 })).toEqual({ x: 100, y: 0, w: 200, h: 200 });
  });
});

describe('quality binary search', () => {
  it('converges by measuring real output sizes', () => {
    let state = startQualitySearch(0.3, 0.95, 7);
    const probes: number[] = [];
    while (!qualitySearchConverged(state)) {
      const q = nextQualityProbe(state);
      probes.push(q);
      // Test fixture: encoded size is proportional to quality.
      state = recordQualityProbe(state, q, Math.round(q * 1000), 700);
    }
    expect(probes.length).toBeGreaterThan(1);
    expect(probes.length).toBeLessThanOrEqual(7);
    expect(state.best?.quality).toBeLessThanOrEqual(0.7);
    expect(state.best?.size).toBeLessThanOrEqual(700);
  });
});
