import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { register, login } from '../api/auth';
import useAuthStore from '../store/authStore';
import useToastStore from '../store/toastStore';
import socket from '../socket';
import OrbBackground from '../components/ui/OrbBackground';

/* ─── Injected CSS (card & form only — orbs live in OrbBackground.jsx) ──────── */
const AUTH_CSS = `
  /* Card shake on error */
  @keyframes cardShake {
    0%,100% { transform: translateX(0); }
    15% { transform: translateX(-8px); }
    30% { transform: translateX(7px); }
    45% { transform: translateX(-5px); }
    60% { transform: translateX(5px); }
    75% { transform: translateX(-3px); }
    90% { transform: translateX(2px); }
  }

  /* Input focus ring pulse */
  @keyframes focusPulse {
    0%   { box-shadow: 0 0 0 0 rgba(196,30,51,0.55), inset 0 0 0 1px #C41E33; }
    70%  { box-shadow: 0 0 0 7px rgba(196,30,51,0), inset 0 0 0 1px #C41E33; }
    100% { box-shadow: 0 0 0 0 rgba(196,30,51,0), inset 0 0 0 1px #C41E33; }
  }



  /* Input / select */
  .auth-input, .auth-select {
    width: 100%;
    height: 46px;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 8px;
    color: #F5F0EF;
    font-family: 'DM Sans', sans-serif;
    font-size: 0.875rem;
    font-weight: 300;
    padding: 0 14px;
    outline: none;
    box-sizing: border-box;
    display: block;
    transition: border-color 0.2s, background 0.2s, box-shadow 0.2s;
  }
  .auth-input:focus, .auth-select:focus {
    border-color: #C41E33;
    background: rgba(196,30,51,0.06);
    animation: focusPulse 0.65s ease-out;
  }
  .auth-input::placeholder { color: rgba(245,240,239,0.3); }
  .auth-input[type="date"] { color-scheme: dark; }
  .auth-input[type="date"]::-webkit-calendar-picker-indicator {
    filter: invert(0.6) sepia(1) saturate(0.5) hue-rotate(320deg);
    cursor: pointer;
    opacity: 0.7;
  }

  /* Select */
  .auth-select {
    -webkit-appearance: none;
    appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='rgba(245,240,239,0.45)' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 14px center;
    padding-right: 36px;
    cursor: pointer;
  }
  .auth-select option { background: #1A1517; color: #F5F0EF; }

  /* Submit button */
  .auth-submit {
    width: 100%;
    height: 48px;
    background: #C41E33;
    border: none;
    border-radius: 8px;
    color: #F5F0EF;
    font-family: 'DM Sans', sans-serif;
    font-size: 0.8rem;
    font-weight: 500;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    cursor: pointer;
    transition: background 0.2s, box-shadow 0.2s, transform 0.1s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }
  .auth-submit:hover:not(:disabled) {
    background: #A8192B;
    box-shadow: 0 0 24px rgba(196,30,51,0.45);
  }
  .auth-submit:active:not(:disabled) {
    transform: scale(0.97);
    background: #720F1A;
  }
  .auth-submit:disabled { opacity: 0.55; cursor: not-allowed; }

  /* Form cross-fade */
  .auth-form-wrap { transition: opacity 0.2s ease, transform 0.2s ease; }
  .auth-form-wrap.fading { opacity: 0; transform: translateY(-5px); }

  /* Error strip */
  .auth-error-strip {
    background: rgba(139,21,32,0.2);
    border: 1px solid rgba(196,30,51,0.45);
    border-radius: 8px;
    padding: 10px 12px;
    font-family: 'DM Sans', sans-serif;
    font-size: 0.78rem;
    color: #E87080;
    display: flex;
    align-items: center;
    gap: 8px;
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
  }

  /* Scrollable card in register mode */
  .auth-card-register {
    max-height: 92vh;
    overflow-y: auto;
    overflow-x: hidden;
  }
  .auth-card-register::-webkit-scrollbar       { width: 3px; }
  .auth-card-register::-webkit-scrollbar-track { background: transparent; }
  .auth-card-register::-webkit-scrollbar-thumb { background: rgba(139,21,32,0.5); border-radius: 3px; }

  /* Responsive name row stack */
  @media (max-width: 500px) {
    .auth-name-row { grid-template-columns: 1fr !important; }
  }
`;


/* ─── Shared label style ─────────────────────────────────────────────────────── */
const labelStyle = {
  display: 'block',
  fontFamily: "'DM Sans', sans-serif",
  fontSize: '0.67rem',
  fontWeight: 500,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: 'rgba(245,240,239,0.4)',
  marginBottom: '7px',
};

