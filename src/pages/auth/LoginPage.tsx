import { Button, Card, Form, Input, Typography } from 'antd';

import styles from './LoginPage.module.scss';

type LoginFormValues = {
  email: string;
  password: string;
};

const { Link, Text, Title } = Typography;

export function LoginPage() {
  return (
    <main className={styles.page}>
      <Card className={styles.card}>
        <div className={styles.header}>
          <Title className={styles.title} level={4}>
            Войдите в свою учетную запись
          </Title>
          <Text type="secondary">
            Введите свой адрес электронной почты ниже, чтобы войти в свою учетную запись
          </Text>
        </div>

        <Form<LoginFormValues> layout="vertical" requiredMark={false}>
          <Form.Item<LoginFormValues>
            label="Адрес электронной почты"
            name="email"
            rules={[{ required: true, message: 'Введите свой адрес электронной почты' }]}
          >
            <Input placeholder="m@example.com" type="email" />
          </Form.Item>

          <Form.Item<LoginFormValues>
            label="Пароль"
            name="password"
            rules={[{ required: true, message: 'Введите свой пароль' }]}
          >
            <Input.Password />
          </Form.Item>

          <Form.Item>
            <Button block htmlType="submit" type="primary">
              Войти
            </Button>
          </Form.Item>
        </Form>

        <div className={styles.footer}>
          <Text type="secondary">
            Нет учетной записи? <Link>Зарегистрироваться</Link>
          </Text>
        </div>
      </Card>
    </main>
  );
}
