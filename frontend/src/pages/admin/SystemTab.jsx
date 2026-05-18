// Tab "Sistem" — configurări sistem + repornire server.
import { useTranslation } from 'react-i18next';
import { labelStyle, inputStyle, btnPrimary, btnRestartServer } from './shared.jsx';

export default function SystemTab({
  systemConfig, setSystemConfig,
  configSaving, configMsg, saveSystemConfig, restartServer,
  darkMode,
}) {
  const { t } = useTranslation();

  return (
    <div style={{ maxWidth: 560 }}>
      <h2 style={{ marginTop: 0 }}>{t('admin.systemTitle')}</h2>
      <form onSubmit={saveSystemConfig}>
        <label style={{ ...labelStyle, display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={systemConfig.bypassEmailVerification === 'true'}
            onChange={e => setSystemConfig(c => ({
              ...c,
              bypassEmailVerification: e.target.checked ? 'true' : 'false',
            }))}
            style={{ marginTop: 4, accentColor: '#a855f7', cursor: 'pointer' }}
          />
          <span>
            <strong>{t('admin.emailVerification')}</strong>
          </span>
        </label>

        <label style={labelStyle}>
          {t('admin.deviceVerification')}
          <input
            type="number"
            min={-1}
            max={365}
            value={systemConfig.adminDeviceVerificationDays}
            onChange={e => setSystemConfig(c => ({ ...c, adminDeviceVerificationDays: e.target.value }))}
            placeholder="7"
            style={inputStyle}
          />
        </label>

        <label style={labelStyle}>
          {t('banned.willBeDeleted')}
          <input
            type="number"
            min={1}
            max={365}
            value={systemConfig.banAutoDeleteDays}
            onChange={e => setSystemConfig(c => ({ ...c, banAutoDeleteDays: e.target.value }))}
            placeholder="14"
            style={inputStyle}
          />
        </label>

        {configMsg && (
          <p style={{ color: configMsg.type === 'ok' ? '#155724' : '#b91c1c' }}>
            {configMsg.text}
          </p>
        )}
        <button type="submit" disabled={configSaving} style={btnPrimary}>
          {configSaving ? t('banned.submitting') : t('common.save')}
        </button>
      </form>

      <hr style={{ border: 'none', borderTop: darkMode ? '1px solid rgba(168,85,247,0.2)' : '1px solid #e5e7eb', margin: '24px 0' }} />

      <h2 style={{ fontSize: 18, margin: '0 0 8px' }}>{t('admin.systemTitle')}</h2>
      <button onClick={restartServer} style={btnRestartServer}>
        ⟳ Restart
      </button>
    </div>
  );
}
