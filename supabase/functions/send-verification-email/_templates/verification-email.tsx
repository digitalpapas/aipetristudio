import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
  Section,
  Button,
  Hr,
  Img,
} from 'npm:@react-email/components@0.0.22';
import * as React from 'npm:react@18.3.1';

interface VerificationEmailProps {
  userName: string;
  confirmationUrl: string;
  userEmail: string;
}

export const VerificationEmail = ({
  userName,
  confirmationUrl,
  userEmail,
}: VerificationEmailProps) => (
  <Html>
    <Head />
    <Preview>Подтвердите ваш email в AIPetri Studio</Preview>
    <Body style={main}>
      <Container style={container}>
        {/* Шапка с логотипом */}
        <Section style={header}>
          <Heading style={logoHeading}>
            <span style={logoGradient}>AIPetri Studio</span>
          </Heading>
        </Section>

        {/* Приветствие */}
        <Section style={section}>
          <Heading style={h1}>Здравствуйте, {userName}!</Heading>
          <Text style={welcomeText}>
            Добро пожаловать в AIPetri Studio
          </Text>
        </Section>

        {/* Основной блок */}
        <Section style={section}>
          <Text style={text}>
            Осталось подтвердить email, чтобы получить доступ к платформе
          </Text>
          
          <Button style={button} href={confirmationUrl}>
            Подтвердить email
          </Button>
          
          <Text style={linkText}>
            Или скопируйте и вставьте эту ссылку в браузер:
          </Text>
          <Link href={confirmationUrl} style={link}>
            {confirmationUrl}
          </Link>
        </Section>

        <Hr style={hr} />

        {/* Краткое описание платформы */}
        <Section style={section}>
          <Text style={descriptionTitle}>
            AIPetri Studio - это экосистема AI-инструментов для бизнеса:
          </Text>
          <ul style={featuresList}>
            <li style={featureItem}>• Исследование аудитории</li>
            <li style={featureItem}>• Анализ клиентских интервью</li>
            <li style={featureItem}>• Генерация контента</li>
            <li style={featureItem}>• И многое другое...</li>
          </ul>
        </Section>

        <Hr style={hr} />

        {/* Футер */}
        <Section style={footer}>
          <Text style={footerText}>
            Если у вас есть вопросы, напишите нам на{' '}
            <Link href="mailto:support@aipetri.studio" style={footerLink}>
              support@aipetri.studio
            </Link>
          </Text>
          <Text style={footerText}>
            <Link href="#" style={footerLink}>
              Отписаться от рассылки
            </Link>
          </Text>
          <Text style={copyrightText}>
            © 2024 AIPetri Studio. Все права защищены.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
);

export default VerificationEmail;

// Стили
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  maxWidth: '600px',
};

const header = {
  padding: '32px 24px 0',
  textAlign: 'center' as const,
};

const logoHeading = {
  margin: '0 0 32px',
  textAlign: 'center' as const,
};

const logoGradient = {
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  backgroundClip: 'text',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  fontSize: '32px',
  fontWeight: 'bold',
  letterSpacing: '-0.5px',
};

const section = {
  padding: '0 24px',
};

const h1 = {
  color: '#1a1a1a',
  fontSize: '28px',
  fontWeight: 'bold',
  margin: '40px 0 20px',
  textAlign: 'center' as const,
};

const welcomeText = {
  color: '#667eea',
  fontSize: '18px',
  fontWeight: '600',
  margin: '0 0 32px',
  textAlign: 'center' as const,
};

const text = {
  color: '#4a5568',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '16px 0',
  textAlign: 'center' as const,
};

const button = {
  backgroundColor: '#667eea',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  padding: '16px 32px',
  margin: '32px auto',
  maxWidth: '240px',
};

const linkText = {
  color: '#718096',
  fontSize: '14px',
  margin: '32px 0 8px',
  textAlign: 'center' as const,
};

const link = {
  color: '#667eea',
  fontSize: '14px',
  textDecoration: 'underline',
  wordBreak: 'break-all' as const,
  display: 'block',
  textAlign: 'center' as const,
  margin: '0 0 32px',
};

const hr = {
  borderColor: '#e2e8f0',
  margin: '32px 0',
};

const descriptionTitle = {
  color: '#2d3748',
  fontSize: '16px',
  fontWeight: '600',
  margin: '0 0 16px',
  textAlign: 'center' as const,
};

const featuresList = {
  color: '#4a5568',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '0 0 32px',
  padding: '0',
  listStyle: 'none',
  textAlign: 'center' as const,
};

const featureItem = {
  margin: '8px 0',
};

const footer = {
  padding: '0 24px',
};

const footerText = {
  color: '#718096',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '16px 0',
  textAlign: 'center' as const,
};

const footerLink = {
  color: '#667eea',
  textDecoration: 'underline',
};

const copyrightText = {
  color: '#a0aec0',
  fontSize: '12px',
  margin: '32px 0 0',
  textAlign: 'center' as const,
};