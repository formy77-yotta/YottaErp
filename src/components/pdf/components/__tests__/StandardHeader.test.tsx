import React from 'react';
import { StandardHeader } from '../Header/StandardHeader';

describe('StandardHeader', () => {
  const defaultProps = {
    organizationName: 'Test Company',
    title: 'Fattura',
    number: '2025-001',
    date: new Date('2025-02-08').toISOString(),
    config: {
      logoPosition: 'left' as const,
      showDate: true,
    },
  };

  it('is defined', () => {
    expect(StandardHeader).toBeDefined();
  });

  it('accepts default props', () => {
    const component = <StandardHeader {...defaultProps} />;
    expect(component).toBeDefined();
  });

  it('accepts logo prop', () => {
    const props = { ...defaultProps, logo: 'https://example.com/logo.png' };
    const component = <StandardHeader {...props} />;
    expect(component).toBeDefined();
  });

  it('accepts showDate false', () => {
    const props = {
      ...defaultProps,
      config: { ...defaultProps.config, showDate: false },
    };
    const component = <StandardHeader {...props} />;
    expect(component).toBeDefined();
  });
});
