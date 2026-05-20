import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AlertCircle, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { register, login } from '../api/auth';
import useAuthStore from '../store/authStore';
import useToastStore from '../store/toastStore';
import socket from '../socket';

/* ─── Injected CSS ───────────────────────────────────────────────────────────── */
const AUTH_CSS = `
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: translateY(0);    }
  }

  @media (prefers-reduced-motion: reduce) {
    .auth-anim {
      animation: none !important;
      opacity: 1 !important;
      transform: none !important;
    }
  }

  /* ── Input ──────────────────────────────────────────────────────────── */
  .auth-input {
    width: 100%;
    height: 46px;
    background: #1A1517;
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 6px;
    color: #F5F0EF;
    font-family: 'DM Sans', sans-serif;
    font-size: 0.88rem;
    font-weight: 300;
    padding: 0 1rem;
    outline: none;
    box-sizing: border-box;
    transition: border-color 0.2s, background 0.2s, box-shadow 0.2s;
    display: block;
  }
  .auth-input:focus {
    border-color: #8B1520;
    background: rgba(139,21,32,0.06);
    box-shadow: 0 0 0 3px rgba(139,21,32,0.1);
  }
  .auth-input::placeholder { color: rgba(245,240,239,0.2); }
  .auth-input[type="date"] { color-scheme: dark; }
  .auth-input[type="date"]::-webkit-calendar-picker-indicator {
    filter: invert(1) opacity(0.3);
    cursor: pointer;
  }

  /* ── Submit button ──────────────────────────────────────────────────── */
  .auth-submit-btn {
    width: 100%;
    height: 48px;
    background: #8B1520;
    border: none;
    border-radius: 6px;
    color: #F5F0EF;
    font-family: 'DM Sans', sans-serif;
    font-size: 0.78rem;
    font-weight: 500;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    cursor: pointer;
    position: relative;
    overflow: hidden;
    transition: background-color 0.2s ease, transform 0.1s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }
  .auth-submit-btn::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.06) 50%, transparent 60%);
    background-size: 200% 100%;
    background-position: 100% 0;
    transition: background-position 0.4s ease;
    pointer-events: none;
  }
  .auth-submit-btn:hover:not(:disabled)         { background: #A8192B; }
  .auth-submit-btn:hover:not(:disabled)::after  { background-position: 0% 0; }
  .auth-submit-btn:active:not(:disabled)        { background: #720F1A; transform: scale(0.985); }
  .auth-submit-btn:disabled                     { opacity: 0.6; cursor: not-allowed; }

  /* ── Tab buttons ────────────────────────────────────────────────────── */
  .auth-tab-btn {
    flex: 1;
    background: none;
    border: none;
    cursor: pointer;
    padding: 0 0 0.9rem;
    font-family: 'DM Sans', sans-serif;
    font-size: 0.72rem;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: rgba(245,240,239,0.35);
    position: relative;
    transition: color 0.2s;
    text-align: center;
  }
  .auth-tab-btn.active { color: #F5F0EF; }
  .auth-tab-btn.active::after {
    content: '';
    position: absolute;
    bottom: -1px;
    left: 10%;
    right: 10%;
    height: 2px;
    background: linear-gradient(90deg, transparent, #C41E33, transparent);
    border-radius: 1px;
  }
  .auth-tab-btn:hover:not(.active) { color: rgba(245,240,239,0.65); }

  /* ── Card ───────────────────────────────────────────────────────────── */
  .auth-card {
    background: #141011;
    border: 1px solid rgba(139,21,32,0.35);
    border-radius: 16px;
    padding: 2.8rem 2.6rem;
    position: relative;
    width: 440px;
    max-width: calc(100vw - 2rem);
    box-sizing: border-box;
  }
  .auth-card::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background: radial-gradient(ellipse 80% 50% at 50% 0%, rgba(139,21,32,0.1) 0%, transparent 60%);
    pointer-events: none;
    z-index: 0;
  }
  .auth-card::after {
    content: '';
    position: absolute;
    top: 0;
    left: 15%;
    right: 15%;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(196,30,51,0.6), transparent);
    z-index: 1;
  }
  .auth-card-inner {
    position: relative;
    z-index: 2;
  }
  .auth-card.register-mode {
    max-height: 90vh;
    overflow-y: auto;
    overflow-x: hidden;
  }
  .auth-card::-webkit-scrollbar       { width: 3px; }
  .auth-card::-webkit-scrollbar-track { background: transparent; }
  .auth-card::-webkit-scrollbar-thumb { background: rgba(139,21,32,0.4); border-radius: 3px; }

  /* ── Form content transition (tab switch) ───────────────────────────── */
  .auth-form-content {
    transition: opacity 0.22s ease-out, transform 0.22s ease-out;
  }
  .auth-form-content.hidden {
    opacity: 0;
    transform: translateY(-6px);
  }

  /* ── Gender pills ───────────────────────────────────────────────────── */
  .auth-gender-pill {
    background: #1A1517;
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 20px;
    color: rgba(245,240,239,0.45);
    font-family: 'DM Sans', sans-serif;
    font-size: 0.78rem;
    font-weight: 400;
    padding: 7px 14px;
    cursor: pointer;
    transition: border-color 0.15s, color 0.15s, background 0.15s;
  }
  .auth-gender-pill:hover              { border-color: rgba(255,255,255,0.11); color: #F5F0EF; }
  .auth-gender-pill.selected           { background: rgba(139,21,32,0.15); border-color: rgba(196,30,51,0.5); color: #E87080; }

  /* ── Misc ───────────────────────────────────────────────────────────── */
  .auth-link              { color: #C41E33; text-decoration: none; transition: opacity 0.15s; }
  .auth-link:hover        { opacity: 0.7; }

  .auth-dot-grid {
    position: absolute;
    inset: 0;
    background-image: radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px);
    background-size: 28px 28px;
    opacity: 0.4;
    -webkit-mask-image: radial-gradient(ellipse 80% 80% at 50% 50%, black 30%, transparent 100%);
    mask-image: radial-gradient(ellipse 80% 80% at 50% 50%, black 30%, transparent 100%);
    pointer-events: none;
  }

  /* ── Responsive ─────────────────────────────────────────────────────── */
  @media (max-width: 480px) {
    .auth-card {
      width: calc(100vw - 1.5rem);
      padding: 2rem 1.4rem;
      border-radius: 12px;
      max-height: 90vh;
      overflow-y: auto;
    }
    .auth-name-row {
      grid-template-columns: 1fr !important;
    }
    .auth-page-wrap {
      align-items: flex-start !important;
      padding-top: 1.5rem;
      min-height: 100svh;
    }
  }
`;

