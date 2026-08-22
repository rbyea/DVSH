import clsx from 'clsx';
import { useLocation, useNavigate } from 'react-router-dom';

import { useAppSelector } from '@/app/store';
import { StationProfileForm } from '@/features/station/update';
import { StationCompletedWorksPanel } from '@/widgets/StationCompletedWorksPanel';
import { StationMastersPanel } from '@/widgets/StationMastersPanel';
import { StationSubscriptionPanel } from '@/widgets/StationSubscriptionPanel';

import styles from './StationProfilePage.module.scss';

type StationSection = 'station' | 'subscription' | 'masters' | 'works';

const SECTION_ITEMS: Array<{ key: StationSection; label: string }> = [
  { key: 'station', label: 'Станция' },
  { key: 'subscription', label: 'Подписка' },
  { key: 'masters', label: 'Мастера' },
  { key: 'works', label: 'Работы' },
];

function isStationSection(value: string): value is StationSection {
  return SECTION_ITEMS.some((item) => item.key === value);
}

export function StationProfilePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const hashSection = location.hash.replace('#', '');
  const activeSection: StationSection = isStationSection(hashSection) ? hashSection : 'station';

  const user = useAppSelector((state) => state.session.user);

  const openSection = (section: StationSection) => {
    navigate({ pathname: '/station', hash: section }, { replace: true });
  };

  const sectionTitle = SECTION_ITEMS.find((item) => item.key === activeSection)?.label ?? 'Станция';

  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <p className={styles.navLabel}>Профиль СТО</p>
        <nav className={styles.nav} aria-label="Разделы профиля">
          {SECTION_ITEMS.map((item) => (
            <button
              className={clsx(
                styles.navButton,
                activeSection === item.key && styles.navButtonActive,
              )}
              key={item.key}
              type="button"
              onClick={() => openSection(item.key)}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      <div className={styles.content}>
        <header className={styles.contentHead}>
          <p className={styles.eyebrow}>Профиль СТО</p>
          <h1 className={styles.pageTitle}>{sectionTitle}</h1>
        </header>

        {activeSection === 'station' ? (
          <>
            <StationProfileForm />
            {user ? (
              <section className={styles.card}>
                <div className={styles.cardHead}>
                  <div>
                    <h2 className={styles.cardTitle}>Аккаунт</h2>
                    <p className={styles.cardHint}>Владелец станции в Автовидно</p>
                  </div>
                </div>
                <p className={styles.accountName}>{user.name}</p>
                <p className={styles.accountEmail}>{user.email}</p>
              </section>
            ) : null}
          </>
        ) : null}

        {activeSection === 'subscription' ? <StationSubscriptionPanel /> : null}

        {activeSection === 'works' ? <StationCompletedWorksPanel /> : null}

        {activeSection === 'masters' ? <StationMastersPanel /> : null}
      </div>
    </div>
  );
}
