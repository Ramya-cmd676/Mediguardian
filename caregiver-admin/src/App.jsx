import React, { useState, useEffect } from 'react'
import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://backend:4000'

function authHeaders() {
  const t = localStorage.getItem('mg_token')
  return t ? { Authorization: `Bearer ${t}` } : {}
}

function Login({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')

  async function login(e) {
    e.preventDefault()
    try {
      const res = await axios.post(`${API_BASE}/auth/login`, { email, password })
      const t = res.data.token
      localStorage.setItem('mg_token', t)
      onLogin(t)
    } catch (err) {
      console.error(err)
      setMessage(err?.response?.data?.error || 'Login failed')
    }
  }

  return (
    <div className="container">
      <h2>Caregiver Admin — Login</h2>
      <form onSubmit={login} className="form">
        <input placeholder="email" value={email} onChange={e => setEmail(e.target.value)} />
        <input placeholder="password" type="password" value={password} onChange={e => setPassword(e.target.value)} />
        <button type="submit">Login</button>
      </form>
      {message && <p className="msg">{message}</p>}
      <p className="note">This is a minimal admin UI. Use caregiver credentials to login.</p>
    </div>
  )
}

function Dashboard({ onLogout }) {
  const [pills, setPills] = useState([])
  const [schedules, setSchedules] = useState([])
  const [patients, setPatients] = useState([])
  const [newSchedule, setNewSchedule] = useState({ patientId: '', pillId: '', times: '' })

  useEffect(() => { fetchPills(); fetchSchedules(); fetchPatients(); }, [])

  async function fetchPills() {
    try {
      const res = await axios.get(`${API_BASE}/pills`, { headers: authHeaders() })
      setPills(res.data)
    } catch (err) { console.warn('fetch pills', err) }
  }

  async function createPatient(e) {
    e.preventDefault();
    const email = prompt('Patient email');
    const password = prompt('Patient password (temporary)');
    if (!email || !password) return;
    try {
      await axios.post(`${API_BASE}/auth/register`, { email, password, role: 'patient' }, { headers: authHeaders() });
      fetchPatients();
      alert('Patient created');
    } catch (err) { console.error('create patient', err); alert('Failed to create patient') }
  }

  async function uploadPill(e) {
    e.preventDefault();
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.onchange = async () => {
      const file = fileInput.files[0];
      const name = prompt('Enter pill name (e.g. Aspirin)') || file.name;
      const form = new FormData();
      form.append('image', file);
      form.append('name', name);
      try {
        const res = await axios.post(`${API_BASE}/register-pill`, form, { headers: { ...authHeaders(), 'Content-Type': 'multipart/form-data' } });
        alert('Pill registered: ' + (res.data.name || res.data.id));
        fetchPills();
      } catch (err) { console.error('upload pill', err); alert('Failed to upload pill') }
    };
    fileInput.click();
  }

  async function fetchSchedules() {
    try {
      const res = await axios.get(`${API_BASE}/api/schedules`, { headers: authHeaders() })
      setSchedules(res.data)
    } catch (err) { console.warn('fetch schedules', err) }
  }

  async function fetchPatients() {
    try {
      const res = await axios.get(`${API_BASE}/users`, { headers: authHeaders() })
      setPatients(res.data || [])
    } catch (err) { console.warn('fetch patients', err) }
  }

  async function createSchedule(e) {
    e.preventDefault()
    try {
      const times = newSchedule.times.split(',').map(t => t.trim())
      await axios.post(`${API_BASE}/api/schedules`, { patientId: newSchedule.patientId, pillId: newSchedule.pillId, times, label: 'Scheduled reminder' }, { headers: authHeaders() })
      setNewSchedule({ patientId: '', pillId: '', times: '' })
      fetchSchedules()
    } catch (err) { console.error('create schedule', err) }
  }

  return (
    <div className="container">
      <h2>Caregiver Dashboard</h2>
      <div style={{display:'flex', gap:20}}>
        <div style={{flex:1}}>
          <h3>Pills</h3>
          <ul>{pills.map(p => <li key={p.id}>{p.name}</li>)}</ul>
        </div>
        <div style={{flex:1}}>
          <h3>Schedules</h3>
          <ul>{schedules.map(s => <li key={s.id}>{s.patientId} — {s.pillId} @ {s.times?.join(', ')}</li>)}</ul>
        </div>
      </div>

      <h3>Create Schedule</h3>
      <form onSubmit={createSchedule} className="form">
        <select value={newSchedule.patientId} onChange={e => setNewSchedule({...newSchedule, patientId: e.target.value})}>
          <option value="">Select patient</option>
          {patients.map(p => <option key={p.id} value={p.id}>{p.email || p.name || p.id}</option>)}
        </select>
        <select value={newSchedule.pillId} onChange={e => setNewSchedule({...newSchedule, pillId: e.target.value})}>
          <option value="">Select pill</option>
          {pills.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <input placeholder="times (HH:MM,HH:MM)" value={newSchedule.times} onChange={e => setNewSchedule({...newSchedule, times: e.target.value})} />
        <button type="submit">Create</button>
      </form>

      <div className="links" style={{marginTop:20}}>
        <a href="#" onClick={onLogout}>Logout</a>
      </div>
    </div>
  )
}

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('mg_token') || null)

  function handleLogin(t) { setToken(t) }
  function handleLogout() { localStorage.removeItem('mg_token'); setToken(null) }

  if (!token) return <Login onLogin={handleLogin} />
  return <Dashboard onLogout={handleLogout} />
}
