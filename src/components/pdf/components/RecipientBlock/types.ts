export interface RecipientData {
  name: string;
  vat?: string | null;
  fiscalCode?: string | null;
  address: string;
  city: string;
  zip: string;
  province: string;
  country: string;
}

export interface RecipientBlockProps {
  customer: RecipientData;
  position: 'left' | 'right';
  showLabel?: boolean;
  textColor?: string;
}
