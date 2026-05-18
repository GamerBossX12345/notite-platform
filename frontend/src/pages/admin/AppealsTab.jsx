// Tab "Apeluri" — listă tichete + modal de detaliu.
import { useTranslation } from 'react-i18next';
import {
  Th, Td, Empty, Dash,
  APPEAL_STATUS,
  tableStyle, btnEditStyle, badgeBase, modalOverlay, modalBoxStyle, btnSecondary, labelStyle, inputStyle,
} from './shared.jsx';

export default function AppealsTab({
  appeals, appealDetail, setAppealDetail, appealResponse, setAppealResponse,
  darkMode,
  viewAppeal, openAppealTicket, resolveAppealTicket,
}) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language?.startsWith('en') ? 'en-US' : 'ro-RO';

  return (
    <>
      {appeals.length === 0 ? (
        <Empty message={t('admin.empty')} />
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <Th>{t('common.username')}</Th>
                <Th>{t('common.status')}</Th>
                <Th>{t('appeals.appealMessage')}</Th>
                <Th>{t('common.date')}</Th>
                <Th>{t('note.by')}</Th>
                <Th>{t('common.actions')}</Th>
              </tr>
            </thead>
            <tbody>
              {appeals.map(a => {
                const statusInfo = APPEAL_STATUS[a.status] || { labelKey: null, bg: '#6b7280' };
                return (
                  <tr key={a.id}>
                    <Td>
                      <strong>{a.user.username}</strong>
                      {a.user.banned && (
                        <span style={{ display: 'inline-block', marginLeft: 6, fontSize: 10, background: '#dc2626', color: 'white', borderRadius: 4, padding: '1px 6px', fontWeight: 600 }}>
                          {t('nav.banned')}
                        </span>
                      )}
                      <div style={{ fontSize: 11, color: darkMode ? '#9ca3af' : '#6b7280' }}>{a.user.email}</div>
                    </Td>
                    <Td>
                      <span style={{ ...badgeBase, background: statusInfo.bg, color: 'white' }}>
                        {statusInfo.labelKey ? t(statusInfo.labelKey) : a.status}
                      </span>
                      {a.resolution && (
                        <div style={{ fontSize: 11, marginTop: 4, color: a.resolution === 'OVERTURNED' ? '#10b981' : '#dc2626' }}>
                          {a.resolution === 'OVERTURNED' ? t('appeals.resolutionOverturned') : t('appeals.resolutionUpheld')}
                        </div>
                      )}
                    </Td>
                    <Td style={{ maxWidth: 320 }}>
                      <div style={{ fontSize: 13, color: darkMode ? '#d4d4d8' : '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {a.message.length > 80 ? a.message.slice(0, 80) + '…' : a.message}
                      </div>
                    </Td>
                    <Td>{new Date(a.createdAt).toLocaleDateString(locale)}</Td>
                    <Td>{a.openedBy?.username || <Dash />}</Td>
                    <Td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button onClick={() => viewAppeal(a.id)} style={btnEditStyle(darkMode)}>
                          {t('common.view')}
                        </button>
                        {a.status === 'PENDING' && (
                          <button onClick={() => openAppealTicket(a.id)} style={{ ...btnEditStyle(darkMode), background: '#7c3aed', color: 'white', border: 'none' }}>
                            {t('common.open')}
                          </button>
                        )}
                      </div>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {appealDetail && (
        <div style={modalOverlay}>
          <div style={{ ...modalBoxStyle(darkMode), maxWidth: 720 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              <h3 style={{ marginTop: 0 }}>
                {appealDetail.user.username}
              </h3>
              <button onClick={() => { setAppealDetail(null); setAppealResponse(''); }} style={btnSecondary} aria-label={t('common.close')}>✕</button>
            </div>

            <p style={{ fontSize: 13, color: darkMode ? '#a89bc4' : '#6b7280' }}>
              {t('banHistory.bannedAt')}: {appealDetail.user.bannedAt ? new Date(appealDetail.user.bannedAt).toLocaleString(locale) : '—'}
            </p>

            {appealDetail.user.banReason && (
              <div style={{ marginBottom: 12 }}>
                <strong>{t('banned.reason')}:</strong>
                <p style={{ margin: '4px 0', padding: 8, background: darkMode ? 'rgba(0,0,0,0.3)' : '#f9fafb', borderRadius: 4, whiteSpace: 'pre-wrap' }}>
                  {appealDetail.user.banReason}
                </p>
              </div>
            )}

            {appealDetail.banNote && (
              <div style={{ marginBottom: 12 }}>
                <strong>{t('note.title')}:</strong>
                <div style={{ padding: 10, background: darkMode ? 'rgba(0,0,0,0.3)' : '#f9fafb', borderRadius: 4, marginTop: 4 }}>
                  <a href={`/notes/${appealDetail.banNote.id}`} target="_blank" rel="noreferrer"
                     style={{ color: darkMode ? '#c4b5fd' : '#5b21b6', fontWeight: 600 }}>
                    {appealDetail.banNote.title}
                  </a>
                  <div style={{ fontSize: 12, color: darkMode ? '#9ca3af' : '#6b7280' }}>
                    {appealDetail.banNote.subject} • {t('common.grade')} {appealDetail.banNote.gradeLevel}
                  </div>
                </div>
              </div>
            )}

            <div style={{ marginBottom: 12 }}>
              <strong>{t('appeals.appealMessage')}:</strong>
              <div style={{ padding: 12, background: darkMode ? 'rgba(168, 85, 247, 0.08)' : 'rgba(168, 85, 247, 0.05)', borderRadius: 6, marginTop: 4, whiteSpace: 'pre-wrap' }}>
                {appealDetail.message}
              </div>
            </div>

            {appealDetail.status !== 'RESOLVED' ? (
              <>
                <label style={labelStyle}>
                  {t('appeals.adminResponse')}
                  <textarea
                    value={appealResponse}
                    onChange={e => setAppealResponse(e.target.value)}
                    rows={3}
                    style={{ ...inputStyle, fontFamily: 'inherit', resize: 'vertical' }}
                  />
                </label>
                <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'flex-end' }}>
                  {appealDetail.status === 'PENDING' && (
                    <button onClick={() => openAppealTicket(appealDetail.id)} style={{ ...btnEditStyle(darkMode), background: '#7c3aed', color: 'white', border: 'none' }}>
                      {t('common.open')}
                    </button>
                  )}
                  <button onClick={() => resolveAppealTicket(appealDetail.id, 'OVERTURNED')}
                          style={{ padding: '8px 16px', background: '#10b981', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
                    ✓ {t('admin.overturnBan')}
                  </button>
                  <button onClick={() => resolveAppealTicket(appealDetail.id, 'UPHELD')}
                          style={{ padding: '8px 16px', background: '#dc2626', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
                    ✗ {t('admin.upholdBan')}
                  </button>
                </div>
              </>
            ) : (
              <div style={{ padding: 12, background: darkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)', borderRadius: 6 }}>
                <p style={{ margin: '0 0 6px' }}>
                  <strong>{appealDetail.resolvedBy?.username || '—'}</strong>
                  {' '}— {appealDetail.resolution === 'OVERTURNED' ? t('appeals.resolutionOverturned') : t('appeals.resolutionUpheld')}
                </p>
                {appealDetail.adminResponse && (
                  <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{appealDetail.adminResponse}</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
