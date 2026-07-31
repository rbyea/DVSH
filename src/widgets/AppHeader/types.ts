export interface MenuItem {
  label: string;
  key: string;
  href?: string;
  icon?: React.ReactNode;
  children?: MenuItem[];
  disabled?: boolean;
}
