// Modal "Șterge notița" — programează ștergerea și acțiunea asupra autorului.
import { useTranslation } from 'react-i18next';
import {
  labelStyle, inputStyle, btnSecondary, btnDeleteNote, modalOverlay, modalBoxStyle,
} from './shared.jsx';

export default function DeleteNoteModal({
  delModal, delForm, setDelForm,
  delSaving, submitDeleteNote, onClose, darkMode,
}) {
  const { t } = useTranslation();

  return (
    <div style={modalOverlay}>
      <div style={{ ...modalBoxStyle(darkMode), maxWidth: 540 }}>
        <h3 style={{ marginTop: 0 }}>{t('admin.deleteNote')}</h3>
        <p style={{ fontSize: 13, color: darkMode ? '#a89bc4' : '#6b7280', marginTop: 0 }}>
          „{delModal.report.note.title}" — <strong>{delModal.report.note.author.username}</strong>
        </p>

        <label style={labelStyle}>
          {t('banned.willBeDeleted')}
          <input
            type="number" min={1} max={365}
            value={delForm.days}
            onChange={e => setDelForm(f => ({ ...f, days: e.target.value }))}
            style={inputStyle}
          />
        </label>

        <label style={labelStyle}>
          {t('banned.reason')}
          <textarea
            rows={2}
            value={delForm.reason}
            onChange={e => setDelForm(f => ({ ...f, reason: e.target.value }))}
            style={{ ...inputStyle, fontFamily: 'inherit', resize: 'vertical' }}
          />
        </label>

        <hr style={{ border: 'none', borderTop: darkMode ? '1px solid rgba(168,85,247,0.2)' : '1px solid #e5e7eb', margin: '16px 0' }} />

        <label style={labelStyle}>
          {t('common.actions')}
          <select
            value={delForm.userAction}
            onChange={e => setDelForm(f => ({ ...f, userAction: e.target.value }))}
            style={inputStyle}
          >
            <option value="NONE">{t('common.none')}</option>
            <option value="WARN">{t('admin.warn')}</option>
            <option value="SUSPEND">{t('admin.suspend')}</option>
            <option value="BAN">🚫 {t('admin.ban')}</option>
          </select>
        </label>

        {delForm.userAction === 'WARN' && (
          <label style={labelStyle}>
            {t('admin.warn')}
            <textarea
              rows={3}
              required
              value={delForm.warningText}
              onChange={e => setDelForm(f => ({ ...f, warningText: e.target.value }))}
              style={{ ...inputStyle, fontFamily: 'inherit', resize: 'vertical' }}
            />
          </label>
        )}

        {delForm.userAction === 'SUSPEND' && (
          <label style={labelStyle}>
            {t('admin.suspend')}
            <input
              type="number" min={1} max={8760}
              value={delForm.suspendHours}
              onChange={e => setDelForm(f => ({ ...f, suspendHours: e.target.value }))}
              style={inputStyle}
            />
          </label>
        )}

        {delForm.userAction === 'BAN' && (
          <div style={{
            padding: 10, borderRadius: 6, fontSize: 13,
            background: darkMode ? 'rgba(220, 38, 38, 0.1)' : '#fee2e2',
            color: darkMode ? '#fca5a5' : '#991b1b',
            border: '1px solid rgba(220, 38, 38, 0.3)',
          }}>
            {t('banned.willBeDeleted')}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          <button onClick={onClose} disabled={delSaving} style={btnSecondary}>
            {t('common.cancel')}
          </button>
          <button onClick={submitDeleteNote} disabled={delSaving || !delForm.reason || (delForm.userAction === 'WARN' && !delForm.warningText)} style={btnDeleteNote}>
            {delSaving ? t('banned.submitting') : t('common.confirm')}
          </button>
        </div>
      </div>
    </div>
  );
}
