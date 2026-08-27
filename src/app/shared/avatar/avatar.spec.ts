import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { Avatar } from './avatar';
import { sizedGooglePhoto } from './google-photo';

describe('sizedGooglePhoto', () => {
  it('rewrites the size baked into a Google photo URL', () => {
    expect(sizedGooglePhoto('https://lh3.googleusercontent.com/a/ABC=s96-c', 128)).toBe(
      'https://lh3.googleusercontent.com/a/ABC=s128-c',
    );
  });

  it('clamps to a sane range', () => {
    expect(sizedGooglePhoto('https://lh3.googleusercontent.com/a/ABC=s96-c', 9000)).toContain(
      '=s512-c',
    );
  });

  it('leaves other hosts alone', () => {
    const url = 'https://example.test/photo.png=s96-c';
    expect(sizedGooglePhoto(url, 128)).toBe(url);
  });

  it('does not match a lookalike host', () => {
    const url = 'https://googleusercontent.com.attacker.test/a/ABC=s96-c';
    expect(sizedGooglePhoto(url, 128)).toBe(url);
  });

  it('survives a malformed URL', () => {
    expect(sizedGooglePhoto('not a url', 128)).toBe('not a url');
  });
});

describe('Avatar', () => {
  let fixture: ComponentFixture<Avatar>;

  function image(): HTMLImageElement | null {
    return fixture.nativeElement.querySelector('img');
  }

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [Avatar] });
    fixture = TestBed.createComponent(Avatar);
    fixture.componentRef.setInput('initials', 'TM');
  });

  it('shows initials when there is no photo', () => {
    fixture.detectChanges();

    expect(image()).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('TM');
  });

  it('shows the photo when one is supplied', () => {
    fixture.componentRef.setInput('photoUrl', 'https://lh3.googleusercontent.com/a/ABC=s96-c');
    fixture.detectChanges();

    expect(image()?.getAttribute('referrerpolicy')).toBe('no-referrer');
    expect(image()?.getAttribute('src')).toContain('=s76-c');
  });

  it('falls back to initials when the photo fails to load', () => {
    fixture.componentRef.setInput('photoUrl', 'https://lh3.googleusercontent.com/a/ABC=s96-c');
    fixture.detectChanges();

    image()!.dispatchEvent(new Event('error'));
    fixture.detectChanges();

    expect(image()).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('TM');
  });

  it('retries when a different photo arrives after a failure', () => {
    fixture.componentRef.setInput('photoUrl', 'https://lh3.googleusercontent.com/a/OLD=s96-c');
    fixture.detectChanges();
    image()!.dispatchEvent(new Event('error'));
    fixture.detectChanges();

    fixture.componentRef.setInput('photoUrl', 'https://lh3.googleusercontent.com/a/NEW=s96-c');
    fixture.detectChanges();

    expect(image()?.getAttribute('src')).toContain('NEW');
  });
});
