// Helpers, constante și stiluri partajate între tab-urile din panoul admin.
// AdminPage.jsx + fiecare *Tab.jsx importă din acest fișier ca să evite
// duplicarea și să poată fi spart pe fișiere mici.

import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { t as tDefault } from '../../i18n/index.js';

export const GRADE_LEVELS = Array.from({ length: 8 }, (_, i) => i + 5);

export const NOTE_TYPES = [
  { value: 'REZUMAT',           labelKey: 'upload.noteTypeRezumat'   },
  { value: 'EXERCITII',         labelKey: 'upload.noteTypeExercitii' },
  { value: 'FISA',              labelKey: 'upload.noteTypeFisa'      },
  { value: 'HARTA_CONCEPTUALA', labelKey: 'upload.noteTypeHarta'     },
  { value: 'FORMULE',           labelKey: 'upload.noteTypeFormule'   },
];

export const TYPE_BADGE = {
  REZUMAT:           { label: 'Rezumat',     bg: '#6366f1', color: 'white' },
  EXERCITII:         { label: 'Exerciții',   bg: '#10b981', color: 'white' },
  FISA:              { label: 'Fișă',        bg: '#f59e0b', color: '#3b2a00' },
  HARTA_CONCEPTUALA: { label: 'Hartă',       bg: '#ec4899', color: 'white' },
  FORMULE:           { label: 'Formule',     bg: '#06b6d4', color: 'white' },
};

export const REASON_LABEL = {
  PLAGIAT:             'admin.reasonPlagiat',
  CONTINUT_NEPOTRIVIT: 'admin.reasonContent',
  SPAM:                'admin.reasonSpam',
  ALTUL:               'admin.reasonOther',
};

export const ROLE_BADGE = {
  HEAD_ADMIN: { label: 'Head Admin', bg: '#7c3aed', color: 'white' },
  ADMIN:      { label: 'Admin',      bg: '#f59e0b', color: '#3b2a00' },
};
export const TEACHER_BADGE = { label: 'Profesor', bg: '#3b82f6', color: 'white' };

export const APPEAL_STATUS = {
  PENDING:  { labelKey: 'admin.appealPending',  bg: '#f59e0b' },
  OPEN:     { labelKey: 'admin.appealOpen',     bg: '#3b82f6' },
  RESOLVED: { labelKey: 'admin.appealResolved', bg: '#10b981' },
};

const SUBJECT_COLORS = ['#f97316', '#10b981', '#06b6d4', '#ec4899', '#8b5cf6', '#ef4444', '#f59e0b', '#0ea5e9', '#84cc16', '#a855f7'];
export function subjectColor(subject) {
  if (!subject) return '#6b7280';
  let h = 0;
  for (let i = 0; i < subject.length; i++) h = (h * 31 + subject.charCodeAt(i)) & 0xffffffff;
  return SUBJECT_COLORS[Math.abs(h) % SUBJECT_COLORS.length];
}

export function reportStatusStyle(status, darkMode, t = tDefault) {
  if (status === 'PENDING') return {
    background: darkMode ? 'rgba(245, 158, 11, 0.2)' : '#fff3cd',
    color:      darkMode ? '#fcd34d' : '#856404',
    border:     darkMode ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid #fcd34d',
    label: t('admin.reportPending'),
  };
  if (status === 'REVIEWED') return {
    background: darkMode ? 'rgba(59, 130, 246, 0.2)' : '#cce5ff',
    color:      darkMode ? '#93c5fd' : '#004085',
    border:     darkMode ? '1px solid rgba(59, 130, 246, 0.4)' : '1px solid #93c5fd',
    label: t('admin.reportReviewed'),
  };
  return {
    background: darkMode ? 'rgba(16, 185, 129, 0.2)' : '#d4edda',
    color:      darkMode ? '#6ee7b7' : '#155724',
    border:     darkMode ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid #6ee7b7',
    label: t('admin.reportResolved'),
  };
}

export function aiVerdictStyle(verdict, darkMode, t = tDefault) {
  if (verdict === 'VALID') return {
    background: darkMode ? 'rgba(16, 185, 129, 0.2)' : '#d1fae5',
    color: darkMode ? '#6ee7b7' : '#065f46',
    border: darkMode ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid #34d399',
    label: '✔ ' + t('admin.verdictValid'),
  };
  if (verdict === 'INVALID') return {
    background: darkMode ? 'rgba(220, 38, 38, 0.2)' : '#fee2e2',
    color: darkMode ? '#fca5a5' : '#991b1b',
    border: darkMode ? '1px solid rgba(220, 38, 38, 0.4)' : '1px solid #fca5a5',
    label: '✘ ' + t('admin.verdictInvalid'),
  };
  return {
    background: darkMode ? 'rgba(245, 158, 11, 0.2)' : '#fef3c7',
    color: darkMode ? '#fcd34d' : '#92400e',
    border: darkMode ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid #fcd34d',
    label: '? ' + t('admin.verdictUncertain'),
  };
}

