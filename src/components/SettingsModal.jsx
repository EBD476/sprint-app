import { useEffect, useState } from 'react'
import { usePrefs, PANEL_IDS } from '../store/PrefsContext'
import { useLlm } from '../store/LlmContext'
import { useI18n } from '../i18n'

export default function SettingsModal() {
  const {
    settingsOpen,
    closeSettings,
    settingsTab,
    setSettingsTab,
    theme,
    setTheme,
    locale,
    setLocale,
    windowStyle,
    setWindowStyle,
    panels,
    togglePanel,
    resetPanels,
  } = usePrefs()
  const { saveSettings, baseUrl, apiKey, model, mode, proxyUrl, proxyToken } = useLlm()
  const { t } = useI18n()
  const [draft, setDraft] = useState({ baseUrl, apiKey, model, mode, proxyUrl, proxyToken })

  useEffect(() => {
    if (settingsOpen) setDraft({ baseUrl, apiKey, model, mode, proxyUrl, proxyToken })
  }, [settingsOpen, baseUrl, apiKey, model, mode, proxyUrl, proxyToken])

  if (!settingsOpen) return null

  const set = (field) => (e) => setDraft((d) => ({ ...d, [field]: e.target.value }))

  const handleSave = () => {
    saveSettings({
      baseUrl: draft.baseUrl.trim() || 'https://api.openai.com/v1',
      apiKey: draft.apiKey.trim(),
      model: draft.model.trim() || 'gpt-4o-mini',
      mode: draft.mode === 'proxy' ? 'proxy' : 'direct',
      proxyUrl: draft.proxyUrl.trim() || 'http://localhost:8787/v1/chat/completions',
      proxyToken: draft.proxyToken.trim(),
    })
    closeSettings()
  }

  return (
    <div className="modal-overlay" onClick={closeSettings}>
      <div
        className="modal settings-modal"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>{t('settings.title')}</h2>
          <button className="modal-close" onClick={closeSettings} aria-label={t('close.aria')}>
            ×
          </button>
        </div>

        <div className="settings-tabs" role="tablist">
          <button
            className={`settings-tab${settingsTab === 'appearance' ? ' active' : ''}`}
            onClick={() => setSettingsTab('appearance')}
          >
            🎨 {t('settings.appearance')}
          </button>
          <button
            className={`settings-tab${settingsTab === 'dashboard' ? ' active' : ''}`}
            onClick={() => setSettingsTab('dashboard')}
          >
            📊 {t('settings.dashboard')}
          </button>
          <button
            className={`settings-tab${settingsTab === 'llm' ? ' active' : ''}`}
            onClick={() => setSettingsTab('llm')}
          >
            ⚙ {t('nav.llmSettings')}
          </button>
        </div>

        {settingsTab === 'appearance' ? (
          <div className="settings-body">
            <div className="prefs-row">
              <div className="prefs-label">{t('prefs.theme')}</div>
              <div className="prefs-options">
                <button
                  type="button"
                  className={`pref-btn${theme === 'light' ? ' active' : ''}`}
                  onClick={() => setTheme('light')}
                >
                  ☀ {t('prefs.light')}
                </button>
                <button
                  type="button"
                  className={`pref-btn${theme === 'dark' ? ' active' : ''}`}
                  onClick={() => setTheme('dark')}
                >
                  🌙 {t('prefs.dark')}
                </button>
              </div>
            </div>
            <div className="prefs-row">
              <div className="prefs-label">{t('prefs.language')}</div>
              <div className="prefs-options">
                <button
                  type="button"
                  className={`pref-btn${locale === 'en' ? ' active' : ''}`}
                  onClick={() => setLocale('en')}
                >
                  English
                </button>
                <button
                  type="button"
                  className={`pref-btn${locale === 'fa' ? ' active' : ''}`}
                  onClick={() => setLocale('fa')}
                >
                  فارسی
                </button>
              </div>
            </div>
            {/* <div className="prefs-row"> */}
              {/* <div className="prefs-label">{t('prefs.windowStyle')}</div> */}
              {/* <div className="prefs-options">
                <button
                  type="button"
                  className={`pref-btn${windowStyle === 'soft' ? ' active' : ''}`}
                  onClick={() => setWindowStyle('soft')}
                >
                  {t('prefs.windowSoft')}
                </button>
                <button
                  type="button"
                  className={`pref-btn${windowStyle === 'glass' ? ' active' : ''}`}
                  onClick={() => setWindowStyle('glass')}
                >
                  {t('prefs.windowGlass')}
                </button>
              </div> */}
            {/* </div> */}
          </div>
        ) : settingsTab === 'dashboard' ? (
          <div className="settings-body">
            <p className="muted small modal-note">{t('settings.dashboardHint')}</p>
            <div>
              <div className="prefs-label">{t('settings.dashboardPanels')}</div>
              <div className="panel-toggles">
                {PANEL_IDS.map((id) => (
                  <button
                    key={id}
                    type="button"
                    className={`panel-toggle${panels[id] ? ' active' : ''}`}
                    onClick={() => togglePanel(id)}
                  >
                    {t(`panel.${id}`)}
                  </button>
                ))}
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn ghost" onClick={resetPanels}>
                {t('settings.resetPanels')}
              </button>
              <button className="btn primary" onClick={closeSettings}>
                {t('settings.done')}
              </button>
            </div>
          </div>
        ) : (
          <div className="settings-body">
            <p className="muted small modal-note">
              {draft.mode === 'proxy' ? t('llm.proxyNote') : t('llm.note')}
            </p>
            <div className="prefs-row">
              <div className="prefs-label">{t('llm.connection')}</div>
              <div className="prefs-options">
                <button
                  type="button"
                  className={`pref-btn${draft.mode === 'direct' ? ' active' : ''}`}
                  onClick={() => setDraft((d) => ({ ...d, mode: 'direct' }))}
                >
                  {t('llm.direct')}
                </button>
                <button
                  type="button"
                  className={`pref-btn${draft.mode === 'proxy' ? ' active' : ''}`}
                  onClick={() => setDraft((d) => ({ ...d, mode: 'proxy' }))}
                >
                  {t('llm.proxy')}
                </button>
              </div>
            </div>

            {draft.mode === 'direct' ? (
              <>
                <div className="form-row">
                  <label>
                    {t('llm.baseUrl')}
                    <input value={draft.baseUrl} onChange={set('baseUrl')} placeholder="https://api.openai.com/v1" />
                  </label>
                  <label>
                    {t('llm.model')}
                    <input value={draft.model} onChange={set('model')} placeholder="gpt-4o-mini" />
                  </label>
                </div>
                <div className="form-row">
                  <label>
                    {t('llm.apiKey')}
                    <input
                      type="password"
                      value={draft.apiKey}
                      onChange={set('apiKey')}
                      placeholder="sk-…"
                      autoComplete="off"
                    />
                  </label>
                </div>
              </>
            ) : (
              <>
                <div className="form-row">
                  <label>
                    {t('llm.proxyUrl')}
                    <input
                      value={draft.proxyUrl}
                      onChange={set('proxyUrl')}
                      placeholder="http://localhost:8787/v1/chat/completions"
                    />
                  </label>
                  <label>
                    {t('llm.model')}
                    <input value={draft.model} onChange={set('model')} placeholder="gpt-4o-mini" />
                  </label>
                </div>
                <div className="form-row">
                  <label>
                    {t('llm.proxyToken')}
                    <input
                      type="password"
                      value={draft.proxyToken}
                      onChange={set('proxyToken')}
                      placeholder="optional"
                      autoComplete="off"
                    />
                  </label>
                </div>
              </>
            )}

            <div className="modal-actions">
              <button className="btn ghost" onClick={closeSettings}>
                {t('llm.cancel')}
              </button>
              <button className="btn primary" onClick={handleSave}>
                {t('llm.save')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
