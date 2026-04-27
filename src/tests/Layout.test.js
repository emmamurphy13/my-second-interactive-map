import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import SiteHeader from '$lib/components/Layout/SiteHeader.svelte';
import SiteFooter from '$lib/components/Layout/SiteFooter.svelte';

describe('SiteHeader', () => {
  it('renders the logo', () => {
    render(SiteHeader);
    expect(screen.getByLabelText('New York Public Library style site')).toBeTruthy();
  });

  it('renders default navigation links', () => {
    render(SiteHeader);
    expect(screen.getByText('Books & Research')).toBeTruthy();
    expect(screen.getByText('Locations')).toBeTruthy();
  });

  it('renders custom navigation links', () => {
    render(SiteHeader, {
      props: {
        navLinks: [{ label: 'Sports', href: '/sports' }],
      },
    });
    expect(screen.getByText('Sports')).toBeTruthy();
  });

  it('hides nav when navLinks is empty', () => {
    const { container } = render(SiteHeader, {
      props: { navLinks: [] },
    });
    expect(container.querySelector('nav')).toBeNull();
  });
});

describe('SiteFooter', () => {
  it('renders the CUNY logo', () => {
    render(SiteFooter);
    expect(
      screen.getByLabelText(
        'The New York Public Library'
      )
    ).toBeTruthy();
  });

  it('renders footer navigation links', () => {
    render(SiteFooter);
    expect(screen.getByText('HOURS & LOCATIONS')).toBeTruthy();
    expect(screen.getByText('DONATE')).toBeTruthy();
  });
});
