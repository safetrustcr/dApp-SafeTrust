import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

describe('hotel validator runtime export', () => {
  it('is a real named function when imported by Node from the API package', () => {
    const result = spawnSync(process.execPath, ['--input-type=module', '-e', `
      import { validateHotelInput } from '@safetrust/types';
      if (typeof validateHotelInput !== 'function') throw new Error('Hotel validator is not exported');
      if (!validateHotelInput({ name: 'Hotel', address: 'San José' }).valid) throw new Error('Valid hotel rejected');
      if (validateHotelInput({ name: '', address: '' }).valid) throw new Error('Invalid hotel accepted');
    `], { cwd: fileURLToPath(new URL('../../../../', import.meta.url)), encoding: 'utf8' });
    expect(result.stderr).toBe('');
    expect(result.status).toBe(0);
  });
});
