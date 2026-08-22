type MaxLogoProps = {
  className?: string;
};

export function MaxLogo({ className }: MaxLogoProps) {
  return <img alt="" className={className} height={24} src="/max-logo.png" width={24} />;
}
