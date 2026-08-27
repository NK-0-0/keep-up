import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
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
}