/* ─── Animation helper ───────────────────────────────────────────────────────── */
const anim = (delay, duration = '0.5s') => ({
  opacity: 0,
  animation: `fadeUp ${duration} cubic-bezier(0.16,1,0.3,1) ${delay} both`,
});

/* ─── Shared label style ─────────────────────────────────────────────────────── */
const labelStyle = {
  display: 'block',
  fontSize: '0.65rem',
  fontFamily: "'DM Sans', sans-serif",
  fontWeight: 500,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: 'rgba(245,240,239,0.22)',
  marginBottom: '0.5rem',
};

/* ─── Preserved logic helpers ────────────────────────────────────────────────── */
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

/* ─── Small UI atoms ─────────────────────────────────────────────────────────── */
function FieldError({ msg }) {
  if (!msg) return null;
  return (
    <p style={{
      display: 'flex', alignItems: 'center', gap: '5px',
      marginTop: '4px', fontSize: '0.7rem', color: '#E87080',
      fontFamily: "'DM Sans', sans-serif",
      opacity: 1, transition: 'opacity 0.15s',
    }}>
      <AlertCircle size={11} />
      {msg}
    </p>
  );
}

const EyeOpen = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeClosed = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

function LogoMark({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none">
      <path d="M56,24 C56,15 49,8 40,8 C31,8 24,15 24,24 C24,33 31,40 40,40"
        stroke="#8B1520" strokeWidth="11" strokeLinecap="round" />
      <path d="M40,40 C49,40 56,47 56,56 C56,65 49,72 40,72 C31,72 24,65 24,56"
        stroke="#F5F0EF" strokeWidth="11" strokeLinecap="round" />
    </svg>
  );
}

