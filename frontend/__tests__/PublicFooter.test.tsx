import React from 'react';
import { render, screen } from '@testing-library/react';
import { PublicFooter } from '../src/shared/components/layout/PublicFooter';

describe('PublicFooter Component', () => {
  it('renders TaskSphere brand logo and text', () => {
    render(<PublicFooter />);
    expect(screen.getByText('TaskSphere')).toBeInTheDocument();
  });

  it('renders privacy policy and terms links', () => {
    render(<PublicFooter />);
    expect(screen.getByText('Privacy Policy')).toBeInTheDocument();
    expect(screen.getByText('Terms & Conditions')).toBeInTheDocument();
  });

  it('renders copyright with current year', () => {
    render(<PublicFooter />);
    const currentYear = new Date().getFullYear();
    expect(screen.getByText(new RegExp(`© ${currentYear} TaskSphere Inc.`))).toBeInTheDocument();
  });
});
