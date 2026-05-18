// Tab "Notițe" — listă cu acțiuni de editare/repunere/ștergere.
import { useTranslation } from 'react-i18next';
import {
  Th, Td, SearchBar, Empty,
  TYPE_BADGE, subjectColor,
  tableStyle, btnEditStyle, btnRestoreStyle, btnDelete, badgeBase,
} from './shared.jsx';

export default function NotesTab({
  filteredNotes, noteQuery, setNoteQuery,
  darkMode,
  openEditNote, unhideNote, deleteNote,
}) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language?.startsWith('en') ? 'en-US' : 'ro-RO';

  return (
    <>
      <SearchBar value={noteQuery} onChange={setNoteQuery} placeholder={t('admin.searchNotes')} />
      {filteredNotes.length === 0 ? <Empty label={noteQuery} message={t('admin.empty')} /> : (
        <div style={{ overflowX: 'auto' }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <Th>{t('note.title')}</Th>
                <Th>{t('note.by')}</Th>
                <Th>{t('common.subject')} · {t('common.grade')}</Th>
                <Th>{t('common.type')}</Th>
                <Th>{t('note.rating')}</Th>
                <Th>{t('common.date')}</Th>
                <Th>{t('common.actions')}</Th>
              </tr>
            </thead>
            <tbody>
              {filteredNotes.map(n => {
                const typeBadge = TYPE_BADGE[n.type] || { label: n.type, bg: '#6b7280', color: 'white' };
                const subjColor = subjectColor(n.subject);
                return (
                  <tr key={n.id} style={{ background: n.hidden ? (darkMode ? 'rgba(220, 38, 38, 0.08)' : '#fef2f2') : 'transparent' }}>
                    <Td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ width: 4, height: 28, background: subjColor, borderRadius: 2, flexShrink: 0 }} />
                        <div>
                          <a
                            href={`/notes/${n.id}`}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              color: n.hidden ? (darkMode ? '#888' : '#999') : (darkMode ? '#c4b5fd' : '#5b21b6'),
                              textDecoration: 'none',
                              fontWeight: 500,
                            }}
                          >
                            {n.title}
                          </a>
                          {n.chapter && (
                            <div style={{ fontSize: 11, color: darkMode ? '#9ca3af' : '#6b7280', marginTop: 2 }}>
                              {n.chapter}
                            </div>
                          )}
                          {n.hidden && !n.deletionScheduledAt && (
                            <span style={{ display: 'inline-block', marginTop: 4, fontSize: 10, background: '#dc2626', color: 'white', borderRadius: 4, padding: '2px 6px', fontWeight: 600 }}>
                              🚫 {t('admin.hideNote')}
                            </span>
                          )}
                          {n.deletionScheduledAt && (
                            <div style={{ marginTop: 4 }}>
                              <span style={{ display: 'inline-block', fontSize: 10, background: '#b45309', color: 'white', borderRadius: 4, padding: '2px 6px', fontWeight: 600 }}>
                                ⏳ {t('admin.deleteNote')}
                              </span>
                              <div style={{ fontSize: 10, color: darkMode ? '#fcd34d' : '#92400e', marginTop: 2 }}>
                                {new Date(n.deletionScheduledAt).toLocaleDateString(locale)}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </Td>
                    <Td>
                      <div style={{ fontWeight: 500 }}>{n.author.name || n.author.username}</div>
                      {n.author.name && (
                        <div style={{ fontSize: 11, color: darkMode ? '#9ca3af' : '#6b7280' }}>
                          @{n.author.username}
                        </div>
                      )}
                    </Td>
                    <Td>
                      <span style={{ ...badgeBase, background: subjColor, color: 'white', fontWeight: 600 }}>
                        {n.subject}
                      </span>
                      <div style={{ fontSize: 11, color: darkMode ? '#9ca3af' : '#6b7280', marginTop: 4 }}>
                        {t('common.grade')} {n.gradeLevel}
                      </div>
                    </Td>
                    <Td>
                      <span style={{ ...badgeBase, background: typeBadge.bg, color: typeBadge.color, fontWeight: 600 }}>
                        {typeBadge.label}
                      </span>
                    </Td>
                    <Td>
                      {n.ratingCount > 0 ? (
                        <div>
                          <span style={{ color: '#f59e0b', fontWeight: 600 }}>★ {n.avgRating.toFixed(1)}</span>
                          <span style={{ fontSize: 11, color: darkMode ? '#9ca3af' : '#6b7280', marginLeft: 4 }}>
                            ({n.ratingCount})
                          </span>
                        </div>
                      ) : (
                        <span style={{ fontSize: 11, color: darkMode ? '#6b7280' : '#9ca3af' }}>—</span>
                      )}
                      <div style={{ fontSize: 11, color: darkMode ? '#9ca3af' : '#6b7280', marginTop: 2 }}>
                        👁 {n.viewCount || 0}
                      </div>
                    </Td>
                    <Td>
                      <div style={{ fontSize: 13 }}>{new Date(n.createdAt).toLocaleDateString(locale)}</div>
                    </Td>
                    <Td>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        <button onClick={() => openEditNote(n)} style={btnEditStyle(darkMode)}>{t('common.edit')}</button>
                        {n.hidden && (
                          <button onClick={() => unhideNote(n.id)} style={btnRestoreStyle}>↶ {t('admin.unhideNote')}</button>
                        )}
                        <button onClick={() => deleteNote(n.id)} style={btnDelete}>{t('common.delete')}</button>
                      </div>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
