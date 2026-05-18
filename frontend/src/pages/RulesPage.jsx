// Pagină de regulament — rezumatul regulilor platformei. Linkată din footer.
import { useAuth } from '../hooks/useAuth.js';

export default function RulesPage() {
  const { darkMode } = useAuth();
  return (
    <div style={{ maxWidth: 800 }}>
      <h1 style={{ marginTop: 0 }}>📜 Regulamentul platformei</h1>
      <p style={mutedStyle(darkMode)}>
        Notițe e un spațiu colaborativ pentru elevi. Ca să rămână util și
        sigur pentru toți, te rugăm să respecți regulile de mai jos.
        Încălcările pot duce la avertismente, suspendări sau ban permanent.
      </p>

      <Section title="1. Conținut acceptat" darkMode={darkMode}>
        <ul>
          <li>Notițe școlare reale (rezumate, fișe, exerciții, formule, hărți conceptuale).</li>
          <li>Material redactat de tine sau parafrazat — fără copy/paste integral din alte surse.</li>
          <li>Conținut educațional pentru clasele 5–12, în limba română.</li>
        </ul>
      </Section>

      <Section title="2. Conținut interzis" darkMode={darkMode}>
        <ul>
          <li><strong>Plagiat</strong> — copierea integrală a unei notițe sau a unei surse externe fără indicarea autorului.</li>
          <li><strong>Conținut ofensator</strong> — limbaj injurios, hărțuire, discriminare, conținut sexual sau violent.</li>
          <li><strong>Spam</strong> — material irelevant, reclame, link-uri promoționale, conținut duplicat.</li>
          <li><strong>Date personale</strong> ale altor utilizatori (telefon, adresă, etc.).</li>
        </ul>
      </Section>

      <Section title="3. Comportament în comentarii" darkMode={darkMode}>
        <ul>
          <li>Critică constructiv — semnalează greșeli, sugerează corecturi.</li>
          <li>Fără atacuri la persoană. Discuta despre conținut, nu despre autor.</li>
          <li>Profesorii verificați pot marca notițele ca corecte / cu greșeli — folosește feedback-ul lor pentru a învăța.</li>
        </ul>
      </Section>

      <Section title="4. Cont profesor" darkMode={darkMode}>
        <ul>
          <li>Verificarea ca profesor se obține prin cod de invitație (de la administrator), prin upload de document oficial, sau automat pentru emailuri instituționale (.edu, .gov.ro etc.).</li>
          <li>Profesorii pot evalua și edita notițele altora pentru a corecta greșeli, dar nu le pot șterge.</li>
          <li>Falsificarea identității ca profesor duce la ban permanent.</li>
        </ul>
      </Section>

      <Section title="5. Raportări și apeluri" darkMode={darkMode}>
        <ul>
          <li>Orice utilizator poate raporta o notiță care încalcă regulamentul.</li>
          <li>Raportările sunt verificate întâi de un sistem AI, apoi de un administrator.</li>
          <li>Dacă o notiță îți este ascunsă sau contul îți este banat, poți depune un <strong>apel</strong> care va fi revăzut de head admin.</li>
        </ul>
      </Section>

      <Section title="6. Consecințe la încălcare" darkMode={darkMode}>
        <ul>
          <li><strong>Avertisment</strong> — primă încălcare minoră.</li>
          <li><strong>Suspendare</strong> temporară (ore) — încălcări repetate sau moderate.</li>
          <li><strong>Ban permanent</strong> — încălcări grave (conținut ilegal, hărțuire, fraudă cu cont profesor). Contul banat este șters automat după N zile dacă nu există apel deschis.</li>
        </ul>
      </Section>

      <p style={{ ...mutedStyle(darkMode), marginTop: 32 }}>
        Regulamentul se poate modifica. Verifică această pagină periodic.
      </p>
    </div>
  );
}

function Section({ title, darkMode, children }) {
  return (
    <section style={{
      padding: 20,
      marginBottom: 16,
      borderRadius: 12,
      border: darkMode ? '1px solid rgba(120, 60, 200, 0.25)' : '1px solid rgba(244, 114, 182, 0.3)',
      background: darkMode ? 'rgba(20, 8, 50, 0.5)' : 'rgba(255, 255, 255, 0.7)',
    }}>
      <h2 style={{ marginTop: 0, marginBottom: 12, fontSize: 18 }}>{title}</h2>
      <div style={{ fontSize: 14, lineHeight: 1.6 }}>{children}</div>
    </section>
  );
}

const mutedStyle = (darkMode) => ({
  color: darkMode ? '#a89bc4' : '#666',
  fontSize: 14,
  marginBottom: 20,
});
