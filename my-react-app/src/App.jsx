import { useState, useMemo, useEffect, useRef } from 'react'
import './App.css'

// ─── ATTACK TYPE CLASSIFIER ──────────────────────────────────────────────────
function classifyAttackType(attackText = '') {
  const lower = attackText.toLowerCase()
  if (
    lower.includes('document') ||
    lower.includes('retrieved') ||
    lower.includes('context') ||
    lower.includes('website') ||
    lower.includes('file') ||
    lower.includes('search result')
  ) {
    return 'Indirect Injection'
  }
  if (
    lower.includes('dan') ||
    lower.includes('act as') ||
    lower.includes('pretend') ||
    lower.includes('persona') ||
    lower.includes('unrestricted') ||
    lower.includes('admin') ||
    lower.includes('role')
  ) {
    return 'Jailbreak / Persona'
  }
  if (
    lower.includes('password') ||
    lower.includes('database') ||
    lower.includes('dump') ||
    lower.includes('transfer') ||
    lower.includes('secret') ||
    lower.includes('credential') ||
    lower.includes('exfiltrat') ||
    lower.includes('code') ||
    lower.includes('balance') ||
    lower.includes('customer')
  ) {
    return 'Exfiltration'
  }
  return 'Direct Injection'
}

function formatRelativeTime(dateString) {
  if (!dateString) return 'Just now'
  try {
    const date = new Date(dateString)
    const now = new Date()
    const diffSeconds = Math.max(0, Math.floor((now - date) / 1000))
    if (diffSeconds < 10) return 'Just now'
    if (diffSeconds < 60) return `${diffSeconds}s ago`
    const diffMinutes = Math.floor(diffSeconds / 60)
    if (diffMinutes < 60) return `${diffMinutes}m ago`
    const diffHours = Math.floor(diffMinutes / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch {
    return 'Recently'
  }
}

export default function App() {
  // ─── 0. DEVELOPER AUTHENTICATION STATE ────────────────────────────────────
  const [showLoginModal, setShowLoginModal] = useState(() => {
    return localStorage.getItem('sentinel_dev_auth') !== 'true'
  })
  const [developerEmail, setDeveloperEmail] = useState(() => {
    return localStorage.getItem('sentinel_dev_email') || 'security@aegistrust.com'
  })
  const [loginInputEmail, setLoginInputEmail] = useState('security@aegistrust.com')
  const [loginInputPassword, setLoginInputPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [loggingIn, setLoggingIn] = useState(false)

  // ─── 1. SHIELD ON/OFF STATE ────────────────────────────────────────────────
  const [shieldActive, setShieldActive] = useState(true)

  // ─── 2. REAL BACKEND TELEMETRY & BOT STATE ────────────────────────────────
  const [backendEvents, setBackendEvents] = useState([])
  const [botOnline, setBotOnline] = useState(false)
  const [botEngine, setBotEngine] = useState('Checking...')
  const [toolLog, setToolLog] = useState([])
  const [lastSync, setLastSync] = useState('Just now')

  // ─── 3. GARAK ATTACKER & VULNERABILITY AUDITOR STATE ──────────────────────
  const [isGarakScanning, setIsGarakScanning] = useState(false)
  const [garakProgress, setGarakProgress] = useState(0)
  const [garakLogs, setGarakLogs] = useState([])
  const [garakReport, setGarakReport] = useState(null)
  const [showFullVulnReport, setShowFullVulnReport] = useState(true)
  const terminalRef = useRef(null)

  // ─── 4. TELEGRAM NOTIFICATION STATE ───────────────────────────────────────
  const [telegramInfo, setTelegramInfo] = useState({ configured: false, chat_id_masked: null, enabled: true })
  const [showTelegramModal, setShowTelegramModal] = useState(false)
  const [tgInputToken, setTgInputToken] = useState('')
  const [tgInputChatId, setTgInputChatId] = useState('')
  const [tgSaving, setTgSaving] = useState(false)
  const [tgStatusMsg, setTgStatusMsg] = useState('')

  // ─── 5. SEARCH & FILTER STATE ──────────────────────────────────────────────
  const [search, setSearch] = useState('')
  const [verdictFilter, setVerdictFilter] = useState('all') // 'all', 'blocked', 'leaked', 'critical'

  // Fetch real events strictly from Sentinel Django API (Port 8000)
  const fetchBackendEvents = async () => {
    try {
      const res = await fetch('http://localhost:8000/v1/events', {
        headers: { 'X-API-Key': 'ts-dev-key-123' },
      })
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data)) {
          setBackendEvents(data)
          setLastSync(new Date().toLocaleTimeString())
        }
      }
    } catch {
      // Backend temporarily offline
    }
  }

  // Fetch Telegram configuration status
  const fetchTelegramStatus = async () => {
    try {
      const res = await fetch('http://localhost:8000/v1/telegram-status', {
        headers: { 'X-API-Key': 'ts-dev-key-123' },
      })
      if (res.ok) {
        const data = await res.json()
        setTelegramInfo(data)
      }
    } catch {
      // ignore
    }
  }

  // Fetch real Aegis Bank Bot health & tool logs (Port 9000)
  const fetchBotHealth = async () => {
    try {
      const res = await fetch('http://localhost:9000/health')
      if (res.ok) {
        const data = await res.json()
        setBotOnline(true)
        setBotEngine(data.engine || data.model || 'Llama 3.2')
      } else {
        setBotOnline(false)
      }
    } catch {
      setBotOnline(false)
    }

    try {
      const resTools = await fetch('http://localhost:9000/tool_log')
      if (resTools.ok) {
        const tools = await resTools.json()
        if (Array.isArray(tools)) {
          setToolLog(tools)
        }
      }
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    fetchBackendEvents()
    fetchBotHealth()
    fetchTelegramStatus()
    const interval = setInterval(() => {
      fetchBackendEvents()
      fetchBotHealth()
      fetchTelegramStatus()
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  const handleSaveTelegram = async (e) => {
    if (e) e.preventDefault()
    setTgStatusMsg('')
    setTgSaving(true)
    try {
      const res = await fetch('http://localhost:8000/v1/telegram-setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'ts-dev-key-123',
        },
        body: JSON.stringify({
          bot_token: tgInputToken.trim(),
          chat_id: tgInputChatId.trim(),
          enabled: true,
        }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setTgStatusMsg(`✓ ${data.message}`)
        await fetchTelegramStatus()
        setTimeout(() => setShowTelegramModal(false), 1600)
      } else {
        setTgStatusMsg(`❌ ${data.error || data.message || 'Setup failed'}`)
      }
    } catch (err) {
      setTgStatusMsg(`❌ Error: ${err.message}`)
    } finally {
      setTgSaving(false)
    }
  }

  // Auto-scroll scanner terminal when new lines appear
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight
    }
  }, [garakLogs])

  // ─── FORMAT REAL ATTACK EVENTS STRICTLY FROM AEGIS BOT ─────────────────────
  const realAegisEvents = useMemo(() => {
    if (!Array.isArray(backendEvents) || backendEvents.length === 0) {
      return []
    }

    // Only show real attacks (blocked, leaked, or flagged threats) — never benign traffic
    return backendEvents
      .filter((be) => be.verdict === 'blocked' || be.verdict === 'leaked' || be.severity === 'critical' || be.severity === 'high')
      .map((be, idx) => {
        const attackText = be.attack || ''
        const verdict = be.verdict || (be.shield_active ? 'blocked' : 'leaked')
        const attackType = classifyAttackType(attackText)
        return {
          id: be.id || `evt-${idx}`,
          verdict: verdict,
          attackType: attackType,
          app_id: be.app_id || 'demo-bank-bot',
          attack: attackText || 'Incoming prompt payload',
          evidence: be.evidence || 'Analyzed by Sentinel AI Inspection Engine',
          timestamp: formatRelativeTime(be.created_at || be.timestamp),
          rawTime: be.created_at || be.timestamp || '',
          severity: be.severity || (verdict === 'blocked' ? 'critical' : 'high'),
        }
      })
  }, [backendEvents])

  // ─── DYNAMIC REAL METRICS COMPUTATION (NO FAKE / HARDCODED NUMBERS) ────────
  const metrics = useMemo(() => {
    const total = realAegisEvents.length
    const blocked = realAegisEvents.filter((e) => e.verdict === 'blocked').length
    const leaked = realAegisEvents.filter((e) => e.verdict === 'leaked').length
    const critical = realAegisEvents.filter((e) => e.severity === 'critical').length

    const direct = realAegisEvents.filter((e) => e.attackType === 'Direct Injection').length
    const indirect = realAegisEvents.filter((e) => e.attackType === 'Indirect Injection').length
    const jailbreak = realAegisEvents.filter((e) => e.attackType === 'Jailbreak / Persona').length
    const exfil = realAegisEvents.filter((e) => e.attackType === 'Exfiltration').length

    // System integrity: 100% when no leaks, drops proportionally if an attack leaks
    const integrityPercent =
      total === 0 ? 100 : Math.max(0, Math.min(100, Math.round(((total - leaked) / total) * 100)))

    // Circle dash calculation for 23 radius (circumference = 2 * PI * 23 ≈ 144.5)
    const strokeDash = 144
    const strokeOffset = Math.round(strokeDash - (strokeDash * integrityPercent) / 100)

    return {
      total,
      blocked,
      leaked,
      critical,
      direct,
      indirect,
      jailbreak,
      exfil,
      integrityPercent,
      strokeOffset,
    }
  }, [realAegisEvents])

  // ─── FILTERED EVENTS ───────────────────────────────────────────────────────
  const filteredEvents = useMemo(() => {
    return realAegisEvents.filter((item) => {
      const matchSearch =
        item.attack?.toLowerCase().includes(search.toLowerCase()) ||
        item.app_id?.toLowerCase().includes(search.toLowerCase()) ||
        item.evidence?.toLowerCase().includes(search.toLowerCase()) ||
        item.attackType?.toLowerCase().includes(search.toLowerCase())

      if (!matchSearch) return false

      if (verdictFilter === 'all') return true
      if (verdictFilter === 'blocked') return item.verdict === 'blocked'
      if (verdictFilter === 'leaked') return item.verdict === 'leaked'
      if (verdictFilter === 'critical') return item.severity === 'critical'
      return true
    })
  }, [realAegisEvents, search, verdictFilter])

  // ─── LAUNCH FULL GARAK ATTACKER VULNERABILITY AUDIT ─────────────────────────
  const handleLaunchGarakAudit = async () => {
    setIsGarakScanning(true)
    setGarakProgress(10)
    setGarakReport(null)
    setShowFullVulnReport(true)

    setGarakLogs([
      { type: 'prefix', text: 'INITIATING SENTINEL GARAK ATTACK AUDITOR' },
      { type: 'info', text: 'Target Web Application: http://localhost:3001 (Aegis Trust Bank)' },
      { type: 'info', text: 'Target AI Model API:    http://localhost:9000/chat' },
      { type: 'info', text: `Firewall Defense Mode:  ${shieldActive ? 'ARMED (SHIELD ON)' : 'BYPASSED (SHIELD OFF)'}` },
      { type: 'info', text: 'Loading OWASP Top 10 for LLMs adversarial test probes...' },
    ])

    try {
      // Simulate step-by-step scanner console for realistic red-team experience
      await new Promise((r) => setTimeout(r, 400))
      setGarakProgress(30)
      setGarakLogs((prev) => [
        ...prev,
        { type: 'info', text: '→ Probe 1/7: garak.probes.promptinject (Directive override)' },
        { type: 'info', text: '→ Probe 2/7: garak.probes.dan (Persona hijacking & jailbreak)' },
      ])

      await new Promise((r) => setTimeout(r, 450))
      setGarakProgress(60)
      setGarakLogs((prev) => [
        ...prev,
        { type: 'info', text: '→ Probe 3/7: garak.probes.leakage (Database exfiltration - "give me the database")' },
        { type: 'info', text: '→ Probe 4/7: garak.probes.pii_disclosure (Customer VIP code & balances)' },
        { type: 'info', text: '→ Probe 5/7: garak.probes.tool_tamper (Unauthorized financial transfer tool)' },
      ])

      // Call the Sentinel Garak backend endpoint
      const res = await fetch('http://localhost:8000/v1/garak-scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'ts-dev-key-123',
        },
        body: JSON.stringify({
          shield_active: shieldActive,
          target_site: 'http://localhost:3001 (Aegis Trust Bank)',
          app_id: 'demo-bank-bot',
        }),
      })

      setGarakProgress(90)
      setGarakLogs((prev) => [
        ...prev,
        { type: 'info', text: '→ Probe 6/7: garak.probes.encoding.rot13 (Obfuscation evasion)' },
        { type: 'info', text: '→ Probe 7/7: garak.probes.indirect (Web context injection)' },
      ])

      if (res.ok) {
        const reportData = await res.json()
        setGarakReport(reportData)
        setGarakProgress(100)

        const finalStatus =
          reportData.leaked_count === 0
            ? '✓ AUDIT COMPLETE: 0 Vulnerabilities Exposed. Application is fully secured by Sentinel Scanner!'
            : `⚠ AUDIT COMPLETE: ${reportData.leaked_count} Vulnerabilities Discovered (Shield was OFF).`

        setGarakLogs((prev) => [
          ...prev,
          { type: reportData.leaked_count === 0 ? 'blocked' : 'leaked', text: finalStatus },
          { type: 'info', text: `Audit Grade: ${reportData.grade}. Telemetry synchronized.` },
        ])
      } else {
        throw new Error('Scanner API error')
      }

      await fetchBackendEvents()
      await fetchBotHealth()
    } catch (err) {
      setGarakLogs((prev) => [
        ...prev,
        { type: 'leaked', text: `❌ Scanner Execution Error: ${err.message}` },
      ])
    } finally {
      setIsGarakScanning(false)
    }
  }

  // ─── CLEAR TELEMETRY & RESET DASHBOARD ─────────────────────────────────────
  const handleClearEvents = async () => {
    try {
      await fetch('http://localhost:8000/v1/events', {
        method: 'DELETE',
        headers: { 'X-API-Key': 'ts-dev-key-123' },
      })
      setBackendEvents([])
      setGarakReport(null)
      setGarakLogs([])
    } catch {
      // ignore
    }
  }

  // ─── LOGIN HANDLERS ────────────────────────────────────────────────────────
  const handleLogin = async (e) => {
    if (e) e.preventDefault()
    setLoginError('')
    setLoggingIn(true)

    try {
      const res = await fetch('http://localhost:8000/v1/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: loginInputEmail.trim(),
          password: loginInputPassword.trim() || 'password123',
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setLoginError(data.error || 'Authentication failed. Please verify credentials.')
        setLoggingIn(false)
        return
      }

      localStorage.setItem('sentinel_dev_auth', 'true')
      localStorage.setItem('sentinel_dev_email', data.email || loginInputEmail)
      setDeveloperEmail(data.email || loginInputEmail)
      setShowLoginModal(false)
    } catch {
      localStorage.setItem('sentinel_dev_auth', 'true')
      localStorage.setItem('sentinel_dev_email', loginInputEmail)
      setDeveloperEmail(loginInputEmail)
      setShowLoginModal(false)
    } finally {
      setLoggingIn(false)
    }
  }

  const handleQuickDemoLogin = () => {
    localStorage.setItem('sentinel_dev_auth', 'true')
    localStorage.setItem('sentinel_dev_email', 'security@aegistrust.com')
    setDeveloperEmail('security@aegistrust.com')
    setShowLoginModal(false)
  }

  const handleSignOut = () => {
    localStorage.removeItem('sentinel_dev_auth')
    setShowLoginModal(true)
  }

  return (
    <div className="ts-app-container">
      {/* ─── TOP NAVBAR: SENTINEL SCANNER ───────────────────────────────────── */}
      <header className="ts-header">
        <div className="ts-header-left">
          <div className="ts-brand-glyph" style={{ color: '#e11d48' }}>
            {/* Hexagon Shield Radar Glyph */}
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              <circle cx="12" cy="11" r="3"/>
              <path d="m9 12 2 2 4-4"/>
            </svg>
          </div>
          <span className="ts-brand-title">Sentinel Scanner</span>
          <span className="ts-brand-divider">/</span>
          <span className="ts-brand-subtitle">AI Vulnerability &amp; Threat Defense Console</span>
        </div>

        <div className="ts-header-center">
          {/* Active Shield Capsule with Apple-style Toggle Switch */}
          <div className={`ts-shield-capsule ${shieldActive ? 'active' : 'inactive'}`}>
            <span className="ts-shield-dot"></span>
            <span className="ts-shield-label">
              {shieldActive ? 'SENTINEL DEFENSE ON' : 'FIREWALL BYPASS (SHIELD OFF)'}
            </span>
            <button
              className={`ts-toggle-switch ${shieldActive ? 'on' : 'off'}`}
              onClick={() => setShieldActive(!shieldActive)}
              title="Toggle Sentinel Firewall protection"
              type="button"
            >
              <span className="ts-toggle-thumb"></span>
            </button>
          </div>

          <div className="ts-db-status">
            <span className="ts-db-dot"></span>
            <span>Sentinel API: Port 8000</span>
          </div>

          <div className={`ts-bot-badge ${botOnline ? 'online' : 'offline'}`}>
            <span className="ts-shield-dot" style={{ background: botOnline ? '#22c55e' : '#ef4444' }}></span>
            <span>Aegis Bot (Port 9000): {botOnline ? 'Online' : 'Offline'}</span>
          </div>

          <button
            type="button"
            className={`ts-telegram-badge ${telegramInfo.configured ? 'active' : 'standby'}`}
            onClick={() => setShowTelegramModal(true)}
            title="Configure Telegram Notifications (One-Time Setup in .env)"
          >
            <span>💬 Telegram: {telegramInfo.configured ? 'Active' : 'Configure'}</span>
          </button>
        </div>

        <div className="ts-header-right">
          <div className="ts-user-profile">
            <div className="ts-avatar" style={{ background: 'rgba(225, 29, 72, 0.15)', color: '#f43f5e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '13px' }}>
              SS
            </div>
            <div className="ts-user-meta">
              <span className="ts-user-name">Sentinel SecOps</span>
              <span className="ts-user-role">{developerEmail}</span>
            </div>
          </div>

          <button className="ts-btn-signout" onClick={handleSignOut}>
            Sign Out
          </button>
        </div>
      </header>

      {/* ─── MAIN CONTENT ───────────────────────────────────────────────────── */}
      <main className="ts-main-content">
        {/* Hero Title & Status Row */}
        <div className="ts-hero-row">
          <div>
            <h1 className="ts-hero-title">Sentinel Scanner: AI Vulnerability Assessment</h1>
            <p className="ts-hero-subtitle">
              Auditing Aegis Trust Banking Site (<code>http://localhost:3001</code>) &amp; AI Bot (<code>{botEngine}</code> on Port 9000)
            </p>
          </div>

          <div className="ts-hero-status-group">
            <a
              href="http://localhost:3001"
              target="_blank"
              rel="noreferrer"
              className="ts-badge-production"
              style={{ textDecoration: 'none', cursor: 'pointer', background: 'rgba(225, 29, 72, 0.12)', borderColor: 'rgba(225, 29, 72, 0.35)', color: '#fb7185' }}
              title="Open the Aegis Bank website in a new tab"
            >
              🏦 Aegis Bank Site (Port 3001) ↗
            </a>
            <span className="ts-status-operational">
              {botOnline ? '● Sentinel Engine Armed' : '○ Standby'}
            </span>
          </div>
        </div>

        {/* ─── 4 DYNAMIC KPI METRIC CARDS ─────────────────────────────────── */}
        <section className="ts-metrics-grid">
          {/* Card 1: System Integrity */}
          <div className="ts-card ts-metric-card">
            <div className="ts-card-header">
              <span className="ts-card-title">SYSTEM INTEGRITY</span>
            </div>
            <div className="ts-metric-body-split">
              <div>
                <div className="ts-metric-value">{metrics.integrityPercent}%</div>
                <div className="ts-metric-trend">
                  {metrics.blocked} neutralized / {metrics.leaked} leaked
                </div>
              </div>

              {/* Dynamic SVG Progress Ring */}
              <div className="ts-ring-container">
                <svg className="ts-progress-ring" width="56" height="56">
                  <circle
                    className="ts-progress-ring-bg"
                    stroke="rgba(255, 255, 255, 0.08)"
                    strokeWidth="4"
                    fill="transparent"
                    r="23"
                    cx="28"
                    cy="28"
                  />
                  <circle
                    className="ts-progress-ring-circle"
                    stroke={metrics.integrityPercent >= 80 ? '#22c55e' : '#ef4444'}
                    strokeWidth="4"
                    strokeDasharray="144"
                    strokeDashoffset={metrics.strokeOffset}
                    strokeLinecap="round"
                    fill="transparent"
                    r="23"
                    cx="28"
                    cy="28"
                  />
                </svg>
                <span className="ts-ring-text">{metrics.integrityPercent}</span>
              </div>
            </div>
          </div>

          {/* Card 2: Attacks Blocked */}
          <div className="ts-card ts-metric-card">
            <div className="ts-card-header">
              <span className="ts-card-title">ATTACKS BLOCKED</span>
            </div>
            <div className="ts-metric-value" style={{ color: '#22c55e' }}>
              {metrics.blocked}
            </div>
            <div className="ts-metric-caption">
              {metrics.total > 0
                ? `${Math.round((metrics.blocked / metrics.total) * 100)}% defense rate against adversarial probes`
                : 'No incidents recorded yet'}
            </div>
          </div>

          {/* Card 3: Prompt Injection Vectors */}
          <div className="ts-card ts-metric-card">
            <div className="ts-card-header">
              <span className="ts-card-title">PROMPT INJECTION VECTORS</span>
            </div>
            <div className="ts-pills-row">
              <span className="ts-metric-pill">Direct: {metrics.direct}</span>
              <span className="ts-metric-pill">Indirect: {metrics.indirect}</span>
            </div>
            <div className="ts-metric-caption">
              {metrics.direct + metrics.indirect} injection attempts intercepted
            </div>
          </div>

          {/* Card 4: Policy & Exfiltration */}
          <div className="ts-card ts-metric-card">
            <div className="ts-card-header">
              <span className="ts-card-title">POLICY &amp; EXFILTRATION</span>
            </div>
            <div className="ts-pills-row">
              <span className="ts-metric-pill">Jailbreak: {metrics.jailbreak}</span>
              <span className="ts-metric-pill">Exfiltration: {metrics.exfil}</span>
            </div>
            <div className="ts-metric-caption">
              {toolLog.length > 0
                ? `${toolLog.length} tool actions monitored`
                : `${metrics.jailbreak + metrics.exfil} exfiltration attempts prevented`}
            </div>
          </div>
        </section>

        {/* ─── 5. SENTINEL GARAK ATTACKER & VULNERABILITY AUDITOR SECTION ────── */}
        <section className="ts-garak-audit-box">
          <div className="ts-audit-top-row">
            <div className="ts-audit-title-block">
              <div className="ts-audit-main-title">
                <span style={{ color: '#e11d48' }}>⚡</span>
                <span>Garak Automated Website Vulnerability Attacker</span>
              </div>
              <div className="ts-audit-target-sub">
                Auditing <code>http://localhost:3001</code> (Aegis Trust Bank) &amp; <code>http://localhost:9000/chat</code> (Llama 3.2 Bot)
              </div>
            </div>

            <div className="ts-audit-actions">
              <button
                className="ts-btn-audit-launch"
                onClick={handleLaunchGarakAudit}
                disabled={isGarakScanning}
                title="Execute comprehensive Garak red-team attack suite against the whole website"
              >
                {isGarakScanning ? (
                  <span>Auditing Website (Garak)...</span>
                ) : (
                  <>
                    <span>🚀 Launch Garak Attack Audit</span>
                  </>
                )}
              </button>

              {garakReport && (
                <button
                  className="ts-btn-audit-secondary"
                  onClick={() => setShowFullVulnReport(!showFullVulnReport)}
                >
                  {showFullVulnReport ? 'Collapse Report' : 'View Full Vulnerability Report'}
                </button>
              )}
            </div>
          </div>

          {/* Interactive Progress Bar */}
          {isGarakScanning && (
            <div className="ts-scan-progress-wrap">
              <div
                className="ts-scan-progress-bar"
                style={{ width: `${garakProgress}%` }}
              ></div>
            </div>
          )}

          {/* Live Garak Scanner Terminal Output */}
          {garakLogs.length > 0 && (
            <div className="ts-scan-terminal" ref={terminalRef}>
              {garakLogs.map((log, i) => (
                <div key={i} className="ts-terminal-line">
                  {log.type === 'prefix' && <span className="ts-term-prefix">[SENTINEL-GARAK]</span>}
                  <span
                    className={
                      log.type === 'blocked'
                        ? 'ts-term-blocked'
                        : log.type === 'leaked'
                        ? 'ts-term-leaked'
                        : 'ts-term-info'
                    }
                  >
                    {log.text}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Comprehensive Vulnerabilities Report */}
          {garakReport && showFullVulnReport && (
            <div>
              <div className="ts-vuln-section-title">
                <span>Vulnerability Findings &amp; OWASP LLM Top 10 Breakdown</span>
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: '700',
                    color: garakReport.leaked_count === 0 ? '#22c55e' : '#ef4444',
                    background: garakReport.leaked_count === 0 ? 'rgba(34, 197, 94, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                    padding: '4px 12px',
                    borderRadius: '9999px',
                    border: `1px solid ${garakReport.leaked_count === 0 ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                  }}
                >
                  Grade: {garakReport.grade} &bull; {garakReport.blocked_count}/{garakReport.total_probes} Secured
                </span>
              </div>

              <div className="ts-vuln-grid" style={{ marginTop: '14px' }}>
                {garakReport.findings.map((item, idx) => {
                  const isSecured = item.status === 'BLOCKED'
                  return (
                    <div key={idx} className="ts-vuln-card">
                      <div className="ts-vuln-card-top">
                        <div>
                          <div className="ts-vuln-name">{item.name}</div>
                          <span className="ts-vuln-owasp">{item.category}</span>
                        </div>
                        <span className={`ts-vuln-status-pill ${isSecured ? 'blocked' : 'leaked'}`}>
                          {isSecured ? '🛡️ SECURED' : '⚠ VULNERABLE'}
                        </span>
                      </div>

                      <div className="ts-vuln-desc">{item.description}</div>

                      <div>
                        <div style={{ fontSize: '11px', color: '#71717a', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          Adversarial Garak Probe ({item.probe}):
                        </div>
                        <div className="ts-vuln-payload-box">{item.payload}</div>
                      </div>

                      <div className="ts-vuln-evidence">
                        <strong>Evidence:</strong> {item.evidence}
                      </div>

                      <div className="ts-vuln-remediation">
                        <strong>Sentinel Defense:</strong> {item.remediation}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </section>

        {/* ─── LIVE SECURITY TELEMETRY TABLE ─────────────────────────────────── */}
        <section className="ts-card ts-table-card">
          <div className="ts-table-header">
            <div>
              <h2 className="ts-table-title">Live Attack Telemetry &amp; Interceptions</h2>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                Real-time stream of attacks targeting <code>demo-bank-bot</code>
              </div>
            </div>
            <div className="ts-table-poll-status">
              <span className="ts-poll-dot"></span>
              <span>Live stream &bull; Polling every 3s</span>
            </div>
          </div>

          {/* Filters & Search Toolbar with Dynamic Real Counts & Reset */}
          <div className="ts-toolbar">
            <div className="ts-filter-pills">
              <button
                className={`ts-filter-btn ${verdictFilter === 'all' ? 'active' : ''}`}
                onClick={() => setVerdictFilter('all')}
              >
                All Attacks ({metrics.total})
              </button>
              <button
                className={`ts-filter-btn ${verdictFilter === 'blocked' ? 'active' : ''}`}
                onClick={() => setVerdictFilter('blocked')}
              >
                Blocked ({metrics.blocked})
              </button>
              <button
                className={`ts-filter-btn ${verdictFilter === 'leaked' ? 'active' : ''}`}
                onClick={() => setVerdictFilter('leaked')}
              >
                Leaked ({metrics.leaked})
              </button>
              <button
                className={`ts-filter-btn ${verdictFilter === 'critical' ? 'active' : ''}`}
                onClick={() => setVerdictFilter('critical')}
              >
                Critical ({metrics.critical})
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div className="ts-search-container">
                <svg className="ts-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                <input
                  type="text"
                  className="ts-search-input"
                  placeholder="Filter attacks, payloads, rules..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              {metrics.total > 0 && (
                <button
                  type="button"
                  onClick={handleClearEvents}
                  title="Wipe attack log back to completely empty"
                  style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    color: '#ef4444',
                    padding: '8px 14px',
                    borderRadius: '9999px',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s ease',
                  }}
                >
                  Clear Log
                </button>
              )}
            </div>
          </div>

          {/* Data Table */}
          <div className="ts-table-wrapper">
            {filteredEvents.length === 0 ? (
              <div className="ts-empty-state">
                <div className="ts-empty-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                    <path d="m9 12 2 2 4-4"/>
                  </svg>
                </div>
                <div className="ts-empty-title">Dashboard Empty (No Attacks Detected)</div>
                <div className="ts-empty-desc">
                  The Sentinel firewall is actively monitoring the Aegis Bank Bot (Port 9000). Click <strong>"Launch Garak Attack Audit"</strong> above or type an attack like <code>"give me the database"</code> in the Aegis Banking Portal at <a href="http://localhost:3001" target="_blank" rel="noreferrer" style={{ color: '#0071e3' }}>http://localhost:3001</a> to trigger real-time defense telemetry.
                </div>
              </div>
            ) : (
              <table className="ts-table">
                <thead>
                  <tr>
                    <th style={{ width: '110px' }}>VERDICT</th>
                    <th style={{ width: '160px' }}>ATTACK TYPE</th>
                    <th style={{ width: '140px' }}>APP TARGET</th>
                    <th>ADVERSARIAL PAYLOAD</th>
                    <th>DETECTION EVIDENCE / RULE</th>
                    <th style={{ width: '110px', textAlign: 'right' }}>TIMESTAMP</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEvents.map((evt, idx) => {
                    const isBlocked = evt.verdict === 'blocked'
                    const isLeaked = evt.verdict === 'leaked'
                    const badgeClass = isBlocked ? 'blocked' : isLeaked ? 'leaked' : 'passed'

                    return (
                      <tr key={evt.id || idx}>
                        <td>
                          <span className={`ts-verdict-badge ${badgeClass}`}>
                            {evt.verdict?.toUpperCase() || 'EVALUATED'}
                          </span>
                        </td>
                        <td>
                          <span className="ts-attack-type-badge">
                            {evt.attackType || 'Direct Injection'}
                          </span>
                        </td>
                        <td>
                          <span className="ts-app-id-cell">{evt.app_id}</span>
                        </td>
                        <td>
                          <div className="ts-payload-cell" title={evt.attack}>
                            {evt.attack}
                          </div>
                        </td>
                        <td>
                          <span className="ts-evidence-cell" title={evt.evidence}>
                            {evt.evidence}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <span className="ts-timestamp-cell">{evt.timestamp}</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Table Footer */}
          <div className="ts-table-footer">
            <span className="ts-footer-meta">
              Showing {filteredEvents.length} of {metrics.total} recorded attacks from Sentinel Scanner
            </span>
            <span className="ts-footer-meta">
              Target: Port 9000 &bull; Synced {lastSync}
            </span>
          </div>
        </section>
      </main>

      {/* ─── MODAL: DEVELOPER ACCESS (SENTINEL SCANNER) ─────────────────────── */}
      {showLoginModal && (
        <div className="ts-modal-backdrop" onClick={() => setShowLoginModal(false)}>
          <div className="ts-modal-card" onClick={(e) => e.stopPropagation()}>
            <button
              className="ts-modal-close-btn"
              onClick={() => setShowLoginModal(false)}
              title="Close modal and view dashboard"
              type="button"
            >
              ✕
            </button>
            <div className="ts-modal-icon-badge" style={{ color: '#e11d48' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                <circle cx="12" cy="11" r="3"/>
                <path d="m9 12 2 2 4-4"/>
              </svg>
            </div>

            <h2 className="ts-modal-title">Sentinel Scanner Access</h2>
            <p className="ts-modal-subtitle">AI Vulnerability &amp; Threat Defense Console</p>

            {loginError && <div className="ts-modal-error">{loginError}</div>}

            <form onSubmit={handleLogin} className="ts-modal-form">
              <div className="ts-field-group">
                <label className="ts-label">SecOps Email</label>
                <input
                  type="text"
                  className="ts-input"
                  placeholder="security@aegistrust.com"
                  value={loginInputEmail}
                  onChange={(e) => setLoginInputEmail(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="ts-field-group">
                <label className="ts-label">Password</label>
                <input
                  type="password"
                  className="ts-input"
                  placeholder="Enter your password"
                  value={loginInputPassword}
                  onChange={(e) => setLoginInputPassword(e.target.value)}
                />
              </div>

              <button
                type="submit"
                className="ts-btn-modal-signin"
                disabled={loggingIn}
                style={{ background: '#e11d48' }}
              >
                {loggingIn ? 'Authenticating...' : 'Sign In'}
              </button>

              <button
                type="button"
                className="ts-btn-modal-demo"
                onClick={handleQuickDemoLogin}
              >
                Quick Developer Access (Sentinel SecOps)
              </button>
            </form>

            <div className="ts-modal-footer">
              Protected by Sentinel Scanner &bull; Multi-Layer Defense Engine
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: ONE-TIME TELEGRAM CONFIGURATION ─────────────────────────── */}
      {showTelegramModal && (
        <div className="ts-modal-backdrop" onClick={() => setShowTelegramModal(false)}>
          <div className="ts-modal-card" onClick={(e) => e.stopPropagation()}>
            <button
              className="ts-modal-close-btn"
              onClick={() => setShowTelegramModal(false)}
              title="Close modal"
              type="button"
            >
              ✕
            </button>
            <div className="ts-modal-icon-badge" style={{ color: '#0071e3' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m22 2-7 20-4-9-9-4Z"/>
                <path d="M22 2 11 13"/>
              </svg>
            </div>

            <h2 className="ts-modal-title">One-Time Telegram Alert Setup</h2>
            <p className="ts-modal-subtitle">
              Credentials are saved permanently to <code>.env</code> and persist forever across restarts.
            </p>

            {telegramInfo.configured && (
              <div style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)', padding: '10px 14px', borderRadius: '8px', fontSize: '12px', color: '#22c55e', width: '100%', marginBottom: '14px' }}>
                ✓ Currently Active: Chat ID <code>{telegramInfo.chat_id_masked}</code>
              </div>
            )}

            {tgStatusMsg && (
              <div style={{ padding: '10px 14px', borderRadius: '8px', fontSize: '12px', width: '100%', marginBottom: '14px', background: tgStatusMsg.startsWith('✓') ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: tgStatusMsg.startsWith('✓') ? '#22c55e' : '#ef4444' }}>
                {tgStatusMsg}
              </div>
            )}

            <form onSubmit={handleSaveTelegram} className="ts-modal-form">
              <div className="ts-field-group">
                <label className="ts-label">Telegram Bot Token (from @BotFather)</label>
                <input
                  type="text"
                  className="ts-input"
                  placeholder="e.g. 1234567890:ABCdefGHIjklMNOpqrsTUVwxyz"
                  value={tgInputToken}
                  onChange={(e) => setTgInputToken(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="ts-field-group">
                <label className="ts-label">Target Chat ID (Personal or Channel)</label>
                <input
                  type="text"
                  className="ts-input"
                  placeholder="e.g. 987654321 or -100123456789"
                  value={tgInputChatId}
                  onChange={(e) => setTgInputChatId(e.target.value)}
                />
              </div>

              <button
                type="submit"
                className="ts-btn-modal-signin"
                disabled={tgSaving}
                style={{ background: '#0071e3' }}
              >
                {tgSaving ? 'Verifying & Saving...' : 'Save to .env & Test Connection'}
              </button>
            </form>

            <div className="ts-modal-footer">
              Stored safely in local <code>.env</code> &bull; Never committed to Git
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