function SubmitBtn({ loading, disabled, children }) {
  return (
    <button type="submit" className="auth-submit-btn" disabled={disabled}>
      {loading && <Loader2 size={14} className="animate-spin" />}
      {children}
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════════
   LOGIN FORM — logic preserved verbatim
═══════════════════════════════════════════════════════════════ */
function LoginForm() {
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
      setError(err.response?.data?.error || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const eyeBtn = {
    position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
    background: 'none', border: 'none', cursor: 'pointer', padding: '4px',
    color: showPassword ? '#C41E33' : 'rgba(245,240,239,0.22)',
    display: 'flex', alignItems: 'center',
    transition: 'color 0.15s',
  };

  return (
    <div>
      {/* Heading */}
      <h1 className="auth-anim" style={{
        fontFamily: "'Cormorant Garamond', serif", fontWeight: 700,
        fontSize: '2rem', color: '#F5F0EF', marginBottom: '0.3rem', lineHeight: 1.1,
        ...anim('0.4s', '0.5s'),
      }}>
        Welcome back.
      </h1>

      {/* Subtext */}
      <p className="auth-anim" style={{
        fontFamily: "'DM Sans', sans-serif", fontWeight: 300,
        fontSize: '0.8rem', color: 'rgba(245,240,239,0.45)', marginBottom: '1.8rem',
        ...anim('0.45s', '0.4s'),
      }}>
        Enter your credentials to continue.
      </p>

      <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

        {/* Email */}
        <div className="auth-anim" style={anim('0.5s', '0.4s')}>
          <label style={labelStyle}>Email</label>
          <input
            type="email"
            className="auth-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, email: true }))}
            autoComplete="email"
            autoFocus
            placeholder="you@example.com"
            style={{ borderColor: emailError ? '#8B1520' : undefined, caretColor: '#C41E33' }}
          />
          <FieldError msg={emailError} />
        </div>

        {/* Password */}
        <div className="auth-anim" style={anim('0.56s', '0.4s')}>
          <label style={labelStyle}>Password</label>
          <div style={{ position: 'relative' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              className="auth-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, password: true }))}
              autoComplete="current-password"
              placeholder="••••••••"
              style={{ paddingRight: '44px', borderColor: passwordError ? '#8B1520' : undefined, caretColor: '#C41E33' }}
            />
            <button type="button" tabIndex={-1} aria-label={showPassword ? 'Hide password' : 'Show password'}
              onClick={() => setShowPassword((v) => !v)} style={eyeBtn}>
              {showPassword ? <EyeOpen /> : <EyeClosed />}
            </button>
          </div>
          <FieldError msg={passwordError} />
        </div>

        {/* Forgot password */}
        <div className="auth-anim" style={{ textAlign: 'right', marginTop: '0.2rem', ...anim('0.62s', '0.4s') }}>
          <a href="#" className="auth-link"
            style={{ fontSize: '0.73rem', fontFamily: "'DM Sans', sans-serif", fontWeight: 400 }}>
            Forgot password?
          </a>
        </div>

        {/* Server error */}
        {error && (
          <div style={{
            background: 'rgba(139,21,32,0.12)', border: '1px solid #8B1520',
            borderRadius: '6px', padding: '10px 12px',
            fontSize: '0.78rem', color: '#E87080',
            display: 'flex', alignItems: 'center', gap: '8px',
            fontFamily: "'DM Sans', sans-serif",
          }}>
            <AlertCircle size={14} style={{ flexShrink: 0 }} />
            {error}
          </div>
        )}

        {/* Submit */}
        <div className="auth-anim" style={{ marginTop: '0.4rem', ...anim('0.7s', '0.4s') }}>
          <SubmitBtn loading={loading} disabled={!canSubmit}>
            {loading ? 'Signing in…' : 'Sign in'}
          </SubmitBtn>
        </div>

      </form>

      {/* Bottom row */}
      <p className="auth-anim" style={{
        textAlign: 'center', marginTop: '1.4rem',
        fontSize: '0.78rem', fontWeight: 300,
        color: 'rgba(245,240,239,0.45)', fontFamily: "'DM Sans', sans-serif",
        ...anim('0.76s', '0.35s'),
      }}>
        New to Sora Link?{' '}
        <Link to="/register" className="auth-link">Create an account</Link>
      </p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   REGISTER FORM — logic preserved verbatim
═══════════════════════════════════════════════════════════════ */
function RegisterForm() {
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
  const [gender,       setGender]       = useState(null);
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
      setError(err.response?.data?.error || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const eyeBtn = {
    position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
    background: 'none', border: 'none', cursor: 'pointer', padding: '4px',
    color: showPassword ? '#C41E33' : 'rgba(245,240,239,0.22)',
    display: 'flex', alignItems: 'center',
    transition: 'color 0.15s',
  };

  const genderOptions = [
    { label: 'Male',              value: 'MALE'   },
    { label: 'Female',            value: 'FEMALE' },
    { label: 'Prefer not to say', value: null     },
  ];

  return (
    <div>
      {/* Heading */}
      <h1 className="auth-anim" style={{
        fontFamily: "'Cormorant Garamond', serif", fontWeight: 700,
        fontSize: '2rem', color: '#F5F0EF', marginBottom: '0.3rem', lineHeight: 1.1,
        ...anim('0.4s', '0.5s'),
      }}>
        Create your account.
      </h1>

      {/* Subtext */}
      <p className="auth-anim" style={{
        fontFamily: "'DM Sans', sans-serif", fontWeight: 300,
        fontSize: '0.8rem', color: 'rgba(245,240,239,0.45)', marginBottom: '1.8rem',
        ...anim('0.45s', '0.4s'),
      }}>
        Fill in your details to get started.
      </p>

      <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

        {/* First + Last name */}
        <div className="auth-anim auth-name-row"
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', ...anim('0.5s', '0.4s') }}>
          <div>
            <label style={labelStyle}>First Name</label>
            <input type="text" className="auth-input"
              value={firstName} onChange={(e) => setFirstName(e.target.value)} onBlur={() => touch('firstName')}
              placeholder="Jane"
              style={{ borderColor: firstNameError ? '#8B1520' : undefined }} />
            <FieldError msg={firstNameError} />
          </div>
          <div>
            <label style={labelStyle}>Last Name</label>
            <input type="text" className="auth-input"
              value={lastName} onChange={(e) => setLastName(e.target.value)} onBlur={() => touch('lastName')}
              placeholder="Smith"
              style={{ borderColor: lastNameError ? '#8B1520' : undefined }} />
            <FieldError msg={lastNameError} />
          </div>
        </div>

        {/* Username */}
        <div className="auth-anim" style={anim('0.56s', '0.4s')}>
          <label style={labelStyle}>Username</label>
          <div style={{ position: 'relative' }}>
            <input type="text" className="auth-input"
              value={username} onChange={(e) => setUsername(e.target.value)} onBlur={() => touch('username')}
              minLength={8} maxLength={12} placeholder="cooluser99"
              style={{
                paddingRight: '36px',
                borderColor: usernameError ? '#8B1520' : usernameValid ? '#1A7A4A' : undefined,
              }} />
            {username.length > 0 && (
              <span style={{ position: 'absolute', right: '11px', top: '50%', transform: 'translateY(-50%)' }}>
                {usernameValid
                  ? <CheckCircle2 size={14} color="#1A7A4A" />
                  : <XCircle     size={14} color="#8B1520"  />}
              </span>
            )}
          </div>
          <p style={{ marginTop: '4px', fontSize: '0.68rem', color: 'rgba(245,240,239,0.22)', fontFamily: "'DM Sans', sans-serif" }}>
            8–12 characters, no spaces
          </p>
          <FieldError msg={usernameError} />
        </div>

        {/* Email */}
        <div className="auth-anim" style={anim('0.62s', '0.4s')}>
          <label style={labelStyle}>Email</label>
          <input type="email" className="auth-input"
            value={email} onChange={(e) => setEmail(e.target.value)} onBlur={() => touch('email')}
            autoComplete="email" placeholder="you@example.com"
            style={{ borderColor: emailError ? '#8B1520' : undefined, caretColor: '#C41E33' }} />
          <FieldError msg={emailError} />
        </div>

        {/* Password */}
        <div className="auth-anim" style={anim('0.68s', '0.4s')}>
          <label style={labelStyle}>Password</label>
          <div style={{ position: 'relative' }}>
            <input type={showPassword ? 'text' : 'password'} className="auth-input"
              value={password} onChange={(e) => setPassword(e.target.value)} onBlur={() => touch('password')}
              autoComplete="new-password" minLength={8} placeholder="••••••••"
              style={{ paddingRight: '44px', borderColor: passwordError ? '#8B1520' : undefined, caretColor: '#C41E33' }} />
            <button type="button" tabIndex={-1} aria-label={showPassword ? 'Hide password' : 'Show password'}
              onClick={() => setShowPassword((v) => !v)} style={eyeBtn}>
              {showPassword ? <EyeOpen /> : <EyeClosed />}
            </button>
          </div>
          {password.length > 0 && <PasswordStrengthBar password={password} />}
          <FieldError msg={passwordError} />
        </div>

        {/* Date of birth */}
        <div className="auth-anim" style={anim('0.74s', '0.4s')}>
          <label style={labelStyle}>Date of Birth <span style={{ textTransform: 'none', letterSpacing: 0, opacity: 0.6 }}>(optional)</span></label>
          <input type="date" className="auth-input" value={dob} onChange={(e) => setDob(e.target.value)} />
        </div>

        {/* Gender */}
        <div className="auth-anim" style={anim('0.80s', '0.4s')}>
          <label style={{ ...labelStyle, marginBottom: '10px' }}>
            Gender <span style={{ textTransform: 'none', letterSpacing: 0, opacity: 0.6 }}>(optional)</span>
          </label>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {genderOptions.map((opt) => (
              <button key={opt.label} type="button"
                className={`auth-gender-pill${gender === opt.value ? ' selected' : ''}`}
                onClick={() => setGender(opt.value)}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Server error */}
        {error && (
          <div style={{
            background: 'rgba(139,21,32,0.12)', border: '1px solid #8B1520',
            borderRadius: '6px', padding: '10px 12px',
            fontSize: '0.78rem', color: '#E87080',
            display: 'flex', alignItems: 'center', gap: '8px',
            fontFamily: "'DM Sans', sans-serif",
          }}>
            <AlertCircle size={14} style={{ flexShrink: 0 }} />
            {error}
          </div>
        )}

        {/* Submit */}
        <div className="auth-anim" style={{ marginTop: '0.4rem', ...anim('0.88s', '0.4s') }}>
          <SubmitBtn loading={loading} disabled={!canSubmit}>
            {loading ? 'Creating account…' : 'Create account'}
          </SubmitBtn>
        </div>

      </form>

      {/* Bottom row */}
      <p className="auth-anim" style={{
        textAlign: 'center', marginTop: '1.4rem',
        fontSize: '0.78rem', fontWeight: 300,
        color: 'rgba(245,240,239,0.45)', fontFamily: "'DM Sans', sans-serif",
        ...anim('0.94s', '0.35s'),
      }}>
        Already have an account?{' '}
        <Link to="/login" className="auth-link">Sign in</Link>
      </p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   AUTH PAGE — centered card layout
═══════════════════════════════════════════════════════════════ */
export default function AuthPage({ mode }) {
  const navigate = useNavigate();
  const isLogin = mode === 'login';

  /* Tab switch animation state */
  const [displayedMode, setDisplayedMode] = useState(mode);
  const [formVisible,   setFormVisible]   = useState(true);

  useEffect(() => {
    if (mode === displayedMode) return;
    setFormVisible(false);
    const t = setTimeout(() => {
      setDisplayedMode(mode);
      setFormVisible(true);
    }, 220);
    return () => clearTimeout(t);
  }, [mode]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleTabClick = (path) => {
    if (path === `/${mode}`) return;
    navigate(path);
  };

  return (
    <div style={{ background: '#080607', minHeight: '100vh', position: 'relative', overflow: 'hidden' }}>
      <style>{AUTH_CSS}</style>

      {/* ── Background layers ──────────────────────────────────────────── */}

      {/* Layer 1 — upper-left radial glow */}
      <div aria-hidden="true" style={{
        position: 'fixed', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 70% 60% at 30% 40%, rgba(139,21,32,0.12) 0%, transparent 65%)',
      }} />

      {/* Layer 2 — lower-right radial glow */}
      <div aria-hidden="true" style={{
        position: 'fixed', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 40% 35% at 75% 70%, rgba(139,21,32,0.07) 0%, transparent 60%)',
      }} />

      {/* Layer 3 — dot grid */}
      <div aria-hidden="true" className="auth-dot-grid" style={{ position: 'fixed' }} />

      {/* Layer 4 — watermark S-logo */}
      <div aria-hidden="true" style={{
        position: 'fixed',
        top: '50%', left: '50%',
        transform: 'translate(calc(-50% - 80px), calc(-50% - 40px))',
        opacity: 0.04,
        pointerEvents: 'none',
        zIndex: 0,
      }}>
        <svg width="600" height="600" viewBox="0 0 80 80" fill="none">
          <path d="M56,24 C56,15 49,8 40,8 C31,8 24,15 24,24 C24,33 31,40 40,40"
            stroke="#F5F0EF" strokeWidth="11" strokeLinecap="round" />
          <path d="M40,40 C49,40 56,47 56,56 C56,65 49,72 40,72 C31,72 24,65 24,56"
            stroke="#F5F0EF" strokeWidth="11" strokeLinecap="round" />
        </svg>
      </div>

      {/* ── Page content ───────────────────────────────────────────────── */}
      <div className="auth-page-wrap" style={{
        position: 'relative', zIndex: 1,
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1rem',
        boxSizing: 'border-box',
      }}>

        {/* Card */}
        <div
          className={`auth-card auth-anim${displayedMode === 'register' ? ' register-mode' : ''}`}
          style={anim('0.05s', '0.7s')}
        >
          <div className="auth-card-inner">

            {/* ── Brand header ─────────────────────────────────────────── */}
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <div className="auth-anim" style={{ display: 'inline-block', ...anim('0.2s', '0.5s') }}>
                <LogoMark size={36} />
              </div>
              <p className="auth-anim" style={{
                fontFamily: "'Cormorant Garamond', serif", fontWeight: 700,
                fontSize: '1.25rem', color: '#F5F0EF',
                letterSpacing: '0.05em', marginTop: '8px',
                ...anim('0.28s', '0.5s'),
              }}>
                Sora Link
              </p>
            </div>

            {/* ── Tab row ──────────────────────────────────────────────── */}
            <div className="auth-anim" style={{
              display: 'flex',
              borderBottom: '1px solid rgba(255,255,255,0.07)',
              marginBottom: '2rem',
              ...anim('0.35s', '0.5s'),
            }}>
              <button
                type="button"
                className={`auth-tab-btn${isLogin ? ' active' : ''}`}
                onClick={() => handleTabClick('/login')}
              >
                Sign In
              </button>
              <button
                type="button"
                className={`auth-tab-btn${!isLogin ? ' active' : ''}`}
                onClick={() => handleTabClick('/register')}
              >
                Create Account
              </button>
            </div>

            {/* ── Form content (with tab-switch transition) ─────────────── */}
            <div className={`auth-form-content${formVisible ? '' : ' hidden'}`}>
              {displayedMode === 'login' ? <LoginForm /> : <RegisterForm />}
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
