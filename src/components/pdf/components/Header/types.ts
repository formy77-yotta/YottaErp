export interface BaseHeaderProps {
  logo?: string | null;
  organizationName: string;
  title: string;
  number: string;
  date: string;
  config: {
    logoPosition: 'left' | 'center' | 'right';
    showDate: boolean;
    backgroundColor?: string;
    textColor?: string;
  };
}
