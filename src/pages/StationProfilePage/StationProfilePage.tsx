import clsx from 'clsx';
import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { useAppSelector } from '@/app/store';
import { isSubscriptionBlocked } from '@/entities/session';
import { ImportClientsPanel } from '@/features/client/import';
import { StationReferralCard } from '@/features/station/referral';
import { StationProfileForm } from '@/features/station/update';
import { BillingPaymentHistory } from '@/widgets/BillingPaymentHistory';
import { StationAccountPanel } from '@/widgets/StationAccountPanel';
import { StationCompletedWorksPanel } from '@/widgets/StationCompletedWorksPanel';
import { StationMastersPanel } from '@/widgets/StationMastersPanel';
import { StationPayoutsPanel } from '@/widgets/StationPayoutsPanel';
import { StationSubscriptionPanel } from '@/widgets/StationSubscriptionPanel';

import styles from './StationProfilePage.module.scss';

type StationSection =
  'station' | 'import' | 'subscription' | 'payments' | 'masters' | 'works' | 'payouts';

const STATION_ITEMS: Array<{ key: StationSection; label: string }> = [
  { key: 'station', label: 'Станция' },
  { key: 'import', label: 'Загрузить клиентов' },
  { key: 'masters', label: 'Мастера' },
  { key: 'works', label: 'Работы' },
  { key: 'payouts', label: 'Выплаты' },
];

const BILLING_ITEMS: Array<{ key: StationSection; label: string }> = [
  { key: 'subscription', label: 'Тарифы' },
  { key: 'payments', label: 'История оплат' },
];

const SECTION_ITEMS = [...STATION_ITEMS, ...BILLING_ITEMS];

const PAYWALL_SECTIONS: StationSection[] = ['subscription', 'payments'];

function isStationSection(value: string): value is StationSection {
  return SECTION_ITEMS.some((item) => item.key === value);
}

export function StationProfilePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAppSelector((state) => state.session.user);
  const paywalled = isSubscriptionBlocked(user);
  const hashSection = location.hash.replace('#', '');
  const requestedSection: StationSection = isStationSection(hashSection) ? hashSection : 'station';
  const activeSection: StationSection =
    paywalled && !PAYWALL_SECTIONS.includes(requestedSection) ? 'subscription' : requestedSection;
  const visibleStation = paywalled ? [] : STATION_ITEMS;
  const visibleBilling = BILLING_ITEMS;
  const search = new URLSearchParams(location.search);
  const returningFromBank = search.has('orderId') || search.get('payment') === 'fail';

  useEffect(() => {
    if (paywalled && !PAYWALL_SECTIONS.includes(requestedSection)) {
      navigate(
        { pathname: '/station', hash: 'subscription', search: location.search },
        { replace: true },
      );
      return;
    }

    if (!returningFromBank || activeSection === 'subscription') {
      return;
    }

    navigate(
      { pathname: '/station', hash: 'subscription', search: location.search },
      { replace: true },
    );
  }, [activeSection, location.search, navigate, paywalled, requestedSection, returningFromBank]);

  const openSection = (section: StationSection) => {
    navigate({ pathname: '/station', hash: section }, { replace: true });
  };

  const sectionTitle = SECTION_ITEMS.find((item) => item.key === activeSection)?.label ?? 'Станция';

  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        {visibleStation.length > 0 ? (
          <>
            <p className={styles.navLabel}>Профиль</p>
            <nav className={styles.nav} aria-label="Профиль">
              {visibleStation.map((item) => (
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
          </>
        ) : null}

        <div className={clsx(styles.navGroup, visibleStation.length > 0 && styles.navGroupSplit)}>
          <p className={styles.navLabel}>Оплата</p>
          <nav className={styles.nav} aria-label="Оплата">
            {visibleBilling.map((item) => (
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
        </div>
      </aside>

      <div className={styles.content}>
        <header className={styles.contentHead}>
          <p className={styles.eyebrow}>Профиль</p>
          <h1 className={styles.pageTitle}>
            {sectionTitle}
            {activeSection === 'import' ? <span className={styles.titleBeta}>бета</span> : null}
          </h1>
        </header>

        {activeSection === 'import' ? <ImportClientsPanel /> : null}

        {activeSection === 'station' ? (
          <>
            <StationProfileForm />
            <StationReferralCard />
            <StationAccountPanel />
          </>
        ) : null}

        {activeSection === 'subscription' ? <StationSubscriptionPanel /> : null}

        {activeSection === 'payments' ? <BillingPaymentHistory /> : null}

        {activeSection === 'works' ? <StationCompletedWorksPanel /> : null}

        {activeSection === 'payouts' ? <StationPayoutsPanel /> : null}

        {activeSection === 'masters' ? <StationMastersPanel /> : null}
      </div>
    </div>
  );
}
