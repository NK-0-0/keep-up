import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SessionRedirect } from './core/auth/session-redirect';
import { LoadingService } from './core/http/loading.service';
import { NotificationHost } from './core/notifications/notification-host/notification-host';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NotificationHost],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  protected readonly loading = inject(LoadingService);

  /**
   * Instantiated for its effect: returns the student to sign-in when their
   * session ends, from this tab or another.
   */
  private readonly sessionRedirect = inject(SessionRedirect);
}
