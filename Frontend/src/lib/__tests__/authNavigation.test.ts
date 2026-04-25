import { describe, expect, it } from 'vitest';

import { getSafePostLoginPath } from '@/lib/authNavigation';

describe('getSafePostLoginPath', () => {
  it('redirects an employee away from a restricted route after login', () => {
    expect(getSafePostLoginPath('EMPLOYEE', '/employees')).toBe('/dashboard');
  });

  it('keeps an admin on the requested employee creation route', () => {
    expect(getSafePostLoginPath('ADMIN', '/employees/create')).toBe('/employees/create');
  });
});