/* ─── Logic helpers (preserved) ─────────────────────────────────────────────── */
function calcPasswordStrength(pw) {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score;
}

const strengthColors = ['rgba(255,255,255,0.07)', '#8B1520', '#C41E33', '#1A7A4A', '#1A7A4A'];

function PasswordStrengthBar({ password }) {
  const s = calcPasswordStrength(password);
  return (
    <div style={{ display: 'flex', gap: '3px', marginTop: '6px', height: '2px' }}>
      {[0, 1, 2, 3].map((i) => (
        <div key={i} style={{
          flex: 1, borderRadius: '99px',
          background: i < s ? strengthColors[s] : 'rgba(255,255,255,0.07)',
          transition: 'background 0.3s',
        }} />
      ))}
    </div>
  );
}

function validateUsername(val) {
  if (!val) return null;
  if (val.length < 8 || val.length > 12) return 'Must be 8–12 characters';
  if (/\s/.test(val)) return 'No spaces allowed';
  return '';
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* ─── Atoms ──────────────────────────────────────────────────────────────────── */
function FieldError({ msg }) {
  if (!msg) return null;
  return (
    <p style={{
      display: 'flex', alignItems: 'center', gap: '4px',
      marginTop: '5px', fontSize: '0.7rem', color: '#E87080',
      fontFamily: "'DM Sans', sans-serif",
    }}>
      <AlertCircle size={11} style={{ flexShrink: 0 }} />
      {msg}
    </p>
  );
}

const EyeOpen = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeClosed = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);


/* ═══════════════════════════════════════════════════════════════
   LOGIN FORM — logic preserved verbatim
═══════════════════════════════════════════════════════════════ */
function LoginForm({ onShake, onSwitchTab }) {
  const navigate = useNavigate();
  const { login: storeLogin } = useAuthStore();
  const addToast = useToastStore((s) => s.addToast);

  const [email,        setEmail]        = useState('');
  const [password,     setPassword]     = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState('');
  const [touched,      setTouched]      = useState({ email: false, password: false });

  const emailError    = touched.email    && !EMAIL_RE.test(email.trim()) ? 'Enter a valid email address.' : '';
  const passwordError = touched.password && password.length < 1          ? 'Password is required.'        : '';
  const canSubmit     = EMAIL_RE.test(email.trim()) && password.length >= 1 && !loading;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched({ email: true, password: true });
    if (!canSubmit) return;
    setError('');
    setLoading(true);
    try {
      const res = await login({ email: email.trim(), password });
      storeLogin(res.data.user, res.data.token);
      socket.auth = { token: res.data.token };
      socket.connect();
      addToast({ message: `Welcome back, ${res.data.user.first_name}!`, type: 'success' });
      navigate('/');
    } catch (err) {
      const msg = err.response?.data?.error || 'Something went wrong';
      setError(msg);
      onShake?.();
    } finally {
      setLoading(false);
    }
  };

  const eyeBtn = {
    position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
    background: 'none', border: 'none', cursor: 'pointer', padding: '4px',
    color: showPassword ? '#C41E33' : 'rgba(245,240,239,0.35)',
    display: 'flex', alignItems: 'center', transition: 'color 0.15s',
  };

  return (
    <div>
      <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 700, fontSize: '1.75rem', color: '#F5F0EF', marginBottom: '0.3rem', lineHeight: 1.1 }}>
        Welcome back.
      </h2>
      <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 300, fontSize: '0.8rem', color: 'rgba(245,240,239,0.45)', marginBottom: '1.6rem' }}>
        Enter your credentials to continue.
      </p>

      <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Email */}
        <div>
          <label style={labelStyle}>Email</label>
          <input
            type="email" className="auth-input"
            value={email} onChange={(e) => setEmail(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, email: true }))}
            autoComplete="email" autoFocus placeholder="you@example.com"
            style={{ borderColor: emailError ? '#8B1520' : undefined, caretColor: '#C41E33' }}
          />
          <FieldError msg={emailError} />
        </div>

        {/* Password */}
        <div>
          <label style={labelStyle}>Password</label>
          <div style={{ position: 'relative' }}>
            <input
              type={showPassword ? 'text' : 'password'} className="auth-input"
              value={password} onChange={(e) => setPassword(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, password: true }))}
              autoComplete="current-password" placeholder="••••••••"
              style={{ paddingRight: '44px', borderColor: passwordError ? '#8B1520' : undefined, caretColor: '#C41E33' }}
            />
            <button type="button" tabIndex={-1} onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'} style={eyeBtn}>
              {showPassword ? <EyeOpen /> : <EyeClosed />}
            </button>
          </div>
          <FieldError msg={passwordError} />
        </div>

        {/* Forgot */}
        <div style={{ textAlign: 'right', marginTop: '-4px' }}>
          <a href="#" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.73rem', color: '#C41E33', textDecoration: 'none', transition: 'opacity 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.65'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
            Forgot password?
          </a>
        </div>

        {/* Error */}
        {error && (
          <div className="auth-error-strip">
            <AlertCircle size={14} style={{ flexShrink: 0 }} />
            {error}
          </div>
        )}

        <button type="submit" className="auth-submit" disabled={!canSubmit}>
          {loading && <Loader2 size={14} className="animate-spin" />}
          {loading ? 'Signing in…' : 'Sign In'}
        </button>
      </form>

      <p style={{ textAlign: 'center', marginTop: '1.4rem', fontSize: '0.78rem', fontFamily: "'DM Sans', sans-serif", color: 'rgba(245,240,239,0.45)' }}>
        Don't have an account?{' '}
        <button type="button" onClick={onSwitchTab} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: '#C41E33', fontFamily: "'DM Sans', sans-serif",
          fontSize: '0.78rem', padding: 0, transition: 'opacity 0.15s',
        }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.7'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
          Sign up
        </button>
      </p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   REGISTER FORM — logic preserved verbatim
