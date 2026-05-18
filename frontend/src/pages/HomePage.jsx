import { useEffect, useState, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client.js';
import { useAuth } from '../hooks/useAuth.js';
import Leaderboard from '../components/Leaderboard.jsx';
import { NoteCard } from '../components/NoteCard.jsx';
import { useFlipAnimation } from '../hooks/useFlipAnimation.js';

const SUBJECTS = [
  'Matematică', 'Fizică', 'Chimie', 'Biologie', 'Informatică',
  'Istorie', 'Geografie', 'Română', 'Engleză', 'Franceză',
  'Filosofie', 'Economie', 'Psihologie',
];

const GRADE_LEVELS = Array.from({ length: 8 }, (_, i) => i + 5);

export default function HomePage() {
  const { user, dismissWarning, sidebarOpen, setSidebarOpen, darkMode } = useAuth();
  const { t } = useTranslation();
  const NOTE_TYPES = [
    { value: 'REZUMAT',           label: t('upload.noteTypeRezumat')   },
    { value: 'EXERCITII',         label: t('upload.noteTypeExercitii') },
    { value: 'FISA',              label: t('upload.noteTypeFisa')      },
    { value: 'HARTA_CONCEPTUALA', label: t('upload.noteTypeHarta')     },
    { value: 'FORMULE',           label: t('upload.noteTypeFormule')   },
  ];
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
          <aside className="responsive-filter-sidebar" style={sidebarStyle(darkMode)} role="dialog" aria-modal="true" aria-label={t('home.filtersTitle')}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <h3 style={{ margin: 0, fontSize: 16 }}>{t('home.filtersTitle')}</h3>
              <button onClick={() => setSidebarOpen(false)} style={sidebarCloseBtnStyle} aria-label={t('common.close')}>✕</button>
            </div>

            <SidebarField label={t('common.subject')}>
              <select value={subject} onChange={e => setParam('subject', e.target.value)} style={sidebarSelectStyle(darkMode)}>
                <option value="">{t('home.allSubjects')}</option>
                {defaultSubject && (
                  <option value={defaultSubject}>★ {defaultSubject}</option>
                )}
                {SUBJECTS.filter(s => s !== defaultSubject).map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </SidebarField>

            <SidebarField label={t('common.grade')}>
              <select value={gradeLevel} onChange={e => setParam('gradeLevel', e.target.value)} style={sidebarSelectStyle(darkMode)}>
                <option value="">{t('home.allGrades')}</option>
                {defaultGrade != null && (
                  <option value={String(defaultGrade)}>★ {defaultGrade}</option>
                )}
                {GRADE_LEVELS.filter(g => g !== defaultGrade).map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </SidebarField>

            <SidebarField label={t('common.type')}>
              <select value={type} onChange={e => setParam('type', e.target.value)} style={sidebarSelectStyle(darkMode)}>
                <option value="">{t('home.allTypes')}</option>
                {NOTE_TYPES.map(nt => <option key={nt.value} value={nt.value}>{nt.label}</option>)}
              </select>
            </SidebarField>

            <SidebarField label={t('home.tagFilter')}>
              <TagFilter
                value={searchParams.get('tag') || ''}
                onChange={v => setParam('tag', v)}
                darkMode={darkMode}
                t={t}
              />
            </SidebarField>

            <SidebarField label={t('home.sortBy')}>
              <select value={sort} onChange={e => setParam('sort', e.target.value)} style={sidebarSelectStyle(darkMode)}>
                <option value="recent">{t('home.sortNewest')}</option>
                <option value="popular">{t('home.sortPopular')}</option>
                <option value="rating">{t('home.sortBest')}</option>
              </select>
            </SidebarField>

            {hasActiveFilters && (
              <button onClick={clearFilters} style={sidebarClearBtnStyle}>
                {t('home.resetFilters')}
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
              <p style={{ margin: '4px 0 0', color: '#856404', fontSize: 14 }}>{user.warning}</p>
            </div>
            <button onClick={dismissWarning} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#856404', lineHeight: 1 }} aria-label={t('common.close')}>✕</button>
          </div>
        )}

        {/* Banner timeout */}
        {isSuspended && (
          <div style={{ background: '#f8d7da', border: '1px solid #f5c6cb', borderRadius: 8, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 20 }}>🚫</span>
            <div>
              <strong style={{ color: '#721c24' }}>{t('admin.suspend')}</strong>
              <p style={{ margin: '4px 0 0', color: '#721c24', fontSize: 14 }}>
                ~ {suspendedRemaining}h
              </p>
            </div>
          </div>
        )}

        {/* Bara de căutare */}
        <div style={searchBarStyle}>
          <input
            type="search"
            placeholder={semanticMode ? t('home.semanticSearch') + '...' : t('home.searchPlaceholder')}
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            style={{ ...selectStyle(darkMode), flex: 1, minWidth: 160 }}
            aria-label={t('common.search')}
          />
          <button
            onClick={() => { setSemanticMode(m => !m); setSemanticResults([]); setSemanticError(null); }}
            title={t('home.semanticSearchHint')}
            style={{
              ...selectStyle(darkMode), cursor: 'pointer',
              background: semanticMode ? 'rgba(120, 40, 200, 0.15)' : 'transparent',
              border: semanticMode ? '1px solid rgba(168, 85, 247, 0.6)' : (darkMode ? '1px solid rgba(168, 85, 247, 0.45)' : '1px solid #ccc'),
              color: semanticMode ? '#a855f7' : (darkMode ? '#c9a8ff' : '#666'),
              whiteSpace: 'nowrap', fontWeight: semanticMode ? 600 : 400,
            }}
          >
            ✦ {t('home.semanticSearch')}{semanticMode ? ' ON' : ''}
          </button>
        </div>

        {user && (user.grade || user.school) && !semanticMode && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            {user.grade && (
              <button onClick={toggleMyClass} style={chipStyle(darkMode, myClassActive)}>
                🎓 {t('common.grade')}: {user.grade}{myClassActive && ' ✓'}
              </button>
            )}
            {user.school && (
              <button onClick={toggleMySchool} style={chipStyle(darkMode, mySchoolActive)}>
                🏫 {t('auth.school')}{mySchoolActive && ' ✓'}
              </button>
            )}
          </div>
        )}

        {/* Mod semantic */}
        {semanticMode && (
          <>
            {semanticLoading && <p style={{ color: '#888' }}>{t('home.semanticSearching')}</p>}
            {semanticError && <p style={{ color: 'red' }}>{t('common.error')}: {semanticError}</p>}
            {!semanticLoading && !semanticError && searchInput.trim() && (
              <>
                <p style={{ color: '#888', fontSize: 14, marginBottom: 12 }}>
                  {semanticResults.length}
                </p>
                {semanticResults.length === 0 ? (
                  <p style={{ color: '#888' }}>{t('home.noResults')}</p>
                ) : (
                  <div className="responsive-cards-grid" style={gridStyle}>
                    {semanticResults.map(note => (
                      <NoteCard key={note.id} note={note} similarity={note.similarity} />
                    ))}
                  </div>
                )}
              </>
            )}
            {!searchInput.trim() && (
              <p style={{ color: '#888', fontSize: 14 }}>{t('home.semanticSearchHint')}</p>
            )}
          </>
        )}

        {/* Mod clasic */}
        {!semanticMode && (
          <>
            {recentNotes.length > 0 && !searchInput && !hasActiveFilters && (
              <section style={{ marginBottom: 32 }}>
                <h2 style={sectionTitleStyle}>{t('home.sortNewest')}</h2>
                <div className="responsive-cards-grid" style={gridStyle}>
                  {recentNotes.map(note => <NoteCard key={note.id} note={note} />)}
                </div>
              </section>
            )}

            <section>
              <h2 style={sectionTitleStyle}>
                {searchInput || hasActiveFilters ? t('common.search') : t('home.title')}
              </h2>

              {hasActiveFilters && (
                <div style={activeFiltersBarStyle(darkMode)}>
                  {subject && !subjectIsNeutral && (
                    <ActiveChip label={`${t('common.subject')}: ${subject}`} onRemove={() => setParam('subject', defaultSubject || '')} darkMode={darkMode} />
                  )}
                  {gradeLevel && !gradeIsNeutral && (
                    <ActiveChip label={`${t('common.grade')}: ${gradeLevel}`} onRemove={() => setParam('gradeLevel', defaultGrade != null ? String(defaultGrade) : '')} darkMode={darkMode} />
                  )}
                  {type && (
                    <ActiveChip label={`${t('common.type')}: ${NOTE_TYPES.find(nt => nt.value === type)?.label || type}`} onRemove={() => setParam('type', '')} darkMode={darkMode} />
                  )}
                  {school && (
                    <ActiveChip label={`${t('auth.school')}: ${school}`} onRemove={() => setParam('school', '')} darkMode={darkMode} />
                  )}
                  {tagParam && (
                    <ActiveChip label={`#${tagParam}`} onRemove={() => setParam('tag', '')} darkMode={darkMode} />
                  )}
                  {sort !== 'recent' && (
                    <ActiveChip label={`${t('home.sortBy')}: ${sort === 'popular' ? t('home.sortPopular') : t('home.sortBest')}`} onRemove={() => setParam('sort', 'recent')} darkMode={darkMode} />
                  )}
                  <button onClick={clearFilters} style={resetAllBtnStyle(darkMode)}>
                    {t('home.resetFilters')}
                  </button>
                </div>
              )}

              {loading && <p>{t('home.loadingNotes')}</p>}
              {error && <p style={{ color: 'red' }}>{t('common.error')}: {error}</p>}

              {!loading && !error && (
                <>
                  <p style={{ color: '#888', fontSize: 13, marginBottom: 12 }}>
                    {result.total}
                  </p>

                  {result.notes.length === 0 ? (
                    <p>{t('home.noResults')}</p>
                  ) : (
                    <div ref={allNotesGridRef} className="responsive-cards-grid" style={gridStyle}>
                      {result.notes.map(note => <NoteCard key={note.id} note={note} />)}
                    </div>
                  )}

                  {result.totalPages > 1 && (
                    <div style={paginationStyle}>
                      <button onClick={() => setPage(page - 1)} disabled={page <= 1} style={pageButtonStyle(darkMode)}>
                        ‹ {t('common.previous')}
                      </button>
                      <span style={{ padding: '6px 12px', color: '#888', fontSize: 14 }}>
                        {page} / {result.totalPages}
                      </span>
                      <button onClick={() => setPage(page + 1)} disabled={page >= result.totalPages} style={pageButtonStyle(darkMode)}>
                        {t('common.next')} ›
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

function TagFilter({ value, onChange, darkMode, t }) {
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
      <option value="">{t ? t('common.all') : 'All'}</option>
      {tags.map(tag => (
        <option key={tag.id} value={tag.name}>
          {tag.isOfficial ? '★ ' : ''}#{tag.name}{tag.noteCount > 0 ? ` (${tag.noteCount})` : ''}
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

const pageButtonStyle = (darkMode) => ({
  padding: '6px 14px',
  border: darkMode ? '1px solid rgba(168, 85, 247, 0.45)' : '1px solid rgba(244, 114, 182, 0.5)',
  background: darkMode ? 'transparent' : 'rgba(255, 255, 255, 0.6)',
  color: darkMode ? '#e8e0ff' : '#be185d',
  borderRadius: 4,
  cursor: 'pointer',
  fontWeight: 500,
});

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

