import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { provideUnconfiguredFirebase } from '../testing/firebase-testing';
import { App } from './app';

describe('App', () => {
  it('renders the routed outlet shell', async () => {
    TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([]), ...provideUnconfiguredFirebase()],
    });

    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('router-outlet')).toBeTruthy();
  });
});
