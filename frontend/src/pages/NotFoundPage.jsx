import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <div style={{ textAlign: 'center', marginTop: 80 }}>
      <h1 style={{ fontSize: 96, margin: 0, color: '#ddd', lineHeight: 1 }}>404</h1>
      <h2 style={{ marginTop: 16 }}>{t('notFound.title')}</h2>
      <p style={{ color: '#666' }}>{t('notFound.message')}</p>
      <Link to="/" style={{ color: '#0066cc' }}>{t('notFound.goHome')}</Link>
    </div>
  );
}
