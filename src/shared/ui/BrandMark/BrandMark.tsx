type BrandMarkProps = {
  className?: string;
};

export function BrandMark({ className }: BrandMarkProps) {
  return <img alt="Автовидно" className={className} src="/favicon.svg" />;
}
