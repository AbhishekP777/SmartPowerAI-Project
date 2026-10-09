import { useState, useEffect } from 'react'
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, 
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend 
} from 'recharts'

const APPLIANCES = { "Laundry (Sub-meter 2)": 1.5, "Kitchen (Sub-meter 1)": 2.0, "HVAC/Water Heater (Sub-meter 3)": 3.5 }

// Custom Dot to render a RED WARNING on anomalous graph points
const CustomDot = (props) => {
  const { cx, cy, payload } = props;
  if (payload.isAnomaly) {
    return <circle cx={cx} cy={cy} r={8} stroke="#ef4444" strokeWidth={3} fill="#fee2e2" />;
  }
  return <circle cx={cx} cy={cy} r={4} stroke="#3b82f6" strokeWidth={2} fill="white" />;
};

function App() {
  const [user, setUser] = useState(null)
  const [isLoginMode, setIsLoginMode] = useState(true)
  const [authForm, setAuthForm] = useState({ name: '', username: '', password: '' })
  const [authError, setAuthError] = useState('')

  const [dashboard, setDashboard] = useState(null)
  const [activeChartTab, setActiveChartTab] = useState('today')
  const [history, setHistory] = useState([])

  const [optData, setOptData] = useState({ appliance_name: Object.keys(APPLIANCES)[0], power_kw: APPLIANCES[Object.keys(APPLIANCES)[0]], duration_hours: 2, start_limit: 16, end_limit: 23 })
  const [optResult, setOptResult] = useState(null)
  const [anomalyData, setAnomalyData] = useState({ global_active_power: 4.5, hour: 3 })
  const [anomalyResult, setAnomalyResult] = useState(null)

  const handleAuth = async (e) => {
    e.preventDefault()
    setAuthError('')
    const endpoint = isLoginMode ? 'login' : 'signup'
    try {
      const res = await fetch(`https://smartpowerai-project.onrender.com/api/${endpoint}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(authForm)
      })
      const data = await res.json()
      if (data.success) {
        setUser(data.user)
        fetchDashboardData(data.user.username)
      } else {
        setAuthError(data.error)
      }
    } catch {
      setAuthError("Backend offline.")
    }
  }

  const fetchDashboardData = (username) => {
    fetch('https://smartpowerai-project.onrender.com/api/dashboard', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username }) })
      .then(res => res.json()).then(data => setDashboard(data))
    fetch(`https://smartpowerai-project.onrender.com/api/history/${username}`)
      .then(res => res.json()).then(data => setHistory(data))
  }

  const runOptimizer = async (e) => {
    e.preventDefault()
    const payload = { ...optData, username: user.username }
    const res = await fetch('https://smartpowerai-project.onrender.com/api/smart-optimize', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
    })
    setOptResult(await res.json())
    fetchDashboardData(user.username)
  }

  const runAnomalyCheck = async (e) => {
    e.preventDefault()
    // Hitting the Python ML backend on port 10000 via Render
    const res = await fetch('https://smartpowerai-project-1.onrender.com/api/anomaly', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(anomalyData)
    })
    setAnomalyResult(await res.json())
  }

  const logout = () => {
    setUser(null); setDashboard(null); setHistory([]); setOptResult(null); setAuthForm({ name: '', username: '', password: '' })
  }

  if (!user) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#eef2f6', fontFamily: 'Segoe UI, sans-serif' }}>
        <div style={{ backgroundColor: '#fff', padding: '40px', borderRadius: '14px', boxShadow: '0 10px 30px rgba(0,0,0,0.08)', width: '100%', maxWidth: '380px' }}>
          <h2 style={{ color: '#1a237e', textAlign: 'center', marginTop: 0 }}>⚡ SmartPower AI</h2>
          <p style={{ textAlign: 'center', color: '#64748b', fontSize: '14px' }}>{isLoginMode ? 'Sign in to your household portal' : 'Register a new account'}</p>
          <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {!isLoginMode && (<div><label style={{ fontSize: '13px', fontWeight: 600 }}>Full Name</label><input type="text" value={authForm.name} onChange={e => setAuthForm({...authForm, name: e.target.value})} style={{ width: '92%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} required /></div>)}
            <div><label style={{ fontSize: '13px', fontWeight: 600 }}>Username</label><input type="text" value={authForm.username} onChange={e => setAuthForm({...authForm, username: e.target.value})} style={{ width: '92%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} required /></div>
            <div><label style={{ fontSize: '13px', fontWeight: 600 }}>Password</label><input type="password" value={authForm.password} onChange={e => setAuthForm({...authForm, password: e.target.value})} style={{ width: '92%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} required /></div>
            {authError && <div style={{ color: '#ef4444', fontSize: '13px', textAlign: 'center' }}>{authError}</div>}
            <button type="submit" style={{ padding: '12px', backgroundColor: '#3f51b5', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>{isLoginMode ? 'Access Dashboard' : 'Create Account'}</button>
          </form>
          <div style={{ marginTop: '20px', textAlign: 'center' }}><button onClick={() => { setIsLoginMode(!isLoginMode); setAuthError(''); }} style={{ background: 'none', border: 'none', color: '#3f51b5', cursor: 'pointer', fontSize: '13px', textDecoration: 'underline' }}>{isLoginMode ? "Need to register? Sign up here" : "Existing user? Log in here"}</button></div>
        </div>
      </div>
    )
  }

  if (!dashboard) return <div style={{ padding: '60px', textAlign: 'center', fontFamily: 'sans-serif' }}>Syncing grid telemetry...</div>

  return (
    <div style={{ fontFamily: 'Segoe UI, sans-serif', backgroundColor: '#f1f5f9', minHeight: '100vh', padding: '24px 40px' }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div><h1 style={{ color: '#0f172a', margin: 0, fontSize: '28px' }}>⚡ SmartPower AI <span style={{ fontSize: '14px', color: '#64748b', fontWeight: 'normal' }}>| Home Energy Management System</span></h1></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ textAlign: 'right' }}><div style={{ fontWeight: 600, color: '#1e293b' }}>{user.name}</div><div style={{ color: '#64748b', fontSize: '12px' }}>Meter ID: {user.account_id}</div></div>
            <button onClick={logout} style={{ padding: '8px 16px', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>Sign Out</button>
          </div>
        </div>

        {/* METRICS STRIP */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '12px', borderLeft: '4px solid #3b82f6' }}><div style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>TODAY'S USAGE</div><div style={{ fontSize: '26px', fontWeight: 700, color: '#0f172a' }}>{dashboard.today.totalKwh} <span style={{ fontSize: '14px', fontWeight: 500 }}>kWh</span></div></div>
          <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '12px', borderLeft: '4px solid #6366f1' }}><div style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>CURRENT BILL (MTD)</div><div style={{ fontSize: '26px', fontWeight: 700, color: '#0f172a' }}>₹{dashboard.billing.currentBillInr}</div></div>
          <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '12px', borderLeft: '4px solid #10b981' }}><div style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>THIS MONTH VS LAST</div><div style={{ fontSize: '26px', fontWeight: 700, color: '#0f172a' }}>{dashboard.thisMonth.totalKwh} <span style={{ fontSize: '14px', fontWeight: 500 }}>kWh</span></div></div>
          <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '12px', borderLeft: '4px solid #14b8a6' }}><div style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>CARBON FOOTPRINT</div><div style={{ fontSize: '26px', fontWeight: 700, color: '#0f172a' }}>{dashboard.billing.carbonKg} <span style={{ fontSize: '14px', fontWeight: 500 }}>kg CO₂</span></div></div>
        </div>

        {/* AI INSIGHT */}
        <div style={{ backgroundColor: '#fee2e2', borderLeft: '4px solid #ef4444', padding: '16px 20px', borderRadius: '10px', color: '#991b1b', fontSize: '14px', fontWeight: 600, marginBottom: '24px', display: 'flex', alignItems: 'center' }}>
          <span style={{ fontSize: '20px', marginRight: '10px' }}>⚠️</span> System Alert: {dashboard.insight}
        </div>

        {/* MAIN VISUALIZATION GRID */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', marginBottom: '24px' }}>
          
          <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, color: '#1e293b', fontSize: '18px' }}>Consumption Diagnostics (User View)</h3>
              <div style={{ display: 'flex', gap: '8px', backgroundColor: '#f1f5f9', padding: '4px', borderRadius: '8px' }}>
                <button onClick={() => setActiveChartTab('today')} style={{ border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', backgroundColor: activeChartTab === 'today' ? '#fff' : 'transparent', color: activeChartTab === 'today' ? '#0f172a' : '#64748b', boxShadow: activeChartTab === 'today' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none' }}>Today (24h)</button>
                <button onClick={() => setActiveChartTab('week')} style={{ border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', backgroundColor: activeChartTab === 'week' ? '#fff' : 'transparent', color: activeChartTab === 'week' ? '#0f172a' : '#64748b', boxShadow: activeChartTab === 'week' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none' }}>This Week</button>
                <button onClick={() => setActiveChartTab('month')} style={{ border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', backgroundColor: activeChartTab === 'month' ? '#fff' : 'transparent', color: activeChartTab === 'month' ? '#0f172a' : '#64748b', boxShadow: activeChartTab === 'month' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none' }}>This vs Last Month</button>
              </div>
            </div>

            <div style={{ height: '300px', width: '100%' }}>
              <ResponsiveContainer>
                {activeChartTab === 'today' ? (
                  <LineChart data={dashboard.today.hourly} margin={{ top: 20 }}>
                    <XAxis dataKey="time" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip contentStyle={{ borderRadius: '8px' }} />
                    <Legend />
                    <Line type="monotone" dataKey="expectedKwh" name="Expected Baseline (Normal)" stroke="#94a3b8" strokeDasharray="5 5" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="kwh" name="Actual Usage" stroke="#3b82f6" strokeWidth={3} activeDot={{ r: 8 }} dot={<CustomDot />} />
                  </LineChart>
                ) : activeChartTab === 'week' ? (
                  <BarChart data={dashboard.weekly_chart_data}><XAxis dataKey="day" stroke="#94a3b8" /><YAxis stroke="#94a3b8" /><Tooltip /><Bar dataKey="kwh" fill="#6366f1" radius={[4, 4, 0, 0]} /></BarChart>
                ) : (
                  <BarChart data={dashboard.month_comparison_chart}><XAxis dataKey="period" stroke="#94a3b8" /><YAxis stroke="#94a3b8" /><Tooltip /><Legend /><Bar dataKey="thisMonth" name="This Month (kWh)" fill="#3b82f6" radius={[4, 4, 0, 0]} /><Bar dataKey="pastMonth" name="Past Month (kWh)" fill="#cbd5e1" radius={[4, 4, 0, 0]} /></BarChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>

          <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#1e293b', fontSize: '18px' }}>Appliance Load Split</h3>
            <div style={{ height: '220px', width: '100%' }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={dashboard.appliance_breakdown} innerRadius={55} outerRadius={80} dataKey="value" paddingAngle={5}>
                    {dashboard.appliance_breakdown.map((entry, idx) => (<Cell key={`cell-${idx}`} fill={entry.color} />))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
              {dashboard.appliance_breakdown.map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}><span style={{ color: '#475569' }}>● {item.name}</span><span style={{ fontWeight: 700 }}>{item.value}%</span></div>
              ))}
            </div>
          </div>

        </div>

        {/* BOTTOM ROW: OPTIMIZER & ADMIN SANDBOX */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '24px' }}>
          
          <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <h3 style={{ marginTop: 0, color: '#059669', fontSize: '18px' }}>💰 Indian ToU Tariff Optimizer</h3>
            <form onSubmit={runOptimizer} style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '15px' }}>
              <div><select value={optData.appliance_name} onChange={e => setOptData({...optData, appliance_name: e.target.value, power_kw: APPLIANCES[e.target.value]})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}>{Object.keys(APPLIANCES).map(app => <option key={app} value={app}>{app} (Avg: {APPLIANCES[app]} kW)</option>)}</select></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                <div><label style={{ fontSize: '11px', color: '#64748b' }}>Duration</label><input type="number" name="duration_hours" value={optData.duration_hours} onChange={e => setOptData({...optData, duration_hours: Number(e.target.value)})} style={{ width: '80%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }} /></div>
                <div><label style={{ fontSize: '11px', color: '#64748b' }}>Earliest Start</label><input type="number" name="start_limit" value={optData.start_limit} onChange={e => setOptData({...optData, start_limit: Number(e.target.value)})} style={{ width: '80%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }} /></div>
                <div><label style={{ fontSize: '11px', color: '#64748b' }}>Latest End</label><input type="number" name="end_limit" value={optData.end_limit} onChange={e => setOptData({...optData, end_limit: Number(e.target.value)})} style={{ width: '80%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }} /></div>
              </div>
              <button type="submit" style={{ padding: '12px', backgroundColor: '#059669', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>Run Optimization & Save</button>
            </form>
            {optResult && (
              <div style={{ marginTop: '16px', padding: '14px', backgroundColor: '#ecfdf5', borderRadius: '8px', border: '1px solid #a7f3d0' }}>
                <div style={{ fontSize: '12px', color: '#065f46', fontWeight: 600 }}>Optimized Slot: {optResult.recommended_start_hour}:00 hrs</div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: '#047857' }}>Savings: ₹{optResult.estimated_savings_rupees}</div>
              </div>
            )}
          </div>

          {/* THE REBRANDED ADMIN SANDBOX */}
          <div style={{ backgroundColor: '#1e293b', padding: '24px', borderRadius: '14px', boxShadow: '0 4px 15px rgba(0,0,0,0.2)', color: 'white' }}>
            <h3 style={{ marginTop: 0, color: '#38bdf8', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🛠️</span> AI Model Testing Sandbox
            </h3>
            <p style={{ margin: '0 0 15px 0', fontSize: '12px', color: '#94a3b8' }}>
              <strong>Admin Panel:</strong> Manually query the Python Isolation Forest model without grid telemetry.
            </p>
            <form onSubmit={runAnomalyCheck} style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>Simulate Power (kW)</label>
                <input type="number" step="0.1" value={anomalyData.global_active_power} onChange={e => setAnomalyData({...anomalyData, global_active_power: Number(e.target.value)})} style={{ width: '85%', padding: '8px', borderRadius: '6px', border: '1px solid #475569', backgroundColor: '#0f172a', color: 'white' }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>Simulate Hour (0-23)</label>
                <input type="number" value={anomalyData.hour} onChange={e => setAnomalyData({...anomalyData, hour: Number(e.target.value)})} style={{ width: '85%', padding: '8px', borderRadius: '6px', border: '1px solid #475569', backgroundColor: '#0f172a', color: 'white' }} />
              </div>
              <button type="submit" style={{ padding: '9px 16px', backgroundColor: '#38bdf8', color: '#0f172a', border: 'none', borderRadius: '6px', fontWeight: 700, cursor: 'pointer' }}>Query ML Engine</button>
            </form>
            {anomalyResult && (
              <div style={{ marginTop: '16px', padding: '14px', borderRadius: '8px', backgroundColor: anomalyResult.is_anomaly ? 'rgba(239, 68, 68, 0.2)' : 'rgba(34, 197, 94, 0.2)', border: `1px solid ${anomalyResult.is_anomaly ? '#ef4444' : '#22c55e'}`, color: anomalyResult.is_anomaly ? '#fca5a5' : '#86efac', fontWeight: 600, fontSize: '13px' }}>
                {anomalyResult.is_anomaly ? '⚠️ ML OUTPUT: Anomaly Detected (Outlier)' : '✅ ML OUTPUT: Normal Data Point'}
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  )
}

export default App