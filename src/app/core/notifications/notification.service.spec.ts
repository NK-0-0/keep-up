import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NotificationService } from './notification.service';

describe('NotificationService', () => {
  let notifications: NotificationService;

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({});
    notifications = TestBed.inject(NotificationService);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('publishes a message with its tone', () => {
    notifications.error('Could not save');

    expect(notifications.hasNotifications()).toBe(true);
    expect(notifications.notifications()[0]).toMatchObject({
      tone: 'error',
      message: 'Could not save',
    });
  });

  it('collapses repeats instead of stacking them', () => {
    const first = notifications.error('Could not save');
    const second = notifications.error('Could not save');

    expect(first).toBe(second);
    expect(notifications.notifications()).toHaveLength(1);
  });

  it('keeps distinct messages apart', () => {
    notifications.error('Could not save');
    notifications.warn('Could not save');
    notifications.info('Something else');

    expect(notifications.notifications()).toHaveLength(3);
  });

  it('dismisses itself after the display window', () => {
    notifications.error('Could not save');

    vi.advanceTimersByTime(7_999);
    expect(notifications.hasNotifications()).toBe(true);

    vi.advanceTimersByTime(2);
    expect(notifications.hasNotifications()).toBe(false);
  });

  it('restarts the display window when a repeat arrives', () => {
    notifications.error('Could not save');
    vi.advanceTimersByTime(6_000);

    notifications.error('Could not save');
    vi.advanceTimersByTime(6_000);
    expect(notifications.hasNotifications()).toBe(true);

    vi.advanceTimersByTime(3_000);
    expect(notifications.hasNotifications()).toBe(false);
  });

  it('can be dismissed by hand', () => {
    const id = notifications.error('Could not save');

    notifications.dismiss(id);
    expect(notifications.hasNotifications()).toBe(false);
  });
});
