import { Button, Form, Input, InputNumber, Spin } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Bounce, toast } from 'react-toastify';

import {
  buildCreateVehicleRequest,
  mergeVehicleLists,
  useCreateVehicleForClientMutation,
  useGetClientQuery,
  type ClientVehicleSummary,
} from '@/entities/client';
import { getErrorMessage } from '@/shared/lib/api';
import {
  formatChassisNumberInput,
  formatMileageKm,
  formatRuLicensePlateInput,
  formatRuLicensePlateMaskedInput,
  formatVinInput,
  isValidChassisNumber,
  isValidRuLicensePlate,
  isValidVin,
} from '@/shared/lib/vehicle';

import styles from './ClientVehiclesPanel.module.scss';

type VehicleFormState = {
  carModel: string;
  licensePlate: string;
  vin: string;
  chassisNumber: string;
  mileage?: number;
};

type VehicleFieldErrors = Partial<Record<keyof VehicleFormState, string>>;

const emptyVehicleForm = (): VehicleFormState => ({
  carModel: '',
  licensePlate: '',
  vin: '',
  chassisNumber: '',
  mileage: undefined,
});

function validateVehicleForm(
  form: VehicleFormState,
  useChassisNumber: boolean,
): VehicleFieldErrors {
  const errors: VehicleFieldErrors = {};

  if (!form.carModel.trim()) {
    errors.carModel = 'Введите модель машины';
  }

  if (!isValidRuLicensePlate(form.licensePlate)) {
    errors.licensePlate = 'Введите гос номер в формате А123ВС 777';
  }

  if (useChassisNumber) {
    if (!isValidChassisNumber(form.chassisNumber)) {
      errors.chassisNumber = 'Номер шасси: 5–25 символов (латиница, цифры)';
    }
  } else if (!isValidVin(form.vin)) {
    errors.vin = 'VIN должен содержать 17 символов (без I, O, Q)';
  }

  if (typeof form.mileage !== 'number') {
    errors.mileage = 'Укажите пробег автомобиля';
  }

  return errors;
}

export type ClientVehiclesPanelProps = {
  clientId: string;
  clientName?: string;
  /** Vehicle linked to the current repair / create selection */
  currentVehicleId?: string;
  /** Vehicle whose history is currently shown (details page) */
  selectedVehicleId?: string;
  /** Always show these (current repair vehicle) even if GET /clients has not returned the list yet */
  knownVehicles?: ClientVehicleSummary[];
  readOnly?: boolean;
  currentBadge?: string;
  onSelectVehicle?: (vehicle: ClientVehicleSummary) => void | Promise<void>;
  onVehicleCreated?: (vehicle: ClientVehicleSummary) => void | Promise<void>;
  className?: string;
  bordered?: boolean;
  embedded?: boolean;
  title?: string;
  hint?: string;
  footer?: ReactNode;
  /** Show «Новый заказ» link next to non-current vehicles */
  showNewOrderLink?: boolean;
};

function vehicleIdLabel(item: ClientVehicleSummary) {
  if (item.vin?.trim()) {
    return `VIN ${item.vin}`;
  }

  if (item.chassis_number?.trim()) {
    return `Шасси ${item.chassis_number}`;
  }

  return 'Без VIN/шасси';
}

function formatVehiclesCount(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;

  if (mod10 === 1 && mod100 !== 11) {
    return `${count} автомобиль`;
  }

  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return `${count} автомобиля`;
  }

  return `${count} автомобилей`;
}

