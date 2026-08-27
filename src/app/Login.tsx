import { useState } from 'react'

export type LoginSession = { id: number | string; name: string; role: 'CITIZEN' | 'DEPARTMENT_OFFICER' | 'STATE_SUPERVISOR' | 'ADMIN'; department: string | null }

type Props = { onLogin: (user: LoginSession) => void }
const call = async <T,>(path: string, body?: object): Promise<T> => { const response = await fetch(`/api${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined }); const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Login failed.'); return data }

export function Login({ onLogin }: Props) {
  const [email, setEmail] = useState('officer@shravana.demo'), [password, setPassword] = useState('Officer@123'), [error, setError] = useState(''), [saving, setSaving] = useState(false)
  const officialLogin = async () => { setSaving(true); setError(''); try { onLogin((await call<{ user: LoginSession }>('/auth/login', { email, password })).user) } catch (e) { setError(e instanceof Error ? e.message : 'Login failed.') } finally { setSaving(false) } }
  const citizenLogin = async () => { try { onLogin((await call<{ user: LoginSession }>('/auth/citizen')).user) } catch { setError('Citizen access is unavailable while the API is offline.') } }
  return <main className="login"><div className="hero"><div><span className="badge green">SHRAVANA PORTAL</span><h2>One platform.<br />Two workspaces.</h2><p>Citizens track outcomes; public-service teams manage their authorised queues.</p></div><div className="hero-art"><i className="sun">✦</i><i className="warli-person one" /><i className="warli-person two" /><i className="warli-person three" /></div></div><div className="metrics"><section className="card"><p className="eyebrow">CITIZEN WORKSPACE</p><h3>Raise and track a grievance</h3><p>Access the citizen dashboard without an official account.</p><button className="primary" onClick={() => void citizenLogin()}>Continue as citizen →</button></section><section className="card"><p className="eyebrow">GOVERNMENT WORKSPACE</p><h3>Official sign-in</h3><label>Email<input value={email} onChange={e => setEmail(e.target.value)} /></label><label>Password<input type="password" value={password} onChange={e => setPassword(e.target.value)} /></label>{error && <p className="form-error">{error}</p>}<button className="primary" onClick={() => void officialLogin()} disabled={saving}>{saving ? 'Signing in…' : 'Sign in as official →'}</button><p><small>Demo roles: officer, supervisor, administrator.</small></p></section></div></main>
}
