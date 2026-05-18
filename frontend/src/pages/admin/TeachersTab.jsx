// Tab "Profesori" — cereri de verificare + coduri de invitație.
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../api/client.js';
import {
  Th, Td, Dash,
  tableStyle, tabBtn, activeTab, btnPrimary, btnRevokeStyle,
  requestCardStyle, textareaInline, approveBtn, rejectBtn, handledRowStyle,
  generateFormStyle, generatedCodeStyle, inputStyle,
} from './shared.jsx';

export default function TeachersTab({ requests, codes, darkMode, onRefresh }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language?.startsWith('en') ? 'en-US' : 'ro-RO';
  const [section, setSection] = useState('requests');
  const [adminResponse, setAdminResponse] = useState({});
  const [busy, setBusy] = useState(null);

  const [newNote, setNewNote] = useState('');
  const [newMaxUses, setNewMaxUses] = useState(1);
  const [newExpires, setNewExpires] = useState('');
  const [generating, setGenerating] = useState(false);
  const [lastCode, setLastCode] = useState(null);

  async function handleApprove(id) {
    setBusy(id);
    try {
      await api.post(`/admin/teacher-requests/${id}/approve`, {
        adminResponse: adminResponse[id] || undefined,
      });
      onRefresh();
    } catch (err) {
      alert(err.response?.data?.error || t('common.error'));
    } finally {
      setBusy(null);
    }
  }

  async function handleReject(id) {
    if (!adminResponse[id]?.trim()) {
      alert(t('appeals.adminResponse'));
      return;
    }
    setBusy(id);
    try {
      await api.post(`/admin/teacher-requests/${id}/reject`, {
        adminResponse: adminResponse[id],
      });
      onRefresh();
    } catch (err) {
      alert(err.response?.data?.error || t('common.error'));
    } finally {
      setBusy(null);
    }
  }

  async function handleGenerate(e) {
    e.preventDefault();
    setGenerating(true);
    setLastCode(null);
    try {
      const body = { note: newNote || undefined, maxUses: Number(newMaxUses) || 1 };
      if (newExpires) body.expiresAt = new Date(newExpires).toISOString();
      const { data } = await api.post('/admin/teacher-invite-codes', body);
      setLastCode(data);
      setNewNote(''); setNewMaxUses(1); setNewExpires('');
      onRefresh();
    } catch (err) {
      alert(err.response?.data?.error || t('common.error'));
    } finally {
      setGenerating(false);
    }
  }

  async function handleRevoke(id) {
    if (!confirm(t('common.confirm') + '?')) return;
    try {
      await api.delete(`/admin/teacher-invite-codes/${id}`);
      onRefresh();
    } catch (err) {
      alert(err.response?.data?.error || t('common.error'));
    }
  }

  const pending = requests.filter(r => r.status === 'PENDING');
  const handled = requests.filter(r => r.status !== 'PENDING');
  const backendOrigin = api.defaults.baseURL ? new URL(api.defaults.baseURL).origin : '';

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button onClick={() => setSection('requests')} style={section === 'requests' ? activeTab : tabBtn}>
          {t('admin.teacherRequests')} ({requests.length})
        </button>
        <button onClick={() => setSection('codes')} style={section === 'codes' ? activeTab : tabBtn}>
          {t('admin.teacherCodes')} ({codes.length})
        </button>
      </div>

      {section === 'requests' && (
        <div>
          <h3 style={{ margin: '0 0 10px' }}>{t('admin.appealPending')} ({pending.length})</h3>
          {pending.length === 0 ? (
            <p style={{ color: darkMode ? '#a89bc4' : '#6b7280' }}>{t('admin.empty')}</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {pending.map(r => (
                <div key={r.id} style={requestCardStyle(darkMode)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                    <div>
                      <strong>{r.user.username}</strong>
                      <span style={{ marginLeft: 8, color: darkMode ? '#a89bc4' : '#6b7280', fontSize: 13 }}>
                        {r.user.email}
                      </span>
                      {r.user.school && (
                        <span style={{ marginLeft: 8, fontSize: 13 }}>• {r.user.school}</span>
                      )}
                    </div>
                    <span style={{ fontSize: 12, color: darkMode ? '#a89bc4' : '#6b7280' }}>
                      {new Date(r.createdAt).toLocaleDateString(locale)}
                    </span>
                  </div>
                  <p style={{ margin: '10px 0', whiteSpace: 'pre-wrap', fontSize: 14 }}>
                    {r.message}
                  </p>
                  {r.documentUrl && (
                    <p style={{ margin: '4px 0 10px', fontSize: 13 }}>
                      📎{' '}
                      <a
                        href={backendOrigin + r.documentUrl}
                        target="_blank" rel="noopener noreferrer"
                        style={{ color: darkMode ? '#c9a8ff' : '#6366f1', fontWeight: 600 }}
                      >
                        {t('settings.teacherDocument')}
                      </a>
                    </p>
                  )}
                  <textarea
                    value={adminResponse[r.id] || ''}
                    onChange={e => setAdminResponse(prev => ({ ...prev, [r.id]: e.target.value }))}
                    rows={2}
                    placeholder={t('appeals.adminResponse')}
                    style={textareaInline(darkMode)}
                  />
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <button onClick={() => handleApprove(r.id)} disabled={busy === r.id} style={approveBtn}>
                      ✓ {t('admin.approve')}
                    </button>
                    <button onClick={() => handleReject(r.id)} disabled={busy === r.id} style={rejectBtn}>
                      ✗ {t('admin.reject')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {handled.length > 0 && (
            <>
              <h3 style={{ margin: '24px 0 10px' }}>{t('admin.appealResolved')} ({handled.length})</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {handled.map(r => (
                  <div key={r.id} style={handledRowStyle(r.status, darkMode)}>
                    <strong>{r.user.username}</strong>
                    <span style={{ marginLeft: 8, fontSize: 12 }}>
                      {r.status === 'APPROVED' ? '✓ ' + t('admin.approve') : '✗ ' + t('admin.reject')}
                    </span>
                    {r.reviewedAt && (
                      <span style={{ marginLeft: 8, fontSize: 11, color: darkMode ? '#a89bc4' : '#6b7280' }}>
                        {new Date(r.reviewedAt).toLocaleDateString(locale)}
                      </span>
                    )}
                    {r.adminResponse && (
                      <p style={{ margin: '4px 0 0', fontSize: 12, color: darkMode ? '#d4c8ff' : '#374151' }}>
                        „{r.adminResponse}"
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {section === 'codes' && (
        <div>
          <form onSubmit={handleGenerate} style={generateFormStyle(darkMode)}>
            <h3 style={{ margin: '0 0 10px' }}>{t('admin.createCode')}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
              <input
                value={newNote}
                onChange={e => setNewNote(e.target.value)}
                placeholder={t('common.details')}
                style={inputStyle}
              />
              <input
                type="number" min={1} max={1000}
                value={newMaxUses}
                onChange={e => setNewMaxUses(e.target.value)}
                placeholder={t('admin.codeUses')}
                style={inputStyle}
              />
              <input
                type="date"
                value={newExpires}
                onChange={e => setNewExpires(e.target.value)}
                style={inputStyle}
              />
            </div>
            <button type="submit" disabled={generating} style={btnPrimary}>
              {generating ? t('banned.submitting') : t('admin.createCode')}
            </button>
            {lastCode && (
              <div style={generatedCodeStyle(darkMode)}>
                <strong>{t('settings.teacherCode')}:</strong>{' '}
                <code style={{ fontSize: 18, letterSpacing: 2, fontFamily: 'monospace' }}>
                  {lastCode.code}
                </code>
              </div>
            )}
          </form>

          <h3 style={{ margin: '20px 0 10px' }}>{t('admin.teacherCodes')}</h3>
          {codes.length === 0 ? (
            <p style={{ color: darkMode ? '#a89bc4' : '#6b7280' }}>{t('admin.empty')}</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <Th>{t('settings.teacherCode')}</Th>
                    <Th>{t('common.details')}</Th>
                    <Th>{t('admin.codeUses')}</Th>
                    <Th>{t('admin.codeExpires')}</Th>
                    <Th>{t('common.status')}</Th>
                    <Th>{t('common.actions')}</Th>
                  </tr>
                </thead>
                <tbody>
                  {codes.map(c => {
                    const expired = c.expiresAt && new Date(c.expiresAt) < new Date();
                    const exhausted = c.usedCount >= c.maxUses;
                    const status = c.revokedAt ? 'revoked' : expired ? 'expired' : exhausted ? 'exhausted' : 'active';
                    const statusColor =
                      status === 'active'  ? (darkMode ? '#6ee7b7' : '#065f46') :
                      status === 'revoked' ? (darkMode ? '#fca5a5' : '#991b1b') :
                                             (darkMode ? '#a89bc4' : '#6b7280');
                    return (
                      <tr key={c.id}>
                        <Td>
                          <code style={{ fontFamily: 'monospace', fontWeight: 600 }}>{c.code}</code>
                        </Td>
                        <Td>{c.note || <Dash />}</Td>
                        <Td>{c.usedCount} / {c.maxUses}</Td>
                        <Td>
                          {c.expiresAt
                            ? new Date(c.expiresAt).toLocaleDateString(locale)
                            : <Dash />}
                        </Td>
                        <Td>
                          <span style={{ color: statusColor, fontWeight: 600, fontSize: 12 }}>
                            {status}
                          </span>
                        </Td>
                        <Td>
                          {!c.revokedAt && (
                            <button onClick={() => handleRevoke(c.id)} style={btnRevokeStyle}>
                              {t('common.delete')}
                            </button>
                          )}
                        </Td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
