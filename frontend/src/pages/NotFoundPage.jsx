import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div style={{ textAlign: 'center', marginTop: 80 }}>
      <h1 style={{ fontSize: 96, margin: 0, color: '#ddd', lineHeight: 1 }}>404</h1>
      <h2 style={{ marginTop: 16 }}>Pagina nu există</h2>
      <p style={{ color: '#666' }}>Adresa pe care ai accesat-o nu a fost găsită.</p>
      <Link to="/" style={{ color: '#0066cc' }}>Înapoi la pagina principală</Link>
    </div>
  );
}
