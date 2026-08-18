import { AutoComplete, Button, Form, Input } from 'antd';
import { Controller } from 'react-hook-form';

import { masterSpecialtySuggestions } from '@/entities/master';
import { getAntdValidateStatus } from '@/shared/lib/antd';

import { useCreateMasterForm } from '../model/useCreateMasterForm';
import styles from './CreateMasterForm.module.scss';

type CreateMasterFormProps = {
  onCancel: () => void;
  onSuccess?: () => void;
};

const specialtyOptions = masterSpecialtySuggestions.map((value) => ({ value }));

export function CreateMasterForm({ onCancel, onSuccess }: CreateMasterFormProps) {
  const { control, errors, isSubmitting, onSubmit, reset } = useCreateMasterForm(onSuccess);

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
