import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { signal } from '@angular/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthStatus } from './auth.models';
import { AuthService } from './auth.service';
import { SessionRedirect } from './session-redirect';

describe('SessionRedirect', () => {
  const status = signal<AuthStatus>('pending');
  let navigate: ReturnType<typeof vi.spyOn>;

  function start(url = '/'): void {
    TestBed.inject(SessionRedirect);
    vi.spyOn(TestBed.inject(Router), 'url', 'get').mockReturnValue(url);
    TestBed.tick();
  }

  beforeEach(() => {
    status.set('pending');

    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthService, useValue: { status } }],
    });

    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  });

  it('redirects to sign-in when an established session ends', () => {
    start();
    status.set('signed-in');
    TestBed.tick();

    status.set('signed-out');
    TestBed.tick();

    expect(navigate).toHaveBeenCalledWith(['/sign-in']);
  });

  it('leaves a cold load to the guards rather than racing them', () => {
    start();

    // pending → signed-out is a first load, not a session ending.
    status.set('signed-out');
    TestBed.tick();

    expect(navigate).not.toHaveBeenCalled();
  });

  it('does not redirect while the session is healthy', () => {
    start();
    status.set('signed-in');
    TestBed.tick();

    expect(navigate).not.toHaveBeenCalled();
  });

  it('stays put when already on the sign-in page', () => {
    start('/sign-in?returnUrl=%2F');
    status.set('signed-in');
    TestBed.tick();

    status.set('signed-out');
    TestBed.tick();

    expect(navigate).not.toHaveBeenCalled();
  });

  it('does nothing in local mode, where there is no session to lose', () => {
    start();
    status.set('local');
    TestBed.tick();

    expect(navigate).not.toHaveBeenCalled();
  });
});
