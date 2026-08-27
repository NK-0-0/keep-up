import { computed, Injectable, signal } from '@angular/core';

/**
 * Counts in-flight HTTP requests so the shell can show a progress bar. A
 * counter rather than a boolean, so overlapping requests do not switch each
 * other off.
 */
@Injectable({ providedIn: 'root' })
export class LoadingService {
  private readonly inFlight = signal(0);

  readonly pending = this.inFlight.asReadonly();
  readonly isLoading = computed(() => this.inFlight() > 0);

  start(): void {
    this.inFlight.update((count) => count + 1);
  }

  stop(): void {
    this.inFlight.update((count) => Math.max(0, count - 1));
  }
}
