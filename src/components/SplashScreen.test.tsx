import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SplashScreen } from '../components/SplashScreen';

describe('SplashScreen', () => {
  it('renders loading spinner', () => {
    render(<SplashScreen />);
    
    // Check for spinner element
    const spinner = document.querySelector('.spinner');
    expect(spinner).toBeInTheDocument();
  });

  it('displays app title', () => {
    render(<SplashScreen />);
    
    expect(screen.getByText('VSCode Android')).toBeInTheDocument();
  });

  it('displays tagline', () => {
    render(<SplashScreen />);
    
    expect(screen.getByText('Code anywhere, sync everywhere')).toBeInTheDocument();
  });

  it('shows version number', () => {
    render(<SplashScreen />);
    
    expect(screen.getByText('v1.0.0')).toBeInTheDocument();
  });

  it('has progress bar', () => {
    render(<SplashScreen />);
    
    const progressBar = document.querySelector('[style*="width"]');
    expect(progressBar).toBeInTheDocument();
  });
});