export function roleRowTint(role, darkMode, isTeacher) {
  if (role === 'HEAD_ADMIN') return darkMode ? 'rgba(124, 58, 237, 0.15)' : '#f3e8ff';
  if (role === 'ADMIN')      return darkMode ? 'rgba(245, 158, 11, 0.12)' : '#fff7e0';
  if (isTeacher)             return darkMode ? 'rgba(59, 130, 246, 0.12)' : '#e0f2fe';
  return 'transparent';
}

// ── Componente reutilizabile ─────────────────────────────────────────────────
export function Th({ children, style }) {
  return (
    <th
      style={{
        padding: '10px 12px', textAlign: 'left',
        borderBottom: '2px solid rgba(168, 85, 247, 0.25)',
        fontSize: 12, fontWeight: 600,
        color: 'var(--th-color, #6b6375)', textTransform: 'uppercase', letterSpacing: 0.4,
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {children}
    </th>
  );
}
export function Td({ children, style }) {
  return (
    <td
      style={{
        padding: '10px 12px',
        borderBottom: '1px solid rgba(168, 85, 247, 0.12)',
        fontSize: 13, verticalAlign: 'middle',
        ...style,
      }}
    >
      {children}
    </td>
  );
}
export function Field({ label, value, onChange, type = 'text', required = false }) {
  return (
    <label style={labelStyle}>
      {label}
      <input type={type} value={value} onChange={e => onChange(e.target.value)} required={required} style={inputStyle} />
    </label>
  );
}
export function SearchBar({ value, onChange, placeholder }) {
  return (
    <input
      type="search"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{ padding: '7px 10px', border: '1px solid #ccc', borderRadius: 4, fontSize: 14, width: 280, marginBottom: 16, boxSizing: 'border-box' }}
    />
  );
}
export function Empty({ label, message }) {
  return <p style={{ color: '#999', padding: '16px 0' }}>{message || '—'}{label ? ` ("${label}")` : ''}</p>;
}
export function Dash() {
  return <span style={{ color: '#bbb' }}>—</span>;
}

export function AIVerdictBadge({ verdict, text, darkMode, t = tDefault }) {
  const v = aiVerdictStyle(verdict, darkMode, t);
  const hasText = !!text;
  const badgeRef = useRef(null);
  const [coords, setCoords] = useState(null);

  function openTooltip() {
    if (!hasText || !badgeRef.current) return;
    const r = badgeRef.current.getBoundingClientRect();
    setCoords({ top: r.bottom + 6, left: r.left });
  }
  function closeTooltip() { setCoords(null); }

  return (
    <>
      <span
        ref={badgeRef}
        onMouseEnter={openTooltip}
        onMouseLeave={closeTooltip}
        style={{
          ...badgeBase,
          background: v.background, color: v.color, border: v.border,
          cursor: hasText ? 'help' : 'default',
          padding: '4px 10px', fontWeight: 600,
        }}
      >
        {v.label}
      </span>
      {coords && createPortal(
        <div
          style={{
            position: 'fixed',
            top: coords.top, left: coords.left,
            zIndex: 2000,
            minWidth: 220, maxWidth: 360,
            padding: '10px 12px', borderRadius: 8,
            background: darkMode ? 'rgba(30, 15, 55, 0.97)' : '#ffffff',
            color: darkMode ? '#e8e0ff' : '#222',
            border: darkMode ? '1px solid rgba(168, 85, 247, 0.5)' : '1px solid rgba(0, 0, 0, 0.12)',
            boxShadow: darkMode ? '0 8px 24px rgba(0,0,0,0.5)' : '0 8px 24px rgba(0,0,0,0.15)',
            fontSize: 12, lineHeight: 1.5, whiteSpace: 'normal', pointerEvents: 'none',
          }}
        >
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6, color: v.color, marginBottom: 4 }}>
            {t('admin.verdict')}
          </div>
          {text}
        </div>,
        document.body
      )}
    </>
  );
}

