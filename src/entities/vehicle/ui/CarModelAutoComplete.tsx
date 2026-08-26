import { AutoComplete, type AutoCompleteProps } from 'antd';
import clsx from 'clsx';
import { useMemo } from 'react';

import { brandStartsWithQuery, carModelStartsWithQuery, listCarBrands } from '@/shared/lib/vehicle';
import { CarBrandMark } from '@/shared/ui/CarBrandMark';

import { useGetVehicleModelSuggestionsQuery } from '../api/vehiclesApi';
import type { VehicleModelSuggestion } from '../model/types';

import styles from './CarModelAutoComplete.module.scss';

type CarModelAutoCompleteProps = Omit<
  AutoCompleteProps,
  'options' | 'value' | 'onChange' | 'filterOption' | 'children'
> & {
  value: string;
  onChange: (carModel: string) => void;
};

function uniqueModels(items: VehicleModelSuggestion[]): VehicleModelSuggestion[] {
  const seen = new Set<string>();
  const unique: VehicleModelSuggestion[] = [];

  for (const item of items) {
    const key = item.car_model.trim().toLowerCase();

    if (!key || seen.has(key)) {
      continue;
    }

    seen.add(key);
    unique.push(item);
  }

  return unique;
}

export function CarModelAutoComplete({
  value,
  onChange,
  size,
  status,
  placeholder,
  disabled,
  className,
  ...rest
}: CarModelAutoCompleteProps) {
  const query = value.trim();
  const { data: recent = [] } = useGetVehicleModelSuggestionsQuery();

  const options = useMemo(() => {
    const catalog = uniqueModels(recent);
    const matchingBrands = (query ? listCarBrands() : []).filter((brand) =>
      brandStartsWithQuery(brand, query),
    );
    const brandKeys = new Set(matchingBrands.map((brand) => brand.label.trim().toLowerCase()));
    const models = catalog.filter(
      (item) =>
        carModelStartsWithQuery(item.car_model, query) &&
        !brandKeys.has(item.car_model.trim().toLowerCase()),
    );

    return [
      ...matchingBrands.map((brand) => ({
        value: brand.label,
        label: (
          <span className={styles.option}>
            <CarBrandMark carModel={brand.label} />
            <span>{brand.label}</span>
          </span>
        ),
      })),
      ...models.map((suggestion) => ({
        value: suggestion.car_model,
        label: (
          <span className={styles.option}>
            <CarBrandMark carModel={suggestion.car_model} />
            <span>{suggestion.car_model}</span>
          </span>
        ),
      })),
    ];
  }, [recent, query]);

  return (
    <div className={clsx(styles.field, className)}>
      <CarBrandMark carModel={value} />
      <AutoComplete
        {...rest}
        className={styles.input}
        defaultActiveFirstOption={false}
        disabled={disabled}
        filterOption={false}
        options={options}
        placeholder={placeholder}
        popupMatchSelectWidth
        size={size}
        status={status}
        value={value}
        onChange={(next) => onChange(typeof next === 'string' ? next : '')}
      />
    </div>
  );
}
