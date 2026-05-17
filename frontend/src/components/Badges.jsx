// Insigne afișate lângă numele unui utilizator: profesor verificat și autor.
// Folosite în comentarii, pagina notei, similar notes etc.

export function TeacherBadge({ size = 14, inline = true }) {
  const style = {
    display: inline ? 'inline-flex' : 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: size, height: size,
    marginLeft: 4,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #22c55e 0%, #15803d 100%)',
    color: 'white',
    fontSize: Math.max(8, Math.round(size * 0.65)),
    fontWeight: 800,
    lineHeight: 1,
    boxShadow: '0 1px 3px rgba(34, 197, 94, 0.45)',
    verticalAlign: 'middle',
    flexShrink: 0,
  };
  return (
    <span title="Profesor verificat" aria-label="Profesor verificat" style={style}>
      ✓
    </span>
  );
}

export function AuthorBadge({ inline = true }) {
  const style = {
    display: inline ? 'inline-flex' : 'flex',
    alignItems: 'center',
    marginLeft: 6,
    padding: '1px 7px',
    borderRadius: 999,
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    color: 'white',
    background: 'linear-gradient(135deg, #f472b6 0%, #a855f7 100%)',
    boxShadow: '0 1px 3px rgba(168, 85, 247, 0.4)',
    verticalAlign: 'middle',
    flexShrink: 0,
  };
  return (
    <span title="Autorul notiței" aria-label="Autor" style={style}>
      Autor
    </span>
  );
}

// Helper pentru randare consistentă a numelui cu badge-uri.
// Folosit oriunde apare un nume de user în context-ul unei notițe.
export function UserNameWithBadges({ user, isAuthor, isTeacher, style }) {
  const teacherFlag = isTeacher ?? user?.isTeacher;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', ...style }}>
      <span>{user?.username || 'Anonim'}</span>
      {teacherFlag && <TeacherBadge />}
      {isAuthor && <AuthorBadge />}
    </span>
  );
}
