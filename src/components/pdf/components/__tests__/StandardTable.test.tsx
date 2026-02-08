import React from 'react';
import { StandardTable } from '../Table/StandardTable';

const sampleLines = [
  {
    productCode: 'ART-001',
    description: 'Prodotto test',
    unitPrice: '10.00',
    quantity: '2',
    vatRate: '0.22',
    netAmount: '20.00',
    vatAmount: '4.40',
    grossAmount: '24.40',
  },
];

const defaultColumns = {
  showSku: true,
  showDescription: true,
  showQuantity: true,
  showUnitPrice: true,
  showDiscount: false,
  showVatRate: true,
  showNetAmount: true,
  showVatAmount: true,
  showGrossAmount: true,
};

const defaultStyle = {
  headerColor: '#1e40af',
  stripedRows: true,
  showBorders: true,
  fontSize: '10' as const,
};

describe('StandardTable', () => {
  it('is defined', () => {
    expect(StandardTable).toBeDefined();
  });

  it('accepts minimal props', () => {
    const component = (
      <StandardTable
        lines={sampleLines}
        columns={defaultColumns}
        style={defaultStyle}
      />
    );
    expect(component).toBeDefined();
  });

  it('accepts conditionalStyles', () => {
    const component = (
      <StandardTable
        lines={sampleLines}
        columns={defaultColumns}
        style={defaultStyle}
        conditionalStyles={[
          {
            target: 'row',
            condition: 'productType',
            value: 'SERVICE',
            backgroundColor: '#fecaca',
          },
        ]}
      />
    );
    expect(component).toBeDefined();
  });
});
