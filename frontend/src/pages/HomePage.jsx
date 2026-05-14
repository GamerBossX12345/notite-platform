import { useEffect, useState, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../hooks/useAuth.js';
import Leaderboard from '../components/Leaderboard.jsx';
import { NoteCard } from '../components/NoteCard.jsx';
import { useFlipAnimation } from '../hooks/useFlipAnimation.js';
import { useRecentNotes } from '../hooks/useRecentNotes.js';

const SUBJECTS = [
  'Matematică', 'Fizică', 'Chimie', 'Biologie', 'Informatică',
  'Istorie', 'Geografie', 'Română', 'Engleză', 'Franceză',
  'Filosofie', 'Economie', 'Psihologie',
];

const NOTE_TYPES = [
  { value: 'REZUMAT', label: 'Rezumat' },
  { value: 'EXERCITII', label: 'Exerciții' },
  { value: 'FISA', label: 'Fișă' },
  { value: 'HARTA_CONCEPTUALA', label: 'Hartă conceptuală' },
  { value: 'FORMULE', label: 'Formule' },
];

const GRADE_LEVELS = Array.from({ length: 8 }, (_, i) => i + 5);

export default function HomePage() {
  const { user, dismissWarning, sidebarOpen, setSidebarOpen, darkMode } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchInput, setSearchInput] = useState(searchParams.get('q') || '');
  const [result, setResult] = useState({ notes: [], total: 0, totalPages: 1 });
  const [recentNotes, setRecentNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [semanticMode, setSemanticMode] = useState(false);
  const [semanticResults, setSemanticResults] = useState([]);
  const [semanticLoading, setSemanticLoading] = useState(false);
  const [semanticError, setSemanticError] = useState(null);

  const defaultsApplied = useRef(false);
  const { recent: recentlyViewed, clear: clearRecent, remove: removeRecent } = useRecentNotes();

  useEffect(() => {
    api.get('/notes', { params: { sort: 'recent', pageSize: 3 } })
      .then(res => setRecentNotes(res.data.notes))
      .catch(() => {});
  }, []);

  // Clasa implicită: preferința salvată din Setări; dacă lipsește, cade pe clasa
  // de la înregistrare. Materia implicită: doar dacă a fost setată în Setări.
  const defaultSubject = user?.defaultSubject || null;
  const defaultGrade   = user?.defaultGradeLevel ?? user?.grade ?? null;

  // Aplică filtre implicite din setările userului prima dată când ajungi pe homepage fără query.
  useEffect(() => {
    if (defaultsApplied.current || !user) return;
    if (Array.from(searchParams.keys()).length > 0) {
      defaultsApplied.current = true;
      return;
    }
    const next = new URLSearchParams();
    if (defaultSubject) next.set('subject', defaultSubject);
    if (defaultGrade)   next.set('gradeLevel', String(defaultGrade));
    if (next.toString()) setSearchParams(next, { replace: true });
    defaultsApplied.current = true;
  }, [user, defaultSubject, defaultGrade]);

  const subject    = searchParams.get('subject') || '';
  const gradeLevel = searchParams.get('gradeLevel') || '';
  const type       = searchParams.get('type') || '';
  const school     = searchParams.get('school') || '';
  const sort       = searchParams.get('sort') || 'recent';
  const page       = Number(searchParams.get('page') || 1);

  function setParam(key, value) {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (value) next.set(key, value); else next.delete(key);
      next.delete('page');
      return next;
    }, { replace: true });
  }

  function setPage(p) {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('page', String(p));
      return next;
    }, { replace: true });
  }

  // Reset = înapoi la default-urile userului (NU la gol). Userul își păstrează
  // preferințele setate din pagina Setări; pentru "Toate" trebuie să selecteze
  // explicit din dropdown.
  function clearFilters() {
    const next = new URLSearchParams();
    if (searchInput)    next.set('q', searchInput);
    if (defaultSubject) next.set('subject', defaultSubject);
    if (defaultGrade)   next.set('gradeLevel', String(defaultGrade));
    setSearchParams(next, { replace: true });
  }

  useEffect(() => {
    if (semanticMode) return;
    const timer = setTimeout(() => {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        if (searchInput) next.set('q', searchInput); else next.delete('q');
        next.delete('page');
        return next;
      }, { replace: true });
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput, semanticMode]);

  useEffect(() => {
    if (!semanticMode || !searchInput.trim()) {
      setSemanticResults([]);
      return;
    }
    setSemanticLoading(true);
    setSemanticError(null);
    const timer = setTimeout(() => {
      api.get('/notes/search/semantic', { params: { q: searchInput.trim() } })
        .then(res => setSemanticResults(res.data))
        .catch(err => setSemanticError(err.message))
        .finally(() => setSemanticLoading(false));
    }, 500);
    return () => clearTimeout(timer);
  }, [searchInput, semanticMode]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    api.get('/notes', { params: Object.fromEntries(searchParams) })
      .then(res => setResult(res.data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [searchParams.toString()]);

  const isSuspended = user?.suspendedUntil && new Date(user.suspendedUntil) > new Date();
  const suspendedRemaining = isSuspended
    ? Math.ceil((new Date(user.suspendedUntil) - new Date()) / (1000 * 60 * 60))
    : 0;

  // "Neutru" = default-ul userului SAU "Toate" (gol). Niciunul nu contează ca
  // filtru activ — deci nici "Toate materiile" nu aprinde butonul de resetare.
  const subjectIsNeutral = subject === '' || subject === (defaultSubject || '');
  const gradeIsNeutral   = gradeLevel === '' || gradeLevel === (defaultGrade != null ? String(defaultGrade) : '');
  const tagParam = searchParams.get('tag') || '';
  const hasActiveFilters = !subjectIsNeutral || !gradeIsNeutral || type || school || tagParam || sort !== 'recent';

  // Toggle-uri rapide pentru "clasa mea" / "școala mea".
  const myClassActive  = user?.grade && gradeLevel === String(user.grade);
  const mySchoolActive = user?.school && school === user.school;
  function toggleMyClass()  {
    setParam('gradeLevel', myClassActive ? '' : String(user.grade));
  }
  function toggleMySchool() {
    setParam('school', mySchoolActive ? '' : user.school);
  }
  const allNotesGridRef = useFlipAnimation([searchParams.toString(), result.notes]);

  return (
    <>
      {/* Sidebar slide-in cu filtre */}
      {sidebarOpen && (
        <>
          <div onClick={() => setSidebarOpen(false)} style={sidebarOverlayStyle} />
          <aside style={sidebarStyle(darkMode)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <h3 style={{ margin: 0, fontSize: 16 }}>Filtre</h3>
              <button onClick={() => setSidebarOpen(false)} style={sidebarCloseBtnStyle}>✕</button>
            </div>

            <SidebarField label="Materie">
              <select value={subject} onChange={e => setParam('subject', e.target.value)} style={sidebarSelectStyle(darkMode)}>
                <option value="">Toate materiile</option>
                {defaultSubject && (
                  <option value={defaultSubject}>Default ({defaultSubject})</option>
                )}
                {SUBJECTS.filter(s => s !== defaultSubject).map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </SidebarField>

            <SidebarField label="Clasă">
              <select value={gradeLevel} onChange={e => setParam('gradeLevel', e.target.value)} style={sidebarSelectStyle(darkMode)}>
                <option value="">Toate clasele</option>
                {defaultGrade != null && (
                  <option value={String(defaultGrade)}>Default (a {defaultGrade}-a)</option>
                )}
                {GRADE_LEVELS.filter(g => g !== defaultGrade).map(g => (
                  <option key={g} value={g}>Clasa a {g}-a</option>
                ))}
              </select>
            </SidebarField>

            <SidebarField label="Tip notiță">
              <select value={type} onChange={e => setParam('type', e.target.value)} style={sidebarSelectStyle(darkMode)}>
                <option value="">Toate tipurile</option>
                {NOTE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </SidebarField>

            <SidebarField label="Tag">
              <TagFilter
                value={searchParams.get('tag') || ''}
                onChange={v => setParam('tag', v)}
                darkMode={darkMode}
              />
            </SidebarField>

            <SidebarField label="Sortare">
              <select value={sort} onChange={e => setParam('sort', e.target.value)} style={sidebarSelectStyle(darkMode)}>
                <option value="recent">Cele mai recente</option>
                <option value="popular">Cele mai populare</option>
                <option value="rating">Cel mai bine votate</option>
              </select>
            </SidebarField>

            {hasActiveFilters && (
              <button onClick={clearFilters} style={sidebarClearBtnStyle}>
                Resetează filtrele
              </button>
            )}
          </aside>
        </>
      )}

      {/* Leaderboard fixat în colțul din dreapta sus */}
      <Leaderboard />

      {/* Conținut principal centrat */}
      <div style={{ maxWidth: 880, margin: '0 auto' }}>
        {/* Banner avertisment */}
        {user?.warning && (
          <div style={{ background: '#fff3cd', border: '1px solid #ffc107', borderRadius: 8, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <span style={{ fontSize: 20 }}>⚠️</span>
            <div style={{ flex: 1 }}>
              <strong style={{ color: '#856404' }}>Avertisment de la administrație</strong>
              <p style={{ margin: '4px 0 0', color: '#856404', fontSize: 14 }}>{user.warning}</p>
            </div>
            <button onClick={dismissWarning} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#856404', lineHeight: 1 }}>✕</button>
          </div>
        )}

        {/* Banner timeout */}
        {isSuspended && (
          <div style={{ background: '#f8d7da', border: '1px solid #f5c6cb', borderRadius: 8, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 20 }}>🚫</span>
            <div>
              <strong style={{ color: '#721c24' }}>Contul tău este suspendat temporar</strong>
              <p style={{ margin: '4px 0 0', color: '#721c24', fontSize: 14 }}>
                Mai ai aproximativ <strong>{suspendedRemaining} {suspendedRemaining === 1 ? 'oră' : 'ore'}</strong> de suspendare.
              </p>
            </div>
          </div>
        )}

        {/* Bara de căutare */}
        <div style={searchBarStyle}>
          <input
            type="search"
            placeholder={semanticMode ? 'Caută semantic (ex: "legi ale termodinamicii")...' : 'Caută notițe...'}
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            style={{ ...selectStyle(darkMode), flex: 1, minWidth: 160 }}
          />
          <button
            onClick={() => { setSemanticMode(m => !m); setSemanticResults([]); setSemanticError(null); }}
            title={semanticMode ? 'Treci la căutare clasică' : 'Treci la căutare semantică cu AI'}
            style={{
              ...selectStyle(darkMode), cursor: 'pointer',
              background: semanticMode ? 'rgba(120, 40, 200, 0.15)' : 'transparent',
              border: semanticMode ? '1px solid rgba(168, 85, 247, 0.6)' : (darkMode ? '1px solid rgba(168, 85, 247, 0.45)' : '1px solid #ccc'),
              color: semanticMode ? '#a855f7' : (darkMode ? '#c9a8ff' : '#666'),
              whiteSpace: 'nowrap', fontWeight: semanticMode ? 600 : 400,
            }}
          >
            ✦ Semantic{semanticMode ? ' ON' : ''}
          </button>
        </div>

        {/* Toggle-uri rapide: clasa mea / școala mea. Apar doar dacă userul are
            datele setate în profil. */}
        {user && (user.grade || user.school) && !semanticMode && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            {user.grade && (
              <button
                onClick={toggleMyClass}
                style={chipStyle(darkMode, myClassActive)}
                title={myClassActive ? 'Dezactivează filtrul' : 'Doar notițe din clasa a ' + user.grade + '-a'}
              >
                🎓 Clasa mea (a {user.grade}-a)
                {myClassActive && ' ✓'}
              </button>
            )}
            {user.school && (
              <button
                onClick={toggleMySchool}
                style={chipStyle(darkMode, mySchoolActive)}
                title={mySchoolActive ? 'Dezactivează filtrul' : 'Doar notițe de la ' + user.school}
              >
                🏫 Școala mea
                {mySchoolActive && ' ✓'}
              </button>
            )}
          </div>
        )}

        {/* Mod semantic */}
        {semanticMode && (
          <>
            {semanticLoading && <p style={{ color: '#888' }}>Se caută semantic...</p>}
            {semanticError && <p style={{ color: 'red' }}>Eroare: {semanticError}</p>}
            {!semanticLoading && !semanticError && searchInput.trim() && (
              <>
                <p style={{ color: '#888', fontSize: 14, marginBottom: 12 }}>
                  {semanticResults.length} rezultate semantice
                </p>
                {semanticResults.length === 0 ? (
                  <p style={{ color: '#888' }}>Niciun rezultat. Încearcă o altă formulare.</p>
                ) : (
                  <div style={gridStyle}>
                    {semanticResults.map(note => (
                      <NoteCard key={note.id} note={note} similarity={note.similarity} />
                    ))}
                  </div>
                )}
              </>
            )}
            {!searchInput.trim() && (
              <p style={{ color: '#888', fontSize: 14 }}>
                Scrie o propoziție sau idee pentru a căuta semantic. Ex: "legile lui Newton", "fotosinteza la plante".
              </p>
            )}
          </>
        )}

        {/* Mod clasic */}
        {!semanticMode && (
          <>
            {/* Continuă unde ai rămas — istoric vizite (client-side, localStorage) */}
            {recentlyViewed.length > 0 && !searchInput && !hasActiveFilters && (
              <section style={{ marginBottom: 32 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <h2 style={{ ...sectionTitleStyle, margin: 0 }}>📖 Continuă unde ai rămas</h2>
                  <button
                    onClick={clearRecent}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: darkMode ? '#a89bc4' : '#888',
                      fontSize: 12,
                      cursor: 'pointer',
                      textDecoration: 'underline',
                    }}
                    title="Șterge istoricul"
                  >
                    Șterge istoricul
                  </button>
                </div>
                <div style={recentListStyle(darkMode)}>
                  {recentlyViewed.map(item => (
                    <div key={item.id} style={recentItemStyle(darkMode)}>
                      <Link to={`/notes/${item.id}`} style={recentLinkStyle(darkMode)}>
                        <span style={{ fontSize: 14, fontWeight: 600 }}>{item.title}</span>
                        <span style={{ fontSize: 12, color: darkMode ? '#a89bc4' : '#888' }}>
                          {item.subject} • a {item.gradeLevel}-a
                        </span>
                      </Link>
                      <button
                        onClick={() => removeRecent(item.id)}
                        title="Elimină din istoric"
                        style={recentRemoveBtnStyle(darkMode)}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Notițe recente — top 3 */}
            {recentNotes.length > 0 && !searchInput && !hasActiveFilters && (
              <section style={{ marginBottom: 32 }}>
                <h2 style={sectionTitleStyle}>Notițe recente</h2>
                <div style={gridStyle}>
                  {recentNotes.map(note => <NoteCard key={note.id} note={note} />)}
                </div>
              </section>
            )}

            {/* Toate notițele — paginate */}
            <section>
              <h2 style={sectionTitleStyle}>
                {searchInput || hasActiveFilters ? 'Rezultate' : 'Toate notițele'}
              </h2>

              {/* Bară orizontală cu filtre active — chip-uri removable */}
              {hasActiveFilters && (
                <div style={activeFiltersBarStyle(darkMode)}>
                  {subject && !subjectIsNeutral && (
                    <ActiveChip label={`Materie: ${subject}`} onRemove={() => setParam('subject', defaultSubject || '')} darkMode={darkMode} />
                  )}
                  {gradeLevel && !gradeIsNeutral && (
                    <ActiveChip label={`Clasa a ${gradeLevel}-a`} onRemove={() => setParam('gradeLevel', defaultGrade != null ? String(defaultGrade) : '')} darkMode={darkMode} />
                  )}
                  {type && (
                    <ActiveChip label={`Tip: ${NOTE_TYPES.find(t => t.value === type)?.label || type}`} onRemove={() => setParam('type', '')} darkMode={darkMode} />
                  )}
                  {school && (
                    <ActiveChip label={`Școala: ${school}`} onRemove={() => setParam('school', '')} darkMode={darkMode} />
                  )}
                  {tagParam && (
                    <ActiveChip label={`#${tagParam}`} onRemove={() => setParam('tag', '')} darkMode={darkMode} />
                  )}
                  {sort !== 'recent' && (
                    <ActiveChip label={`Sortare: ${sort === 'popular' ? 'populare' : 'rating'}`} onRemove={() => setParam('sort', 'recent')} darkMode={darkMode} />
                  )}
                  <button onClick={clearFilters} style={resetAllBtnStyle(darkMode)}>
                    Resetează tot
                  </button>
                </div>
              )}

              {loading && <p>Se încarcă...</p>}
              {error && <p style={{ color: 'red' }}>Eroare: {error}</p>}

              {!loading && !error && (
                <>
                  <p style={{ color: '#888', fontSize: 13, marginBottom: 12 }}>
                    {result.total} {result.total === 1 ? 'notiță' : 'notițe'}
                  </p>

                  {result.notes.length === 0 ? (
                    <p>Nicio notiță găsită. Fii primul!</p>
                  ) : (
                    <div ref={allNotesGridRef} style={gridStyle}>
                      {result.notes.map(note => <NoteCard key={note.id} note={note} />)}
                    </div>
                  )}

                  {result.totalPages > 1 && (
                    <div style={paginationStyle}>
                      <button onClick={() => setPage(page - 1)} disabled={page <= 1} style={pageButtonStyle}>
                        ‹ Anterior
                      </button>
                      <span style={{ padding: '6px 12px', color: '#888', fontSize: 14 }}>
                        Pagina {page} din {result.totalPages}
                      </span>
                      <button onClick={() => setPage(page + 1)} disabled={page >= result.totalPages} style={pageButtonStyle}>
                        Următor ›
                      </button>
                    </div>
                  )}
                </>
              )}
            </section>
          </>
        )}
      </div>
    </>
  );
}

// ── Componente reutilizabile ─────────────────────────────────────────────────
function ActiveChip({ label, onRemove, darkMode }) {
  return (
    <span style={activeChipStyle(darkMode)}>
      {label}
      <button onClick={onRemove} style={{
        background: 'transparent', border: 'none', cursor: 'pointer',
        color: 'inherit', fontSize: 16, lineHeight: 1, padding: 0, marginLeft: 4,
      }} aria-label="Elimină filtrul">×</button>
    </span>
  );
}

function TagFilter({ value, onChange, darkMode }) {
  const [tags, setTags] = useState([]);
  useEffect(() => {
    api.get('/notes/tags', { params: { limit: 30 } })
      .then(res => setTags(res.data))
      .catch(() => {});
  }, []);
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{
        width: '100%', padding: '8px 10px', borderRadius: 6,
        border: darkMode ? '1px solid rgba(168, 85, 247, 0.45)' : '1px solid rgba(244, 114, 182, 0.4)',
        background: darkMode ? '#1a0b2e' : '#fff',
        color: darkMode ? '#e8e0ff' : '#333',
        fontSize: 14,
      }}
    >
      <option value="">Toate tag-urile</option>
      {tags.map(t => (
        <option key={t.id} value={t.name}>
          {t.isOfficial ? '★ ' : ''}#{t.name}{t.noteCount > 0 ? ` (${t.noteCount})` : ''}
        </option>
      ))}
    </select>
  );
}

function SidebarField({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, opacity: 0.7, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</label>
      {children}
    </div>
  );
}

// ── Stiluri ──────────────────────────────────────────────────────────────────
const searchBarStyle = { display: 'flex', gap: 8, marginBottom: 24 };
const selectStyle = (darkMode) => ({
  padding: '8px 12px',
  borderRadius: 6,
  fontSize: 14,
  background: darkMode ? 'transparent' : 'white',
  border: darkMode ? '1px solid rgba(168, 85, 247, 0.45)' : '1px solid #ccc',
  color: darkMode ? '#e8e0ff' : '#333',
  transition: 'background 0.4s ease, border-color 0.4s ease, color 0.4s ease',
});
const sectionTitleStyle = { margin: '0 0 14px', fontSize: 22 };
const gridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
  gap: 14,
};
const paginationStyle = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  gap: 8, marginTop: 24,
};

const activeFiltersBarStyle = (darkMode) => ({
  display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6,
  marginBottom: 14, padding: '8px 10px',
  border: darkMode ? '1px solid rgba(120, 60, 200, 0.2)' : '1px solid rgba(244, 114, 182, 0.25)',
  borderRadius: 8,
  background: darkMode ? 'rgba(20, 8, 50, 0.4)' : 'rgba(255, 255, 255, 0.5)',
});

const activeChipStyle = (darkMode) => ({
  display: 'inline-flex', alignItems: 'center',
  padding: '4px 10px',
  borderRadius: 999,
  fontSize: 12,
  background: darkMode ? 'rgba(168, 85, 247, 0.18)' : 'rgba(244, 114, 182, 0.15)',
  color: darkMode ? '#e8d4ff' : '#9333ea',
  border: darkMode ? '1px solid rgba(168, 85, 247, 0.4)' : '1px solid rgba(244, 114, 182, 0.4)',
});

const resetAllBtnStyle = (darkMode) => ({
  marginLeft: 'auto',
  background: 'transparent',
  border: 'none',
  cursor: 'pointer',
  color: darkMode ? '#a89bc4' : '#666',
  fontSize: 12,
  textDecoration: 'underline',
  padding: '4px 6px',
});

const chipStyle = (darkMode, active) => ({
  padding: '6px 14px',
  borderRadius: 999,
  fontSize: 13,
  fontWeight: 500,
  cursor: 'pointer',
  border: active
    ? '1px solid rgba(168, 85, 247, 0.8)'
    : (darkMode ? '1px solid rgba(168, 85, 247, 0.35)' : '1px solid rgba(244, 114, 182, 0.4)'),
  background: active
    ? (darkMode ? 'rgba(168, 85, 247, 0.25)' : 'rgba(244, 114, 182, 0.18)')
    : (darkMode ? 'transparent' : 'rgba(255, 255, 255, 0.7)'),
  color: active
    ? (darkMode ? '#e8d4ff' : '#9333ea')
    : (darkMode ? '#c9a8ff' : '#6b21a8'),
  transition: 'background 0.2s ease, border-color 0.2s ease, color 0.2s ease',
});

const recentListStyle = (darkMode) => ({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
  gap: 8,
});
const recentItemStyle = (darkMode) => ({
  display: 'flex', alignItems: 'center', gap: 8,
  padding: '8px 10px',
  borderRadius: 8,
  border: darkMode ? '1px solid rgba(120, 60, 200, 0.18)' : '1px solid rgba(244, 114, 182, 0.25)',
  background: darkMode ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.6)',
  transition: 'background 0.4s ease, border-color 0.4s ease',
});
const recentLinkStyle = (darkMode) => ({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  textDecoration: 'none',
  color: darkMode ? '#e8e0ff' : '#1a1a1a',
  overflow: 'hidden',
  whiteSpace: 'nowrap',
  textOverflow: 'ellipsis',
});
const recentRemoveBtnStyle = (darkMode) => ({
  background: 'transparent',
  border: 'none',
  color: darkMode ? '#867aa3' : '#aaa',
  cursor: 'pointer',
  fontSize: 14,
  padding: '0 4px',
  lineHeight: 1,
});
const pageButtonStyle = {
  padding: '6px 14px', border: '1px solid #ccc', borderRadius: 4,
  background: 'transparent', cursor: 'pointer',
};

// Sidebar slide-in
const sidebarOverlayStyle = {
  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
  background: 'rgba(0, 0, 0, 0.4)', zIndex: 200,
};
const sidebarStyle = (darkMode) => ({
  position: 'fixed', top: 0, right: 0, bottom: 0, width: 280,
  background: darkMode ? 'rgba(20, 8, 50, 0.97)' : 'rgba(255, 255, 255, 0.97)',
  backdropFilter: 'blur(14px)',
  borderLeft: '1px solid rgba(120, 60, 200, 0.3)',
  padding: 20, zIndex: 201, overflowY: 'auto',
  boxShadow: '-4px 0 24px rgba(0, 0, 0, 0.25)',
});
const sidebarSelectStyle = (darkMode) => ({
  width: '100%', padding: '8px 10px', borderRadius: 6,
  border: darkMode ? '1px solid rgba(168, 85, 247, 0.45)' : '1px solid rgba(244, 114, 182, 0.4)',
  background: darkMode ? '#1a0b2e' : '#fff',
  color: darkMode ? '#e8e0ff' : '#333',
  fontSize: 14,
  transition: 'background 0.4s ease, border-color 0.4s ease, color 0.4s ease',
});
const sidebarCloseBtnStyle = {
  background: 'none', border: 'none', cursor: 'pointer',
  fontSize: 18, color: 'inherit', padding: 4, opacity: 0.7,
};
const sidebarClearBtnStyle = {
  marginTop: 12, width: '100%', padding: '8px 12px',
  background: 'rgba(120, 40, 200, 0.2)', border: '1px solid rgba(168, 85, 247, 0.4)',
  color: 'inherit', borderRadius: 6, cursor: 'pointer', fontSize: 13,
};

