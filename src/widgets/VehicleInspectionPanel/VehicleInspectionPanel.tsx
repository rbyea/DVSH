import { Button, Checkbox, Input, Modal, Select, Tag } from 'antd';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bounce, toast } from 'react-toastify';

import {
  buildInspectionWorkTitle,
  inspectionActionLabels,
  inspectionStatusLabels,
  inspectionUrgencyLabels,
  useCreateVehicleInspectionItemMutation,
  useDeleteVehicleInspectionItemMutation,
  useGetVehicleInspectionsQuery,
  type InspectionAction,
  type InspectionUrgency,
  type VehicleInspectionItem,
} from '@/entities/vehicle';
import { getErrorMessage } from '@/shared/lib/api';

import styles from './VehicleInspectionPanel.module.scss';

type VehicleInspectionPanelProps = {
  vehicleId: string;
  /** Без внешней «карточки» — для встраивания в карточку клиента */
  embedded?: boolean;
};

type DraftForm = {
  title: string;
  action: InspectionAction;
  urgency: InspectionUrgency;
  note: string;
};

const emptyDraft: DraftForm = {
  title: '',
  action: 'replace',
  urgency: 'now',
  note: '',
};

const actionOptions = (Object.keys(inspectionActionLabels) as InspectionAction[]).map((value) => ({
  value,
  label: inspectionActionLabels[value],
}));

const urgencyOptions = (Object.keys(inspectionUrgencyLabels) as InspectionUrgency[]).map(
  (value) => ({
    value,
    label: inspectionUrgencyLabels[value],
  }),
);

function urgencyColor(urgency: InspectionUrgency): string {
  if (urgency === 'now') {
    return 'error';
  }

  if (urgency === 'recommended') {
    return 'warning';
  }

  return 'default';
}

