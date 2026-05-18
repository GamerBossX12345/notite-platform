// Tab "Utilizatori" — listă cu role-uri, acțiuni de editare/promovare/ștergere.
import { useTranslation } from 'react-i18next';
import {
  Th, Td, SearchBar, Empty, Dash,
  ROLE_BADGE, TEACHER_BADGE,
  roleRowTint,
  tableStyle, btnEditStyle, btnPromoteStyle, btnDemoteStyle, btnDelete, badgeBase,
} from './shared.jsx';

export default function UsersTab({
  users, filteredUsers, userQuery, setUserQuery,
  user, isHeadAdmin, darkMode,
  openEditUser, setUserRole, deleteUser,
}) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language?.startsWith('en') ? 'en-US' : 'ro-RO';

  return (
    <>
      <SearchBar value={userQuery} onChange={setUserQuery} placeholder={t('admin.searchUsers')} />
      {filteredUsers.length === 0 ? <Empty label={userQuery} message={t('admin.empty')} /> : (
        <div style={{ overflowX: 'auto' }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <Th>{t('settings.name')}</Th>
                <Th>{t('common.username')}</Th>
                <Th>{t('common.type')}</Th>
                <Th>{t('common.email')}</Th>
                <Th>{t('auth.school')}</Th>
                <Th>{t('common.grade')}</Th>
                <Th>{t('profile.reputation')}</Th>
                <Th>{t('users.notes')}</Th>
                <Th>{t('note.comments')}</Th>
                <Th>{t('users.joined')}</Th>
                <Th>{t('common.actions')}</Th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(u => {
                const badge = ROLE_BADGE[u.role] || (u.isTeacher ? TEACHER_BADGE : null);
                const isSelf = u.id === user.id;
                return (
                  <tr key={u.id} style={{ background: roleRowTint(u.role, darkMode, u.isTeacher) }}>
                    <Td>{u.name || <Dash />}</Td>
                    <Td><strong>{u.username}</strong></Td>
                    <Td>
                      {badge ? (
                        <span style={{ ...badgeBase, background: badge.bg, color: badge.color }}>
                          {badge.label}
                        </span>
                      ) : (
                        <span style={{ color: darkMode ? '#aaa' : '#666', fontSize: 12 }}>—</span>
                      )}
                    </Td>
                    <Td>{u.email}</Td>
                    <Td>{u.school || <Dash />}</Td>
                    <Td>{u.grade || <Dash />}</Td>
                    <Td>{u.reputation}</Td>
                    <Td>{u._count.notes}</Td>
                    <Td>{u._count.comments}</Td>
                    <Td>{new Date(u.createdAt).toLocaleDateString(locale)}</Td>
                    <Td>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        <button onClick={() => openEditUser(u)} style={btnEditStyle(darkMode)}>{t('common.edit')}</button>
                        {isHeadAdmin && !isSelf && u.role === 'USER' && (
                          <button onClick={() => setUserRole(u, 'ADMIN')} style={btnPromoteStyle}>
                            ↑ {t('admin.promote')}
                          </button>
                        )}
                        {isHeadAdmin && !isSelf && u.role === 'ADMIN' && (
                          <button onClick={() => setUserRole(u, 'USER')} style={btnDemoteStyle}>
                            ↓ {t('admin.demote')}
                          </button>
                        )}
                        {u.role !== 'HEAD_ADMIN' && (u.role !== 'ADMIN' || isHeadAdmin) && !isSelf && (
                          <button onClick={() => deleteUser(u.id)} style={btnDelete}>{t('common.delete')}</button>
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
    </>
  );
}