═══════════════════════════════════════════════════════════════ */
function RegisterForm({ onShake, onSwitchTab }) {
  const navigate = useNavigate();
  const { login: storeLogin } = useAuthStore();
  const addToast = useToastStore((s) => s.addToast);

  const [firstName,    setFirstName]    = useState('');
  const [lastName,     setLastName]     = useState('');
  const [username,     setUsername]     = useState('');
  const [email,        setEmail]        = useState('');
  const [password,     setPassword]     = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [dob,          setDob]          = useState('');
  const [gender,       setGender]       = useState('');
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState('');
  const [touched, setTouched] = useState({
    firstName: false, lastName: false, username: false, email: false, password: false,
  });

  const touch = (field) => setTouched((t) => ({ ...t, [field]: true }));

  const firstNameError = touched.firstName && !firstName.trim()            ? 'First name is required.'                  : '';
  const lastNameError  = touched.lastName  && !lastName.trim()             ? 'Last name is required.'                   : '';
  const usernameValErr = validateUsername(username);
  const usernameError  = touched.username  && usernameValErr               ? usernameValErr                             : '';
  const usernameValid  = username.length > 0 && !usernameValErr;
  const emailError     = touched.email     && !EMAIL_RE.test(email.trim()) ? 'Enter a valid email address.'             : '';
  const passwordError  = touched.password  && password.length < 8          ? 'Password must be at least 8 characters.' : '';

  const canSubmit =
    firstName.trim() && lastName.trim() && usernameValid &&
    EMAIL_RE.test(email.trim()) && password.length >= 8 && !loading;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched({ firstName: true, lastName: true, username: true, email: true, password: true });
    if (!canSubmit) return;
    setError('');
    setLoading(true);
    try {
      const payload = {
        first_name: firstName.trim(), last_name: lastName.trim(),
        username, email: email.trim(), password,
      };
      if (dob)    payload.date_of_birth = dob;
      if (gender) payload.gender = gender;
      const res = await register(payload);
      storeLogin(res.data.user, res.data.token);
      socket.auth = { token: res.data.token };
      socket.connect();
      addToast({ message: `Welcome, ${res.data.user.first_name}!`, type: 'success' });
      navigate('/');
    } catch (err) {
      const msg = err.response?.data?.error || 'Something went wrong';
      setError(msg);
      onShake?.();
    } finally {
      setLoading(false);
    }
  };

  const eyeBtn = {
    position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
    background: 'none', border: 'none', cursor: 'pointer', padding: '4px',
    color: showPassword ? '#C41E33' : 'rgba(245,240,239,0.35)',
    display: 'flex', alignItems: 'center', transition: 'color 0.15s',
  };

  return (
    <div>
      <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 700, fontSize: '1.75rem', color: '#F5F0EF', marginBottom: '0.3rem', lineHeight: 1.1 }}>
        Create your account.
      </h2>
      <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 300, fontSize: '0.8rem', color: 'rgba(245,240,239,0.45)', marginBottom: '1.6rem' }}>
        Fill in your details to get started.
      </p>

      <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* First + Last name */}
        <div className="auth-name-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div>
            <label style={labelStyle}>First Name</label>
            <input type="text" className="auth-input"
              value={firstName} onChange={(e) => setFirstName(e.target.value)} onBlur={() => touch('firstName')}
              placeholder="Jane" style={{ borderColor: firstNameError ? '#8B1520' : undefined }} />
            <FieldError msg={firstNameError} />
          </div>
          <div>
            <label style={labelStyle}>Last Name</label>
            <input type="text" className="auth-input"
              value={lastName} onChange={(e) => setLastName(e.target.value)} onBlur={() => touch('lastName')}
              placeholder="Smith" style={{ borderColor: lastNameError ? '#8B1520' : undefined }} />
            <FieldError msg={lastNameError} />
          </div>
        </div>

        {/* Username */}
        <div>
          <label style={labelStyle}>
            Username <span style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 300 }}>(8–12 chars)</span>
          </label>
          <div style={{ position: 'relative' }}>
            <input type="text" className="auth-input"
              value={username} onChange={(e) => setUsername(e.target.value)} onBlur={() => touch('username')}
              minLength={8} maxLength={12} placeholder="cooluser99"
              style={{ paddingRight: '36px', borderColor: usernameError ? '#8B1520' : usernameValid ? '#1A7A4A' : undefined }} />
            {username.length > 0 && (
              <span style={{ position: 'absolute', right: '11px', top: '50%', transform: 'translateY(-50%)' }}>
                {usernameValid ? <CheckCircle2 size={14} color="#1A7A4A" /> : <XCircle size={14} color="#8B1520" />}
              </span>
            )}
          </div>
          <FieldError msg={usernameError} />
        </div>

        {/* Email */}
        <div>
          <label style={labelStyle}>Email</label>
          <input type="email" className="auth-input"
            value={email} onChange={(e) => setEmail(e.target.value)} onBlur={() => touch('email')}
            autoComplete="email" placeholder="you@example.com"
            style={{ borderColor: emailError ? '#8B1520' : undefined, caretColor: '#C41E33' }} />
          <FieldError msg={emailError} />
        </div>

        {/* Password */}
        <div>
          <label style={labelStyle}>Password</label>
          <div style={{ position: 'relative' }}>
            <input type={showPassword ? 'text' : 'password'} className="auth-input"
              value={password} onChange={(e) => setPassword(e.target.value)} onBlur={() => touch('password')}
              autoComplete="new-password" minLength={8} placeholder="••••••••"
              style={{ paddingRight: '44px', borderColor: passwordError ? '#8B1520' : undefined, caretColor: '#C41E33' }} />
            <button type="button" tabIndex={-1} onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'} style={eyeBtn}>
              {showPassword ? <EyeOpen /> : <EyeClosed />}
            </button>
          </div>
          {password.length > 0 && <PasswordStrengthBar password={password} />}
          <FieldError msg={passwordError} />
        </div>

        {/* Date of birth */}
        <div>
          <label style={labelStyle}>
            Date of Birth <span style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 300, opacity: 0.7 }}>(optional)</span>
          </label>
          <input type="date" className="auth-input" value={dob} onChange={(e) => setDob(e.target.value)} />
        </div>

        {/* Gender */}
        <div>
          <label style={labelStyle}>
            Gender <span style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 300, opacity: 0.7 }}>(optional)</span>
          </label>
          <select className="auth-select" value={gender} onChange={(e) => setGender(e.target.value)}>
            <option value="">Prefer not to say</option>
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
          </select>
        </div>

        {/* Error */}
        {error && (
          <div className="auth-error-strip">
            <AlertCircle size={14} style={{ flexShrink: 0 }} />
            {error}
          </div>
        )}

        <button type="submit" className="auth-submit" disabled={!canSubmit}>
          {loading && <Loader2 size={14} className="animate-spin" />}
          {loading ? 'Creating account…' : 'Create Account'}
        </button>
      </form>

      <p style={{ textAlign: 'center', marginTop: '1.4rem', fontSize: '0.78rem', fontFamily: "'DM Sans', sans-serif", color: 'rgba(245,240,239,0.45)' }}>
        Already have an account?{' '}
        <button type="button" onClick={onSwitchTab} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: '#C41E33', fontFamily: "'DM Sans', sans-serif",
          fontSize: '0.78rem', padding: 0, transition: 'opacity 0.15s',
        }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.7'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
          Sign in
        </button>
      </p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   AUTH PAGE — glassmorphism card layout