// ── Stiluri partajate ────────────────────────────────────────────────────────
export const tableStyle = { width: '100%', borderCollapse: 'collapse' };
export const tabBtn     = { padding: '8px 18px', border: '1px solid rgba(168, 85, 247, 0.4)', borderRadius: 4, background: 'transparent', color: 'inherit', cursor: 'pointer', fontSize: 14 };
export const activeTab  = { ...tabBtn, background: '#7c3aed', color: 'white', border: '1px solid #7c3aed' };
export const btnEditStyle = (darkMode) => ({
  padding: '3px 8px', borderRadius: 4, cursor: 'pointer', fontSize: 12,
  border: darkMode ? '1px solid rgba(168, 85, 247, 0.45)' : '1px solid #c4b5fd',
  background: darkMode ? 'rgba(168, 85, 247, 0.15)' : '#f5f3ff',
  color: darkMode ? '#e8ddff' : '#5b21b6',
});
export const btnDelete    = { padding: '3px 8px', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12, background: '#dc3545', color: 'white' };
export const btnPromoteStyle = { padding: '3px 8px', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12, background: '#f59e0b', color: '#3b2a00', fontWeight: 600 };
export const btnDemoteStyle  = { padding: '3px 8px', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12, background: '#64748b', color: 'white' };
export const btnRestoreStyle = { padding: '3px 8px', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12, background: '#10b981', color: 'white', fontWeight: 500 };
export const btnFalseReport  = { padding: '6px 10px', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12, background: '#10b981', color: 'white', fontWeight: 600 };
export const btnDeleteNote   = { padding: '6px 10px', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12, background: '#dc2626', color: 'white', fontWeight: 600 };
export const btnRestartServer = { padding: '10px 18px', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14, background: '#dc2626', color: 'white', fontWeight: 600 };
export const badgeBase    = { display: 'inline-block', padding: '2px 8px', borderRadius: 10, fontSize: 12, fontWeight: 500 };
export const modalOverlay = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 };
export const modalBoxStyle = (darkMode) => ({
  background: darkMode ? '#1f1530' : 'white',
  color: darkMode ? '#e8e0ff' : '#222',
  padding: 24, borderRadius: 8, maxWidth: 460, width: '100%',
  margin: '0 16px', maxHeight: '90vh', overflowY: 'auto',
  border: darkMode ? '1px solid rgba(168, 85, 247, 0.35)' : '1px solid #e5e7eb',
});
export const labelStyle   = { display: 'block', marginBottom: 12, fontWeight: 500 };
export const inputStyle   = { display: 'block', width: '100%', padding: 8, marginTop: 4, border: '1px solid #ccc', borderRadius: 4, fontSize: 14, boxSizing: 'border-box' };
export const btnPrimary   = { padding: '8px 16px', background: '#7c3aed', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' };
export const btnSecondary = { padding: '8px 16px', background: 'transparent', color: 'inherit', border: '1px solid #ccc', borderRadius: 4, cursor: 'pointer' };

export const requestCardStyle = (darkMode) => ({
  padding: 14, borderRadius: 8,
  border: darkMode ? '1px solid rgba(168, 85, 247, 0.3)' : '1px solid #e5e7eb',
  background: darkMode ? 'rgba(20, 8, 50, 0.4)' : 'rgba(255, 255, 255, 0.7)',
});
export const textareaInline = (darkMode) => ({
  width: '100%', padding: 8, borderRadius: 6, fontSize: 13, fontFamily: 'inherit',
  border: darkMode ? '1px solid rgba(168, 85, 247, 0.35)' : '1px solid #d1d5db',
  background: darkMode ? 'rgba(0,0,0,0.25)' : '#fff',
  color: darkMode ? '#e8e0ff' : '#222',
  resize: 'vertical', boxSizing: 'border-box',
});
export const approveBtn = {
  padding: '6px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600,
  background: '#16a34a', color: 'white', border: 'none',
};
export const rejectBtn = {
  padding: '6px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600,
  background: '#dc2626', color: 'white', border: 'none',
};
export const handledRowStyle = (status, darkMode) => ({
  padding: '8px 12px', borderRadius: 6,
  background: status === 'APPROVED'
    ? (darkMode ? 'rgba(16, 185, 129, 0.08)' : '#ecfdf5')
    : (darkMode ? 'rgba(220, 38, 38, 0.08)' : '#fef2f2'),
  borderLeft: status === 'APPROVED' ? '3px solid #16a34a' : '3px solid #dc2626',
});
export const generateFormStyle = (darkMode) => ({
  padding: 14, borderRadius: 10,
  border: darkMode ? '1px solid rgba(168, 85, 247, 0.3)' : '1px solid #e5e7eb',
  background: darkMode ? 'rgba(20, 8, 50, 0.35)' : 'rgba(255, 255, 255, 0.6)',
});
export const generatedCodeStyle = (darkMode) => ({
  marginTop: 12, padding: 12, borderRadius: 8,
  background: darkMode ? 'rgba(16, 185, 129, 0.12)' : '#d1fae5',
  border: darkMode ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid #34d399',
  color: darkMode ? '#6ee7b7' : '#065f46',
});
export const btnRevokeStyle = {
  padding: '4px 10px', borderRadius: 4, cursor: 'pointer', fontSize: 12,
  background: 'transparent', color: '#dc2626', border: '1px solid #dc2626',
};
