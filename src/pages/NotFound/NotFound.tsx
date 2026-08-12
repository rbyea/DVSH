import { Button, Result } from 'antd';
import { Link } from 'react-router-dom';

import styles from './NotFound.module.scss';

export const NotFoundPage = () => {
  return (
    <div className={styles.page}>
      <Result
        status="404"
        title="Страница не найдена"
        subTitle="Такого экрана в Автовидно нет. Вернитесь к списку ремонтов."
        extra={
          <Link to="/dashboard">
            <Button type="primary" size="large">
              К ремонтам
            </Button>
          </Link>
        }
      />
    </div>
  );
};