═══════════════════════════════════════════════════════════════ */
export default function AuthPage({ mode }) {
  const navigate = useNavigate();

  const [activeTab,  setActiveTab]  = useState(mode);
  const [formFading, setFormFading] = useState(false);
  const [mounted,    setMounted]    = useState(false);
  const cardRef = useRef(null);

  // Card slide-up on first paint
  useEffect(() => {
    const raf = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  // Sync tab with direct URL navigation
  useEffect(() => {
    if (mode !== activeTab) setActiveTab(mode);
  }, [mode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Trigger horizontal shake via direct DOM animation (avoids CSS animation conflicts)
  const triggerShake = useCallback(() => {
    const el = cardRef.current;
    if (!el) return;
    el.style.animation = 'none';
    void el.offsetWidth;
    el.style.animation = 'cardShake 600ms cubic-bezier(0.36,0.07,0.19,0.97)';
    el.addEventListener('animationend', () => { el.style.animation = ''; }, { once: true });
  }, []);

  // Tab switch: fade out → swap content → fade in
  const switchTab = useCallback((tab) => {
    if (tab === activeTab) return;
    setFormFading(true);
    setTimeout(() => {
      setActiveTab(tab);
      setFormFading(false);
      navigate(`/${tab}`, { replace: true });
    }, 200);
  }, [activeTab, navigate]);

  const isLogin = activeTab === 'login';

  return (
    <div style={{ background: '#080607', minHeight: '100vh', position: 'relative' }}>
      <style>{AUTH_CSS}</style>

      <OrbBackground />

      {/* Scroll container */}
      <div style={{
        position: 'relative', zIndex: 10,
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1rem',
        boxSizing: 'border-box',
      }}>

        {/* Glass card */}
        <div
          ref={cardRef}
          className={activeTab === 'register' ? 'auth-card-register' : ''}
          style={{
            width: '440px',
            maxWidth: 'calc(100vw - 2rem)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            background: 'rgba(26,21,23,0.55)',
            border: '1px solid rgba(255,255,255,0.11)',
            borderRadius: '20px',
            boxShadow: '0 24px 64px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.11)',
            padding: '2.8rem 2.4rem',
            boxSizing: 'border-box',
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(20px)',
            transition: 'opacity 500ms ease-out, transform 500ms ease-out',
          }}
        >
          {/* App name + accent bar */}
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <h1 style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontWeight: 700, fontSize: '2.1rem',
              color: '#F5F0EF', letterSpacing: '0.05em',
              lineHeight: 1, marginBottom: '10px',
            }}>
              Sora Link
            </h1>
            <div style={{
              width: '38px', height: '2px', margin: '0 auto',
              background: 'linear-gradient(90deg, #8B1520, #C41E33)',
              borderRadius: '1px',
            }} />
          </div>

          {/* Pill tab switcher with sliding indicator */}
          <div style={{
            display: 'flex',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: '10px',
            overflow: 'hidden',
            position: 'relative',
            marginBottom: '2rem',
          }}>
            {/* Sliding fill */}
            <div style={{
              position: 'absolute',
              top: 0, left: 0, bottom: 0,
              width: '50%',
              background: '#C41E33',
              borderRadius: '9px',
              boxShadow: '0 2px 14px rgba(196,30,51,0.4)',
              transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              transform: isLogin ? 'translateX(0)' : 'translateX(100%)',
              pointerEvents: 'none',
            }} />
            {[
              { tab: 'login',    label: 'Sign In'  },
              { tab: 'register', label: 'Sign Up'  },
            ].map(({ tab, label }) => (
              <button
                key={tab}
                type="button"
                onClick={() => switchTab(tab)}
                style={{
                  flex: 1,
                  position: 'relative', zIndex: 1,
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: '0.8rem', fontWeight: 500,
                  letterSpacing: '0.05em',
                  color: activeTab === tab ? '#F5F0EF' : 'rgba(245,240,239,0.45)',
                  padding: '0.65rem 0',
                  transition: 'color 0.2s',
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Form content with crossfade */}
          <div className={`auth-form-wrap${formFading ? ' fading' : ''}`}>
            {isLogin
              ? <LoginForm    onShake={triggerShake} onSwitchTab={() => switchTab('register')} />
              : <RegisterForm onShake={triggerShake} onSwitchTab={() => switchTab('login')}    />
            }
          </div>
        </div>
      </div>
    </div>
  );
}
