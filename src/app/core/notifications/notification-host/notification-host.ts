import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NotificationService } from '../notification.service';

/** Renders the app-wide notification stack. Mounted once, in the app shell. */
@Component({
  selector: 'ku-notification-host',
  templateUrl: './notification-host.html',
  styleUrl: './notification-host.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationHost {
  protected readonly notifications = inject(NotificationService);
}
