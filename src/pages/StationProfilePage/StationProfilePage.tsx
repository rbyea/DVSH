import { Button, Form, Input, Spin } from 'antd';
import { useEffect, useState } from 'react';
import { Bounce, toast } from 'react-toastify';

import { useAppSelector } from '@/app/store';
import {
  DEFAULT_MASTER_SHARE_PERCENT,
  getStationMasterSharePercent,
  useGetStationQuery,
  useUpdateStationMutation,
} from '@/entities/master';
import { CreateMasterForm } from '@/features/master/create';
import { getErrorMessage } from '@/shared/lib/api';
import { AppInfo } from '@/widgets/AppInfo';
import { StationCompletedWorksPanel } from '@/widgets/StationCompletedWorksPanel';
import { StationMastersPanel } from '@/widgets/StationMastersPanel';

import styles from './StationProfilePage.module.scss';

export function StationProfilePage() {
  const user = useAppSelector((state) => state.session.user);
  const [isAdding, setIsAdding] = useState(false);
  const [stationName, setStationName] = useState('');
  const [isEditingStation, setIsEditingStation] = useState(false);

  const { data: station, isLoading: isStationLoading } = useGetStationQuery();
  const [updateStation, { isLoading: isSavingStation }] = useUpdateStationMutation();
  const masterSharePercent = getStationMasterSharePercent(station);

  useEffect(() => {
    if (station?.name) {
      setStationName(station.name);
    }
  }, [station?.name]);

  const handleSaveStation = async () => {
    const name = stationName.trim();

    if (!name) {
      toast.warning('Введите название СТО', {
        position: 'top-right',
        transition: Bounce,
      });
      return;
    }

    try {
      await updateStation({
        name,
        master_share_percent: station?.master_share_percent ?? DEFAULT_MASTER_SHARE_PERCENT,
      }).unwrap();
      setIsEditingStation(false);
      toast.success('Название СТО сохранено', {
        position: 'top-right',
        transition: Bounce,
      });
    } catch (error) {
      toast.error(getErrorMessage(error, 'Не удалось сохранить название СТО'), {
        position: 'top-right',
        transition: Bounce,
      });
    }
  };

  return (
    <div className={styles.page}>
      <AppInfo
        eyebrow="Станция"
        subtitle="Профиль СТО, мастера и сводка выполненных работ."
        title="Профиль СТО"
      />

      <section className={styles.card}>
        <div className={styles.cardHead}>
          <div>
            <h2 className={styles.cardTitle}>Станция</h2>
            <p className={styles.cardHint}>Название вашей сервисной станции</p>
          </div>
          {!isEditingStation ? (
            <Button
              size="small"
              type="link"
              onClick={() => {
                setStationName(station?.name ?? '');
                setIsEditingStation(true);
              }}
            >
              Изменить
            </Button>
          ) : null}
        </div>

        {isStationLoading ? (
          <div className={styles.loading}>
            <Spin />
          </div>
        ) : isEditingStation ? (
          <Form className={styles.stationForm} layout="vertical" requiredMark={false}>
            <Form.Item label="Название СТО">
              <Input
                size="large"
                value={stationName}
                onChange={(event) => setStationName(event.target.value)}
              />
            </Form.Item>
            <div className={styles.stationActions}>
              <Button
                disabled={isSavingStation}
                onClick={() => {
                  setStationName(station?.name ?? '');
                  setIsEditingStation(false);
                }}
              >
                Отмена
              </Button>
              <Button
                loading={isSavingStation}
                type="primary"
                onClick={() => void handleSaveStation()}
              >
                Сохранить
              </Button>
            </div>
          </Form>
        ) : (
          <p className={styles.stationName}>{station?.name || 'Название пока не задано'}</p>
        )}

        {user ? (
          <div className={styles.meBlock}>
            <span className={styles.meLabel}>Вы вошли как</span>
            <span className={styles.meValue}>
              {user.name} · {user.email}
            </span>
            <span className={styles.meShare}>
              Доля мастерам сейчас: {masterSharePercent}% (настраивается в блоке работ ниже)
            </span>
          </div>
        ) : null}
      </section>

      <StationCompletedWorksPanel />

      <StationMastersPanel
        footer={
          <div className={styles.mastersFooter}>
            {!isAdding ? (
              <Button type="primary" onClick={() => setIsAdding(true)}>
                Добавить мастера
              </Button>
            ) : (
              <div className={styles.addFormWrap}>
                <h3 className={styles.addFormTitle}>Новый мастер</h3>
                <CreateMasterForm
                  onCancel={() => setIsAdding(false)}
                  onSuccess={() => setIsAdding(false)}
                />
              </div>
            )}
          </div>
        }
      />
    </div>
  );
}
