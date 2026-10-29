import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { AdBannerContainer } from '../../src/ui/components/AdBannerContainer.js';

describe('AdBannerContainer Component', () => {
  it('デフォルト（オフ状態）では広告コンテナが一切レンダリングされないこと', () => {
    const { container } = render(<AdBannerContainer slotId="test-slot" />);
    expect(container.firstChild).toBeNull();
    expect(screen.queryByTestId('ad-banner-container')).not.toBeInTheDocument();
  });

  it('enabled=true を指定した場合は広告コンテナが表示されること', () => {
    render(<AdBannerContainer slotId="test-slot" enabled={true} />);
    expect(screen.getByTestId('ad-banner-container')).toBeInTheDocument();
    expect(screen.getByText(/広告掲載エリア/)).toBeInTheDocument();
  });

  it('enabled=false を明示的に指定した場合はレンダリングされないこと', () => {
    const { container } = render(<AdBannerContainer slotId="test-slot" enabled={false} />);
    expect(container.firstChild).toBeNull();
    expect(screen.queryByTestId('ad-banner-container')).not.toBeInTheDocument();
  });
});
