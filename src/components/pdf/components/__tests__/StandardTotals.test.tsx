import React from 'react';
import { StandardTotals } from '../Totals/StandardTotals';

describe('StandardTotals', () => {
  const defaultProps = {
    netTotal: '100.00',
    vatTotal: '22.00',
    grossTotal: '122.00',
  };

  it('is defined', () => {
    expect(StandardTotals).toBeDefined();
  });

  it('accepts default props', () => {
    const component = <StandardTotals {...defaultProps} />;
    expect(component).toBeDefined();
  });

  it('accepts showBreakdown false', () => {
    const component = <StandardTotals {...defaultProps} showBreakdown={false} />;
    expect(component).toBeDefined();
  });
});
