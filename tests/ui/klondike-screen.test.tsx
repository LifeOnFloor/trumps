import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { KlondikeScreen } from '../../src/ui/screens/KlondikeScreen.js';

describe('KlondikeScreen UI Component', () => {
  it('renders Klondike Solitaire board with stock, foundations, and 7 tableaus', () => {
    const handleBack = vi.fn();
    render(<KlondikeScreen onBackToLobby={handleBack} />);

    // Screen and header elements
    expect(screen.getByTestId('klondike-screen')).toBeDefined();
    expect(screen.getByText('ソリティア')).toBeDefined();
    expect(screen.getByTestId('stock-pile')).toBeDefined();

    // 4 Foundations
    expect(screen.getByTestId('foundation-spade')).toBeDefined();
    expect(screen.getByTestId('foundation-heart')).toBeDefined();
    expect(screen.getByTestId('foundation-diamond')).toBeDefined();
    expect(screen.getByTestId('foundation-club')).toBeDefined();

    // 7 Tableaus
    for (let i = 0; i < 7; i++) {
      expect(screen.getByTestId(`tableau-col-${i}`)).toBeDefined();
    }
  });

  it('clicking stock pile draws a card and updates move count', () => {
    render(<KlondikeScreen onBackToLobby={() => {}} />);

    const initialMovesText = screen.getByText(/0 手/);
    expect(initialMovesText).toBeDefined();

    const stockBtn = screen.getByTestId('stock-pile');
    fireEvent.click(stockBtn);

    // Moves counter incremented to 1
    expect(screen.getByText(/1 手/)).toBeDefined();
  });

  it('calls onBackToLobby when back button is clicked', () => {
    const handleBack = vi.fn();
    render(<KlondikeScreen onBackToLobby={handleBack} />);

    const backBtn = screen.getByTestId('klondike-back-button');
    fireEvent.click(backBtn);

    expect(handleBack).toHaveBeenCalledTimes(1);
  });
});