export function ClientVehiclesPanel({
  clientId,
  clientName,
  currentVehicleId,
  selectedVehicleId,
  knownVehicles = [],
  readOnly = false,
  currentBadge,
  onSelectVehicle,
  onVehicleCreated,
  className,
  bordered = false,
  embedded = false,
  title = 'Автомобили клиента',
  hint,
  footer,
  showNewOrderLink = false,
}: ClientVehiclesPanelProps) {
  const [isAddingVehicle, setIsAddingVehicle] = useState(false);
  const [selectingVehicleId, setSelectingVehicleId] = useState<string | null>(null);
  const [useChassisNumber, setUseChassisNumber] = useState(false);
  const [vehicleForm, setVehicleForm] = useState<VehicleFormState>(emptyVehicleForm);
  const [fieldErrors, setFieldErrors] = useState<VehicleFieldErrors>({});
  const [addedVehicles, setAddedVehicles] = useState<ClientVehicleSummary[]>([]);
  const [createVehicle, { isLoading: isCreatingVehicle }] = useCreateVehicleForClientMutation();
  const resolvedClientId = String(clientId);
  const { data: clientCard } = useGetClientQuery(resolvedClientId, { skip: !resolvedClientId });

  const vehicles = mergeVehicleLists(knownVehicles, addedVehicles, clientCard?.vehicles);
  const vehiclesCount = vehicles.length;
  const canSelectByClick = typeof onSelectVehicle === 'function';
  const activeSelectedId = selectedVehicleId ?? currentVehicleId;
  const resolvedHint =
    hint ?? (canSelectByClick ? 'Нажмите на авто, чтобы выбрать и посмотреть ремонты' : undefined);

  const handleCancelAddVehicle = () => {
    setVehicleForm(emptyVehicleForm());
    setFieldErrors({});
    setUseChassisNumber(false);
    setIsAddingVehicle(false);
  };

  const handleAddVehicle = async () => {
    const carModel = vehicleForm.carModel.trim();
    const licensePlate = formatRuLicensePlateInput(vehicleForm.licensePlate);
    const vin = formatVinInput(vehicleForm.vin);
    const chassisNumber = formatChassisNumberInput(vehicleForm.chassisNumber);

    const errors = validateVehicleForm(vehicleForm, useChassisNumber);

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    const mileage: number = vehicleForm.mileage as number;

    const payload = buildCreateVehicleRequest({
      clientId: resolvedClientId,
      clientName: clientName?.trim() || clientCard?.name,
      clientPhone: clientCard?.phone,
      clientEmail: clientCard?.email,
      carModel,
      licensePlate,
      vin,
      chassisNumber,
      useChassisNumber,
      mileage,
    });

    try {
      const created = await createVehicle(payload).unwrap();

      if (!created.id) {
        toast.error(
          'Сервер не сохранил автомобиль. Проверьте, что POST /vehicles принимает client_id.',
          {
            position: 'top-right',
            transition: Bounce,
          },
        );
        return;
      }

      handleCancelAddVehicle();
      toast.success('Автомобиль добавлен клиенту', {
        position: 'top-right',
        transition: Bounce,
      });

      const summary: ClientVehicleSummary = {
        id: String(created.id),
        car_model: created.car_model || carModel,
        license_plate: created.license_plate || licensePlate,
        vin: created.vin,
        chassis_number: created.chassis_number,
        mileage: created.mileage ?? vehicleForm.mileage,
      };

      if (summary.id) {
        setAddedVehicles((prev) => mergeVehicleLists(prev, [summary]));
      }

      await onVehicleCreated?.(summary);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Не удалось добавить автомобиль'), {
        position: 'top-right',
        transition: Bounce,
      });
    }
  };

  return (
    <section
      className={[
        styles.panel,
        bordered ? styles.panelBordered : null,
        embedded ? styles.panelEmbedded : null,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className={styles.head}>
        <div>
          <div className={styles.titleRow}>
            <h3 className={embedded ? styles.titleEmbedded : styles.title}>{title}</h3>
            {vehiclesCount > 0 || clientCard ? (
              <span className={styles.countBadge}>{formatVehiclesCount(vehiclesCount)}</span>
            ) : null}
          </div>
          {resolvedHint ? (
            <p className={embedded ? styles.hintEmbedded : styles.hint}>{resolvedHint}</p>
          ) : null}
        </div>
        {!readOnly && !isAddingVehicle ? (
          <Button size="middle" type="primary" onClick={() => setIsAddingVehicle(true)}>
            Добавить авто
          </Button>
        ) : null}
      </div>

      {vehiclesCount > 0 ? (
        <ul className={styles.list}>
          {vehicles.map((item) => {
            const isCurrentRepair = String(item.id) === String(currentVehicleId);
            const isSelected = String(item.id) === String(activeSelectedId);
            const itemClassName = [
              canSelectByClick ? styles.itemButton : isSelected ? styles.itemCurrent : styles.item,
              isSelected ? styles.itemSelected : null,
              isCurrentRepair && !isSelected ? styles.itemCurrentSoft : null,
            ]
              .filter(Boolean)
              .join(' ');

            return (
              <li className={styles.listItem} key={item.id}>
                {canSelectByClick ? (
                  <button
                    className={itemClassName}
                    disabled={selectingVehicleId != null}
                    type="button"
                    onClick={() => {
                      const result = onSelectVehicle?.(item);

                      if (result instanceof Promise) {
                        setSelectingVehicleId(String(item.id));
                        void result.finally(() => setSelectingVehicleId(null));
                      }
                    }}
                  >
                    <span className={styles.main}>
                      <span className={styles.model}>{item.car_model}</span>
                      <span className={styles.meta}>
                        {item.license_plate} · {vehicleIdLabel(item)}
                        {typeof item.mileage === 'number'
                          ? ` · ${formatMileageKm(item.mileage)}`
                          : ''}
                      </span>
                    </span>
                    {selectingVehicleId === String(item.id) ? (
                      <span className={styles.selecting}>
                        <Spin size="small" />
                        <span className={styles.selectingLabel}>Загрузка…</span>
                      </span>
                    ) : null}
                    {isCurrentRepair && currentBadge && selectingVehicleId !== String(item.id) ? (
                      <span className={styles.badge}>{currentBadge}</span>
                    ) : null}
                  </button>
                ) : (
                  <div className={itemClassName}>
                    <span className={styles.main}>
                      <span className={styles.model}>{item.car_model}</span>
                      <span className={styles.meta}>
                        {item.license_plate} · {vehicleIdLabel(item)}
                        {typeof item.mileage === 'number'
                          ? ` · ${formatMileageKm(item.mileage)}`
                          : ''}
                      </span>
                    </span>
                    <span className={styles.itemAside}>
                      {isCurrentRepair && currentBadge ? (
                        <span className={styles.badge}>{currentBadge}</span>
                      ) : null}
                      {showNewOrderLink ? (
                        <Link to={`/repairs/new?vehicleId=${item.id}`}>
                          <Button className={styles.newOrderButton} size="small">
                            <PlusOutlined />
                            Новый заказ
                          </Button>
                        </Link>
                      ) : null}
                    </span>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className={styles.empty}>
          {clientCard
            ? 'У клиента пока нет авто в списке — можно добавить'
            : 'Загрузка автомобилей…'}
        </p>
      )}

      {isAddingVehicle && !readOnly ? (
        <Form className={styles.form} component={false} layout="vertical" requiredMark={false}>
          <div className={styles.formRow}>
            <Form.Item
              className={styles.formItem}
              label="Модель"
              required
              validateStatus={fieldErrors.carModel ? 'error' : undefined}
              help={fieldErrors.carModel}
            >
              <Input
                placeholder="Toyota Camry"
                value={vehicleForm.carModel}
                onChange={(event) => {
                  setVehicleForm((prev) => ({ ...prev, carModel: event.target.value }));
                  setFieldErrors((prev) => ({ ...prev, carModel: undefined }));
                }}
              />
            </Form.Item>
            <Form.Item
              className={styles.formItem}
              label="Гос номер"
              required
              validateStatus={fieldErrors.licensePlate ? 'error' : undefined}
              help={fieldErrors.licensePlate}
            >
              <Input
                placeholder="А123ВС 777"
                value={vehicleForm.licensePlate}
                onChange={(event) => {
                  setVehicleForm((prev) => ({
                    ...prev,
                    licensePlate: formatRuLicensePlateMaskedInput(event.target.value),
                  }));
                  setFieldErrors((prev) => ({ ...prev, licensePlate: undefined }));
                }}
              />
            </Form.Item>
          </div>
          <div className={styles.formRow}>
            {!useChassisNumber ? (
              <Form.Item
                className={styles.formItem}
                label="VIN"
                required
                validateStatus={fieldErrors.vin ? 'error' : undefined}
                help={fieldErrors.vin}
              >
                <Input
                  maxLength={17}
                  placeholder="17 символов"
                  value={vehicleForm.vin}
                  onChange={(event) => {
                    setVehicleForm((prev) => ({
                      ...prev,
                      vin: formatVinInput(event.target.value),
                    }));
                    setFieldErrors((prev) => ({ ...prev, vin: undefined }));
                  }}
                />
              </Form.Item>
            ) : (
              <Form.Item
                className={styles.formItem}
                label="Номер шасси"
                required
                validateStatus={fieldErrors.chassisNumber ? 'error' : undefined}
                help={fieldErrors.chassisNumber}
              >
                <Input
                  placeholder="Номер шасси"
                  value={vehicleForm.chassisNumber}
                  onChange={(event) => {
                    setVehicleForm((prev) => ({
                      ...prev,
                      chassisNumber: formatChassisNumberInput(event.target.value),
                    }));
                    setFieldErrors((prev) => ({ ...prev, chassisNumber: undefined }));
                  }}
                />
              </Form.Item>
            )}
            <Form.Item
              className={styles.formItem}
              label="Пробег автомобиля"
              required
              validateStatus={fieldErrors.mileage ? 'error' : undefined}
              help={fieldErrors.mileage}
            >
              <InputNumber
                className={styles.mileageInput}
                min={0}
                placeholder="85000"
                value={vehicleForm.mileage}
                onChange={(value) => {
                  setVehicleForm((prev) => ({
                    ...prev,
                    mileage: typeof value === 'number' ? value : undefined,
                  }));
                  setFieldErrors((prev) => ({ ...prev, mileage: undefined }));
                }}
              />
            </Form.Item>
          </div>
          <Button
            size="small"
            type="link"
            onClick={() => {
              setUseChassisNumber((value) => !value);
              setVehicleForm((prev) => ({ ...prev, vin: '', chassisNumber: '' }));
              setFieldErrors((prev) => ({ ...prev, vin: undefined, chassisNumber: undefined }));
            }}
          >
            {useChassisNumber ? 'Указать VIN' : 'Нет VIN? Номер шасси'}
          </Button>
          <div className={styles.actions}>
            <Button disabled={isCreatingVehicle} onClick={handleCancelAddVehicle}>
              Отмена
            </Button>
            <Button
              loading={isCreatingVehicle}
              type="primary"
              onClick={() => void handleAddVehicle()}
            >
              Сохранить авто
            </Button>
          </div>
        </Form>
      ) : null}

      {footer}
    </section>
  );
}
