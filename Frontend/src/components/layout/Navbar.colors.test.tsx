import { describe, expect, it } from 'vitest';
import { NOTIFICATION_TYPE_COLORS } from './Navbar';

const RAINBOW_CLASSES = ['bg-blue-500', 'bg-green-500', 'bg-red-500', 'bg-purple-500', 'bg-orange-500', 'bg-gray-400'];

describe('Navbar — puces de notification en tokens sémantiques, pas de palette arc-en-ciel', () => {
  it('chaque type de notification utilise un token sémantique du design system', () => {
    expect(NOTIFICATION_TYPE_COLORS).toEqual({
      leave_request: 'bg-warning',
      leave_approved: 'bg-success',
      leave_rejected: 'bg-destructive',
      application_received: 'bg-primary',
      task_assigned: 'bg-primary',
      system: 'bg-muted-foreground',
    });
  });

  it("aucune couleur Tailwind arbitraire (blue/green/red/purple/orange/gray) ne reste utilisée", () => {
    const values = Object.values(NOTIFICATION_TYPE_COLORS);
    RAINBOW_CLASSES.forEach((cls) => expect(values).not.toContain(cls));
  });
});
