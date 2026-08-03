import { Button } from 'antd';
import { useNavigate } from 'react-router-dom';

import styles from './LegalDocumentPage.module.scss';

type LegalSection = {
  heading: string;
  paragraphs: readonly string[];
};

type LegalDocumentPageProps = {
  title: string;
  updatedAt: string;
  sections: readonly LegalSection[];
};

export function LegalDocumentPage({ title, updatedAt, sections }: LegalDocumentPageProps) {
  const navigate = useNavigate();

  return (
    <main className={styles.page}>
      <article className={styles.doc}>
        <div className={styles.toolbar}>
          <Button
            size="large"
            onClick={() => {
              if (window.history.length > 1) {
                navigate(-1);
                return;
              }

              navigate('/login');
            }}
          >
            Назад
          </Button>
        </div>

        <p className={styles.eyebrow}>DVSH · Правовые документы</p>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.meta}>Редакция от {updatedAt}</p>
        <p className={styles.banner}>
          Текст-заглушка для юриста. Перед продакшеном заменить на утверждённую редакцию.
        </p>

        {sections.map((section) => (
          <section className={styles.section} key={section.heading}>
            <h2 className={styles.sectionTitle}>{section.heading}</h2>
            {section.paragraphs.map((paragraph) => (
              <p className={styles.paragraph} key={paragraph}>
                {paragraph}
              </p>
            ))}
          </section>
        ))}
      </article>
    </main>
  );
}