export function VehicleInspectionPanel({
  vehicleId,
  embedded = false,
}: VehicleInspectionPanelProps) {
  const navigate = useNavigate();
  const { data: items = [], isLoading } = useGetVehicleInspectionsQuery(vehicleId);
  const [createItem, { isLoading: isCreating }] = useCreateVehicleInspectionItemMutation();
  const [deleteItem] = useDeleteVehicleInspectionItemMutation();

  const [draft, setDraft] = useState<DraftForm>(emptyDraft);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const openItems = useMemo(() => items.filter((item) => item.status === 'open'), [items]);
  const otherItems = useMemo(() => items.filter((item) => item.status !== 'open'), [items]);

  const toggleSelected = (id: string, checked: boolean) => {
    setSelectedIds((prev) => (checked ? [...prev, id] : prev.filter((itemId) => itemId !== id)));
  };

  const handleCreate = async () => {
    const title = draft.title.trim();

    if (!title) {
      toast.warning('Укажите, что необходимо сделать', {
        position: 'top-right',
        transition: Bounce,
      });
      return;
    }

    try {
      await createItem({
        vehicleId,
        body: {
          title,
          action: draft.action,
          urgency: draft.urgency,
          note: draft.note.trim() || null,
        },
      }).unwrap();
      setDraft(emptyDraft);
      setIsFormOpen(false);
      toast.success('Пункт добавлен в дефектовку', {
        position: 'top-right',
        transition: Bounce,
      });
    } catch (error) {
      toast.error(getErrorMessage(error, 'Не удалось сохранить пункт'), {
        position: 'top-right',
        transition: Bounce,
      });
    }
  };

  const handleDelete = (item: VehicleInspectionItem) => {
    Modal.confirm({
      title: 'Удалить пункт дефектовки?',
      content: buildInspectionWorkTitle(item),
      okText: 'Удалить',
      okType: 'danger',
      cancelText: 'Отмена',
      onOk: async () => {
        try {
          await deleteItem({ vehicleId, itemId: item.id }).unwrap();
          setSelectedIds((prev) => prev.filter((id) => id !== item.id));
        } catch (error) {
          toast.error(getErrorMessage(error, 'Не удалось удалить'), {
            position: 'top-right',
            transition: Bounce,
          });
          throw error;
        }
      },
    });
  };

  const handleCreateRepair = async () => {
    const selected = openItems.filter((item) => selectedIds.includes(item.id));

    if (selected.length === 0) {
      toast.warning('Отметьте пункты, которые перенести в заказ-наряд', {
        position: 'top-right',
        transition: Bounce,
      });
      return;
    }

    navigate(`/repairs/new?vehicleId=${vehicleId}`, {
      state: {
        fromVehicleId: vehicleId,
        inspectionWorkTitles: selected.map((item) => buildInspectionWorkTitle(item)),
        inspectionItemIds: selected.map((item) => item.id),
      },
    });
  };

  const renderItem = (item: VehicleInspectionItem, selectable: boolean) => {
    const checked = selectedIds.includes(item.id);

    return (
      <li className={styles.item} key={item.id}>
        <div className={styles.itemTop}>
          {selectable ? (
            <Checkbox
              checked={checked}
              onChange={(event) => toggleSelected(item.id, event.target.checked)}
            />
          ) : (
            <span className={styles.itemSpacer} />
          )}
          <div className={styles.itemMain}>
            <p className={styles.itemTitle}>{buildInspectionWorkTitle(item)}</p>
            {item.note ? <p className={styles.itemNote}>{item.note}</p> : null}
            <div className={styles.tags}>
              <Tag color={urgencyColor(item.urgency)}>{inspectionUrgencyLabels[item.urgency]}</Tag>
              <Tag>{inspectionActionLabels[item.action]}</Tag>
              {item.status !== 'open' ? (
                <Tag color={item.status === 'done' ? 'success' : 'processing'}>
                  {inspectionStatusLabels[item.status]}
                </Tag>
              ) : null}
            </div>
          </div>
          <div className={styles.itemActions}>
            <Button danger size="small" type="text" onClick={() => handleDelete(item)}>
              Удалить
            </Button>
          </div>
        </div>
      </li>
    );
  };

  return (
    <section
      className={[styles.root, embedded ? styles.rootEmbedded : null].filter(Boolean).join(' ')}
    >
      <div className={styles.header}>
        <div>
          <h2 className={embedded ? styles.titleEmbedded : styles.title}>Технический осмотр</h2>
          <p className={styles.hint}>
            Список того, что нужно сделать. Можно собрать заказ-наряд из отмеченных пунктов.
          </p>
        </div>
        <div className={styles.headerActions}>
          {openItems.length > 0 ? (
            <Button
              disabled={selectedIds.length === 0}
              type="primary"
              onClick={() => void handleCreateRepair()}
            >
              В заказ-наряд
              {selectedIds.length > 0 ? ` · ${selectedIds.length}` : ''}
            </Button>
          ) : null}
          <Button type="default" onClick={() => setIsFormOpen((open) => !open)}>
            {isFormOpen ? 'Скрыть форму' : 'Добавить пункт'}
          </Button>
        </div>
      </div>

      {isFormOpen ? (
        <div className={styles.form}>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Что сделать *</span>
            <Input
              placeholder="Например: передние тормозные колодки"
              size="large"
              value={draft.title}
              onChange={(event) => setDraft((prev) => ({ ...prev, title: event.target.value }))}
              onPressEnter={() => void handleCreate()}
            />
          </label>
          <div className={styles.formRow}>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Действие</span>
              <Select
                options={actionOptions}
                size="large"
                value={draft.action}
                onChange={(value) => setDraft((prev) => ({ ...prev, action: value }))}
              />
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Срочность</span>
              <Select
                options={urgencyOptions}
                size="large"
                value={draft.urgency}
                onChange={(value) => setDraft((prev) => ({ ...prev, urgency: value }))}
              />
            </label>
          </div>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Комментарий</span>
            <Input.TextArea
              placeholder="Необязательно"
              rows={2}
              value={draft.note}
              onChange={(event) => setDraft((prev) => ({ ...prev, note: event.target.value }))}
            />
          </label>
          <div className={styles.formActions}>
            <Button onClick={() => setIsFormOpen(false)}>Отмена</Button>
            <Button loading={isCreating} type="primary" onClick={() => void handleCreate()}>
              Сохранить пункт
            </Button>
          </div>
        </div>
      ) : null}

      {isLoading ? (
        <p className={styles.empty}>Загрузка…</p>
      ) : items.length === 0 ? (
        <p className={styles.empty}>
          Пока пусто. Добавьте, что нужно заменить, отремонтировать или проверить.
        </p>
      ) : (
        <>
          {openItems.length > 0 ? (
            <ul className={styles.list}>{openItems.map((item) => renderItem(item, true))}</ul>
          ) : (
            <p className={styles.empty}>Открытых пунктов нет.</p>
          )}
          {otherItems.length > 0 ? (
            <>
              <h3 className={styles.subTitle}>В работе / сделано</h3>
              <ul className={styles.list}>{otherItems.map((item) => renderItem(item, false))}</ul>
            </>
          ) : null}
        </>
      )}
    </section>
  );
}
