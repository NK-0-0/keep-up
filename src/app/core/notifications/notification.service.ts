import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { createId } from '../../domain/module-edits';

export type NotificationTone = 'error' | 'warning' | 'info';

export interface Notification {
  readonly id: string;
  readonly tone: NotificationTone;
  readonly message: string;
}

/** How long a dismissible notification stays on screen. */
const AUTO_DISMISS_MS = 8_000;

/**
 * App-wide, transient messages. The HTTP error interceptor is the main
 * publisher; anything that needs to tell the student something outside the
 * flow of a specific screen can use it too.
 */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly items = signal<readonly Notification[]>([]);
  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();

  readonly notifications = this.items.asReadonly();
  readonly hasNotifications = computed(() => this.items().length > 0);

  constructor() {
    inject(DestroyRef).onDestroy(() => this.clear());
  }

  error(message: string): string {
    return this.push('error', message);
  }

  warn(message: string): string {
    return this.push('warning', message);
  }

  info(message: string): string {
    return this.push('info', message);
  }

  dismiss(id: string): void {
    this.clearTimer(id);
    this.items.update((current) => current.filter((notification) => notification.id !== id));
  }

  clear(): void {
    for (const id of [...this.timers.keys()]) this.clearTimer(id);
    this.items.set([]);
  }

  private push(tone: NotificationTone, message: string): string {
    // Collapse repeats so a burst of failing requests does not stack up
    // identical banners.
    const duplicate = this.items().find(
      (notification) => notification.tone === tone && notification.message === message,
    );
    if (duplicate) {
      this.restartTimer(duplicate.id);
      return duplicate.id;
    }

    const notification: Notification = { id: createId(), tone, message };
    this.items.update((current) => [...current, notification]);
    this.restartTimer(notification.id);
    return notification.id;
  }

  private restartTimer(id: string): void {
    this.clearTimer(id);
    this.timers.set(
      id,
      setTimeout(() => this.dismiss(id), AUTO_DISMISS_MS),
    );
  }

  private clearTimer(id: string): void {
    const timer = this.timers.get(id);
    if (timer === undefined) return;
    clearTimeout(timer);
    this.timers.delete(id);
  }
}
