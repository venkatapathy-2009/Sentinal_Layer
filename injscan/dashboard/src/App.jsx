import React, { useState, useEffect } from 'react';

const DJANGO_API = 'http://localhost:8000/v1/events';
const FASTAPI_SHIELD_BASE = 'http://127.0.0.1:9000/shield';
const API_KEY = 'ts-dev-key-123';
const POLL_INTERVAL_MS = 2500;

function VerdictBadge({ verdict }) {
  const v = (verdict || '').toLowerCase();
  if (v === 'blocked') {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '9999px', fontSize: '12px', fontWeight: 600, background: 'rgba(127, 29, 29, 0.4)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.5)' }}>
        🛡️ BLOCKED
      </span>
    );
  }
  if (v === 'leaked') {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '9999px', fontSize: '12px', fontWeight: 600, background: 'rgba(120, 53, 15, 0.4)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.5)' }}>
        ⚠️ LEAKED
      </span>
    );
  }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '9999px', fontSize: '12px', fontWeight: 600, background: 'rgba(6, 78, 59, 0.4)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.5)' }}>
      ✅ PASSED
    </span>
  );
}

function SeverityBadge({ severity }) {
  const s = (severity || '').toLowerCase();
  if (s === 'critical') {
    return <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, background: '#7f1d1d', color: '#fca5a5' }}>CRITICAL</span>;
  }
  if (s === 'high') {
    return <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, background: '#78350f', color: '#fcd34d' }}>HIGH</span>;
  }
  return <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, background: '#1e293b', color: '#94a3b8' }}>LOW</span>;
}

export default function App() {
  const [events, setEvents] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [shieldState, setShieldState] = useState(true);
  const [shieldNotice, setShieldNotice] = useState(null);

  const fetchEvents = async () => {
    try {
      const res = await fetch(DJANGO_API, {
        headers: { 'X-API-Key': API_KEY },
      });
      if (!res.ok) throw new Error(res.statusText);
      const data = await res.json();
      setEvents(Array.isArray(data) ? data : []);
      setIsConnected(true);
    } catch (err) {
      setIsConnected(false);
    }
  };

  const toggleShield = async () => {
    const next = !shieldState;
    try {
      const endpoint = next ? `${FASTAPI_SHIELD_BASE}/on` : `${FASTAPI_SHIELD_BASE}/off`;
      const res = await fetch(endpoint, { method: 'POST' });
      if (res.ok) {
        const d = await res.json();
        setShieldState(d.shield ?? next);
      } else {
        setShieldState(next);
      }
      setShieldNotice(`Shield switched ${next ? 'ON' : 'OFF'}`);
    } catch {
      setShieldState(next);
      setShieldNotice(`Shield switched ${next ? 'ON' : 'OFF'} (FastAPI bank bot offline)`);
    }
    setTimeout(() => setShieldNotice(null), 3000);
  };

  useEffect(() => {
    fetchEvents();
    const interval = setInterval(fetchEvents, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: '#070d18', color: '#e2e8f0', fontFamily: 'sans-serif' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid #1e293b', background: '#0c172a' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '32px', height: '32px', background: '#dc2626', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>🛡️</div>
          <div>
            <h1 style={{ fontSize: '16px', fontWeight: 'bold', margin: 0 }}>InjScan Telemetry SOC</h1>
            <div style={{ fontSize: '12px', color: '#64748b' }}>Django REST (8000) & FastAPI Bank Bot (9000)</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          {/* Connection Dot */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: isConnected ? '#10b981' : '#ef4444' }}></span>
            <span>{isConnected ? 'CONNECTED' : 'DISCONNECTED'}</span>
          </div>

          {/* Shield Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600 }}>Shield:</span>
            <button
              onClick={toggleShield}
              style={{
                padding: '6px 14px',
                borderRadius: '9999px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '12px',
                background: shieldState ? '#059669' : '#475569',
                color: '#fff',
              }}
            >
              {shieldState ? 'SHIELD ON' : 'SHIELD OFF'}
            </button>
          </div>
        </div>
      </header>

      {shieldNotice && (
        <div style={{ padding: '8px', textAlign: 'center', background: '#1e293b', color: '#38bdf8', fontSize: '12px' }}>
          {shieldNotice}
        </div>
      )}

      <main style={{ maxWidth: '1200px', margin: '24px auto', padding: '0 16px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', background: '#0c172a', borderRadius: '8px', overflow: 'hidden' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #1e293b', textAlign: 'left', fontSize: '12px', color: '#94a3b8' }}>
              <th style={{ padding: '12px 16px' }}>Verdict</th>
              <th style={{ padding: '12px 16px' }}>Severity</th>
              <th style={{ padding: '12px 16px' }}>App ID</th>
              <th style={{ padding: '12px 16px' }}>Attack</th>
              <th style={{ padding: '12px 16px' }}>Evidence</th>
              <th style={{ padding: '12px 16px' }}>Shield</th>
              <th style={{ padding: '12px 16px', textAlign: 'right' }}>Time</th>
            </tr>
          </thead>
          <tbody>
            {events.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                  No telemetry events recorded.
                </td>
              </tr>
            ) : (
              events.map((ev, i) => (
                <tr key={ev.id || i} style={{ borderBottom: '1px solid rgba(30, 41, 59, 0.5)', fontSize: '13px' }}>
                  <td style={{ padding: '12px 16px' }}><VerdictBadge verdict={ev.verdict} /></td>
                  <td style={{ padding: '12px 16px' }}><SeverityBadge severity={ev.severity} /></td>
                  <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: '#38bdf8' }}>{ev.app_id}</td>
                  <td style={{ padding: '12px 16px', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.attack}</td>
                  <td style={{ padding: '12px 16px', color: '#cbd5e1' }}>{ev.evidence}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>{ev.shield}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', color: '#94a3b8', fontSize: '11px' }}>{ev.time || ev.created_at}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </main>
    </div>
  );
}
