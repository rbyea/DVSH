import { Button, Form, Input } from 'antd';
import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Bounce, toast } from 'react-toastify';

import { useUpdateClientMutation, type Client } from '@/entities/client';
import { repairsApi } from '@/entities/repair-order';
import { getErrorMessage } from '@/shared/lib/api';
import { formatRuPhoneInput, isValidRuPhone } from '@/shared/lib/phone';

import styles from './RepairClientPanel.module.scss';

type RepairClientPanelProps = {
  repairId: string;
  client: Client;
  updatedAt: string;
  formatDateTime: (value: string) => string;
  readOnly?: boolean;
};

type ClientFormState = {
  name: string;
  phone: string;
  email: string;
};

function toFormState(client: Client): ClientFormState {
  return {
    name: client.name,
    phone: client.phone ? formatRuPhoneInput(client.phone) : '',
    email: client.email ?? '',
  };
}

export function RepairClientPanel({
  repairId,
  client,
  updatedAt,
  formatDateTime,
  readOnly = false,
}: RepairClientPanelProps) {
  const dispatch = useDispatch();
  const [isEditing, setIsEditing] = useState(false);
  const [formState, setFormState] = useState<ClientFormState>(() => toFormState(client));
  const [updateClient, { isLoading }] = useUpdateClientMutation();

  useEffect(() => {
    if (!isEditing) {
      setFormState(toFormState(client));
    }
  }, [client, isEditing]);

  const handleCancel = () => {
    setFormState(toFormState(client));
    setIsEditing(false);
  };

  const handleSave = async () => {
    const name = formState.name.trim();

    if (!name) {
      toast.warning('Введите имя клиента', {
        position: 'top-right',
        transition: Bounce,
      });
      return;
    }

    if (!isValidRuPhone(formState.phone)) {
      toast.warning('Введите телефон в формате +7 999 123-45-67', {
        position: 'top-right',
        transition: Bounce,
      });
      return;
    }

    if (formState.email.trim() && !/^\S+@\S+\.\S+$/.test(formState.email.trim())) {
      toast.warning('Введите корректную почту', {
        position: 'top-right',
        transition: Bounce,
      });
      return;
    }

    try {
      await updateClient({
        id: client.id,
        body: {
          name,
          phone: formState.phone.trim() || null,
          email: formState.email.trim() || null,
        },
      }).unwrap();

      dispatch(repairsApi.util.invalidateTags([{ type: 'Repair', id: repairId }]));
      setIsEditing(false);
      toast.success('Клиент обновлён', {
        position: 'top-right',
        transition: Bounce,
      });
    } catch (error) {
      toast.error(getErrorMessage(error, 'Не удалось обновить клиента'), {
        position: 'top-right',
        transition: Bounce,
      });
    }
  };

  return (
    <article className={styles.panel}>
      <div className={styles.header}>
        <h2 className={styles.title}>Клиент</h2>
        {readOnly ? null : isEditing ? (
          <div className={styles.actions}>
            <Button disabled={isLoading} size="small" onClick={handleCancel}>
              Отмена
            </Button>
            <Button
              loading={isLoading}
              size="small"
              type="primary"
              onClick={() => void handleSave()}
            >
              Сохранить
            </Button>
          </div>
        ) : (
          <Button size="small" type="link" onClick={() => setIsEditing(true)}>
            Редактировать
          </Button>
        )}
      </div>

      {isEditing && !readOnly ? (
        <Form className={styles.form} layout="vertical" requiredMark={false}>
          <Form.Item label="Имя">
            <Input
              size="large"
              value={formState.name}
              onChange={(event) => {
                setFormState((prev) => ({ ...prev, name: event.target.value }));
              }}
            />
          </Form.Item>
          <Form.Item label="Телефон">
            <Input
              inputMode="tel"
              placeholder="+7 999 123-45-67"
              size="large"
              value={formState.phone}
              onChange={(event) => {
                setFormState((prev) => ({
                  ...prev,
                  phone: formatRuPhoneInput(event.target.value),
                }));
              }}
            />
          </Form.Item>
          <Form.Item label="Почта">
            <Input
              placeholder="client@example.com"
              size="large"
              value={formState.email}
              onChange={(event) => {
                setFormState((prev) => ({ ...prev, email: event.target.value }));
              }}
            />
          </Form.Item>
        </Form>
      ) : (
        <>
          <p className={styles.personName}>{client.name}</p>
          <div className={styles.contactList}>
            <div className={styles.contactRow}>
              <span className={styles.contactLabel}>Телефон</span>
              <span className={styles.contactValue}>{client.phone || 'Не указан'}</span>
            </div>
            <div className={styles.contactRow}>
              <span className={styles.contactLabel}>Email</span>
              <span className={styles.contactValue}>{client.email || 'Не указан'}</span>
            </div>
            <div className={styles.contactRow}>
              <span className={styles.contactLabel}>Обновлён</span>
              <span className={styles.contactValue}>{formatDateTime(updatedAt)}</span>
            </div>
          </div>
        </>
      )}
    </article>
  );
}
