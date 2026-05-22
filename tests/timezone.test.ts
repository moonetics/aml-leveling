import { describe, expect, it } from 'vitest';

import { isValidTimeZone } from '../src/utils/timezone.js';

describe('isValidTimeZone', () => {
  it('accepts IANA timezone names', () => {
    expect(isValidTimeZone('Asia/Jakarta')).toBe(true);
  });

  it('rejects invalid timezone names', () => {
    expect(isValidTimeZone('Not/A_Timezone')).toBe(false);
  });
});

