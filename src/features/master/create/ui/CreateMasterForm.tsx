import { AutoComplete, Button, DatePicker, Form, Input } from 'antd';
import dayjs from 'dayjs';
import { Controller } from 'react-hook-form';

import { masterSpecialtySuggestions, type Master } from '@/entities/master';
import { getAntdValidateStatus } from '@/shared/lib/antd';
import { formatRuPhoneInput } from '@/shared/lib/phone';

import { useCreateMasterForm } from '../model/useCreateMasterForm';
import styles from './CreateMasterForm.module.scss';

type CreateMasterFormProps = {
  master?: Master;
  onCancel: () => void;
  onSuccess?: () => void;
};

const specialtyOptions = masterSpecialtySuggestions.map((value) => ({ value }));

export function CreateMasterForm({ master, onCancel, onSuccess }: CreateMasterFormProps) {
  const { control, errors, isSubmitting, onSubmit, reset } = useCreateMasterForm(onSuccess, master);

  return (
    <Form
      className={styles.form}
      layout="vertical"
      requiredMark={false}
      onFinish={() => {
        void onSubmit();
      }}
    >
      <Form.Item
        help={errors.fullName?.message}
        label="ФИО"
        validateStatus={getAntdValidateStatus(Boolean(errors.fullName))}
      >
        <Controller
          control={control}
          name="fullName"
          render={({ field }) => (
            <Input {...field} placeholder="Иванов Иван Иванович" size="large" />
          )}
        />
      </Form.Item>
      <Form.Item
        help={errors.specialty?.message}
        label="Профессия"
        validateStatus={getAntdValidateStatus(Boolean(errors.specialty))}
      >
        <Controller
          control={control}
          name="specialty"
          render={({ field }) => (
            <AutoComplete
              {...field}
              options={specialtyOptions}
              placeholder="Механик, электрик…"
              size="large"
              onChange={(value) => field.onChange(value)}
            />
          )}
        />
      </Form.Item>
      <div className={styles.row}>
        <Form.Item
          className={styles.rowItem}
          help={errors.birthday?.message}
          label="День рождения"
          validateStatus={getAntdValidateStatus(Boolean(errors.birthday))}
        >
          <Controller
            control={control}
            name="birthday"
            render={({ field }) => (
              <DatePicker
                allowClear
                className={styles.fullWidth}
                disabledDate={(current) => Boolean(current && current.isAfter(dayjs(), 'day'))}
                format="DD.MM.YYYY"
                placeholder="Не указан"
                size="large"
                value={field.value ? dayjs(field.value, 'YYYY-MM-DD') : null}
                onChange={(value) => field.onChange(value ? value.format('YYYY-MM-DD') : '')}
              />
            )}
          />
        </Form.Item>
        <Form.Item
          className={styles.rowItem}
          help={errors.phone?.message}
          label="Телефон"
          validateStatus={getAntdValidateStatus(Boolean(errors.phone))}
        >
          <Controller
            control={control}
            name="phone"
            render={({ field }) => (
              <Input
                {...field}
                inputMode="tel"
                placeholder="+7 999 123-45-67"
                size="large"
                value={field.value}
                onChange={(event) => field.onChange(formatRuPhoneInput(event.target.value))}
              />
            )}
          />
        </Form.Item>
      </div>
      <div className={styles.actions}>
        <Button
          disabled={isSubmitting}
          onClick={() => {
            reset();
            onCancel();
          }}
        >
          Отмена
        </Button>
        <Button htmlType="submit" loading={isSubmitting} type="primary">
          Сохранить
        </Button>
      </div>
    </Form>
  );
}
