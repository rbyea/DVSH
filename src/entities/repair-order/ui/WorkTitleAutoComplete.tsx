import { AutoComplete, type AutoCompleteProps } from 'antd';
import { useEffect, useMemo, useState } from 'react';

import { useGetWorkItemSuggestionsQuery } from '../api/repairsApi';
import type { WorkTitleSuggestion } from '../model/types';

type WorkTitleAutoCompleteProps = Omit<
  AutoCompleteProps,
  'options' | 'value' | 'onChange' | 'onSelect' | 'filterOption'
> & {
  value: string;
  onChange: (title: string) => void;
  onSelectSuggestion?: (suggestion: WorkTitleSuggestion) => void;
  onPressEnter?: () => void;
};

function formatMoney(value: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(value);
}

export function WorkTitleAutoComplete({
  value,
  onChange,
  onSelectSuggestion,
  onPressEnter,
  onInputKeyDown,
  ...rest
}: WorkTitleAutoCompleteProps) {
  const [debouncedQuery, setDebouncedQuery] = useState(value.trim());

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedQuery(value.trim());
    }, 250);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [value]);

  const { data: suggestions = [] } = useGetWorkItemSuggestionsQuery({
    q: debouncedQuery || undefined,
  });

  const options = useMemo(
    () =>
      suggestions.map((suggestion) => {
        const priceLabel =
          typeof suggestion.price === 'number' ? ` · ${formatMoney(suggestion.price)}` : '';

        return {
          value: suggestion.title,
          label: `${suggestion.title}${priceLabel}`,
          suggestion,
        };
      }),
    [suggestions],
  );

  return (
    <AutoComplete
      {...rest}
      defaultActiveFirstOption={false}
      filterOption={false}
      options={options}
      value={value}
      onChange={(next) => onChange(typeof next === 'string' ? next : '')}
      onInputKeyDown={(event) => {
        onInputKeyDown?.(event);

        if (event.key === 'Enter') {
          event.preventDefault();
          event.stopPropagation();
          onPressEnter?.();
        }
      }}
      onSelect={(_next, option) => {
        const suggestion = (option as { suggestion?: WorkTitleSuggestion }).suggestion;

        if (suggestion) {
          onSelectSuggestion?.(suggestion);
        }
      }}
    />
  );
}
