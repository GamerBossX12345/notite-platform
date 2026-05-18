// Modal editare utilizator sau notiță.
import { useTranslation } from 'react-i18next';
import {
  Field, GRADE_LEVELS, NOTE_TYPES,
  labelStyle, inputStyle, btnPrimary, btnSecondary, modalOverlay, modalBoxStyle,
} from './shared.jsx';

export default function EditModal({
  editTarget, editForm, setEditForm,
  saving, handleSave, onClose, darkMode,
}) {
  const { t } = useTranslation();
  const field = key => v => setEditForm(f => ({ ...f, [key]: v }));

  return (
    <div style={modalOverlay}>
      <div style={modalBoxStyle(darkMode)}>
        <h3 style={{ marginTop: 0 }}>
          {editTarget.type === 'user' ? t('common.edit') + ' — ' + t('common.username') : t('common.edit') + ' — ' + t('note.title')}
        </h3>
        <form onSubmit={handleSave}>
          {editTarget.type === 'user' ? (
            <>
              <Field label={t('settings.name')}    value={editForm.name}     onChange={field('name')} />
              <Field label={t('common.username')}  value={editForm.username} onChange={field('username')} required />
              <Field label={t('common.email')}     value={editForm.email}    onChange={field('email')} type="email" required />
              <Field label={t('auth.school')}      value={editForm.school}   onChange={field('school')} />
              <label style={labelStyle}>
                {t('common.grade')}
                <select value={editForm.grade} onChange={e => setEditForm(f => ({ ...f, grade: e.target.value }))} style={inputStyle}>
                  <option value="">—</option>
                  {GRADE_LEVELS.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </label>
            </>
          ) : (
            <>
              <Field label={t('note.title')}           value={editForm.title}   onChange={field('title')} required />
              <Field label={t('upload.subjectField')}  value={editForm.subject} onChange={field('subject')} required />
              <label style={labelStyle}>
                {t('common.grade')}
                <select value={editForm.gradeLevel} onChange={e => setEditForm(f => ({ ...f, gradeLevel: e.target.value }))} style={inputStyle}>
                  {GRADE_LEVELS.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </label>
              <label style={labelStyle}>
                {t('common.type')}
                <select value={editForm.type} onChange={e => setEditForm(f => ({ ...f, type: e.target.value }))} style={inputStyle}>
                  {NOTE_TYPES.map(nt => <option key={nt.value} value={nt.value}>{t(nt.labelKey)}</option>)}
                </select>
              </label>
              <Field label={t('note.chapter')} value={editForm.chapter} onChange={field('chapter')} />
            </>
          )}
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button type="submit" disabled={saving} style={btnPrimary}>
              {saving ? t('banned.submitting') : t('common.save')}
            </button>
            <button type="button" onClick={onClose} style={btnSecondary}>
              {t('common.cancel')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
