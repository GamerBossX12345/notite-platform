// Tab "Rapoarte" — listă cu acțiuni de marcare ca fals / ștergere notiță cu acțiune autor.
import { useTranslation } from 'react-i18next';
import {
  Th, Td, SearchBar, Empty, Dash, AIVerdictBadge,
  REASON_LABEL, reportStatusStyle,
  tableStyle, btnEditStyle, btnFalseReport, btnDeleteNote, badgeBase,
} from './shared.jsx';

export default function ReportsTab({
  filteredReports, reportQuery, setReportQuery,
  authorReportCount,
  darkMode,
  markReportFalse, openDeleteNoteModal, deleteReport,
}) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language?.startsWith('en') ? 'en-US' : 'ro-RO';

  return (
    <>
      <SearchBar value={reportQuery} onChange={setReportQuery} placeholder={t('common.search')} />
      {filteredReports.length === 0 ? <Empty label={reportQuery} message={t('admin.empty')} /> : (
        <div style={{ overflowX: 'auto' }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <Th>{t('note.title')}</Th>
                <Th>{t('note.by')}</Th>
                <Th>{t('note.report')}</Th>
                <Th>{t('banned.reason')}</Th>
                <Th>{t('common.details')}</Th>
                <Th>{t('admin.verdict')}</Th>
                <Th>{t('common.status')}</Th>
                <Th>{t('common.date')}</Th>
                <Th>{t('common.actions')}</Th>
              </tr>
            </thead>
            <tbody>
              {filteredReports.map(r => {
                const st = reportStatusStyle(r.status, darkMode, t);
                return (
                  <tr key={r.id}>
                    <Td>
                      <a href={`/notes/${r.note.id}`} target="_blank" rel="noreferrer" style={{ color: '#0066cc', textDecoration: 'none' }}>
                        {r.note.title}
                      </a>
                      {r.note.hidden && (
                        <span style={{ marginLeft: 6, fontSize: 10, background: '#b71c1c', color: 'white', borderRadius: 4, padding: '1px 5px' }}>
                          {t('admin.hideNote')}
                        </span>
                      )}
                    </Td>
                    <Td>
                      {r.note.author.username}
                      {r.note.author.suspendedUntil && new Date(r.note.author.suspendedUntil) > new Date() && (
                        <span style={{ marginLeft: 6, fontSize: 10, background: '#f57c00', color: 'white', borderRadius: 4, padding: '1px 5px' }}>
                          {t('admin.suspend')}
                        </span>
                      )}
                      {authorReportCount[r.note.author.id] > 1 && (
                        <div
                          style={{
                            display: 'inline-block', marginLeft: 6, fontSize: 10,
                            background: '#b91c1c', color: 'white', borderRadius: 4,
                            padding: '1px 6px', fontWeight: 700,
                          }}
                        >
                          ⚠ {authorReportCount[r.note.author.id]}×
                        </div>
                      )}
                    </Td>
                    <Td>{r.reporter.name || r.reporter.username}</Td>
                    <Td>{r.reason && REASON_LABEL[r.reason] ? t(REASON_LABEL[r.reason]) : (r.reason || <Dash />)}</Td>
                    <Td style={{ maxWidth: 200, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      {r.details || <Dash />}
                    </Td>
                    <Td>
                      {r.aiVerdict ? (
                        <AIVerdictBadge verdict={r.aiVerdict} text={r.aiVerdictText} darkMode={darkMode} t={t} />
                      ) : (
                        <Dash />
                      )}
                    </Td>
                    <Td>
                      <span style={{ ...badgeBase, background: st.background, color: st.color, border: st.border, fontWeight: 600 }}>
                        {st.label}
                      </span>
                    </Td>
                    <Td>{new Date(r.createdAt).toLocaleDateString(locale)}</Td>
                    <Td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 160 }}>
                        <button
                          onClick={() => markReportFalse(r)}
                          style={btnFalseReport}
                          disabled={r.status === 'RESOLVED'}
                        >
                          ✓ {t('admin.reportResolved')}
                        </button>
                        <button
                          onClick={() => openDeleteNoteModal(r)}
                          style={btnDeleteNote}
                          disabled={r.status === 'RESOLVED'}
                        >
                          🗑 {t('admin.deleteNote')}
                        </button>
                        <button
                          onClick={() => deleteReport(r.id)}
                          style={btnEditStyle(darkMode)}
                        >
                          {t('common.delete')}
                        </button>
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
