import { InputNumber, type InputNumberProps } from 'antd';
import { useEffect, useState } from 'react';

type DeferredInputNumberProps = Omit<
  InputNumberProps,
  'value' | 'defaultValue' | 'onChange' | 'onBlur' | 'onFocus'
> & {
  value: number | null | undefined;
  onCommit: (value: number | null) => void;
};

/**
 * InputNumber that keeps a local draft while typing and only calls onCommit on blur
 * (so API updates are not fired on every digit).
 */
export function DeferredInputNumber({ value, onCommit, ...rest }: DeferredInputNumberProps) {
  const [draft, setDraft] = useState<number | null | undefined>(value);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) {
      setDraft(value);
    }
  }, [value, focused]);

  const commit = () => {
    const next = typeof draft === 'number' ? draft : null;
    const current = typeof value === 'number' ? value : null;

    if (next === current) {
      return;
    }

    onCommit(next);
  };

  return (
    <InputNumber
      {...rest}
      value={typeof draft === 'number' ? draft : undefined}
      onChange={(next) => setDraft(typeof next === 'number' ? next : null)}
      onFocus={() => setFocused(true)}
      onBlur={() => {
        setFocused(false);
        commit();
      }}
      onPressEnter={(event) => {
        (event.target as HTMLInputElement).blur();
      }}
    />
  );
}
