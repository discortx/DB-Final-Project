import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AlertCircle, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { register, login } from '../api/auth';
import useAuthStore from '../store/authStore';
import useToastStore from '../store/toastStore';
import socket from '../socket';

/* ─── CSS injected once ──────────────────────────────────────────────────────── */
const AUTH_CSS = `
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: translateY(0);    }
  }
  @media (prefers-reduced-motion: reduce) {
    .auth-anim { animation: none !important; opacity: 1 !important; transform: none !important; }
  }
  .auth-input {
    transition: border-color 0.2s ease, background 0.2s ease;
    box-sizing: border-box;
  }
  .auth-input:focus {
    border-color: #8B1520 !important;
    background: rgba(139,21,32,0.06) !important;
    outline: none;
    box-shadow: none;
  }
  .auth-submit {
    background-color: #8B1520;
    background-image: linear-gradient(135deg, rgba(255,255,255,0.08) 0%, transparent 60%);
    transition: background-color 0.2s ease, transform 0.1s ease;
  }
  .auth-submit:hover:not(:disabled) { background-color: #A8192B; }
  .auth-submit:active:not(:disabled) { background-color: #720F1A; transform: scale(0.99); }
  .auth-submit:disabled { opacity: 0.45; cursor: not-allowed; }
  .auth-link:hover { opacity: 0.75; }
  .auth-gender-btn:hover { border-color: rgba(139,21,32,0.6) !important; }
  .auth-tab-link { transition: color 0.15s; }
  .auth-tab-link:hover { color: rgba(245,240,239,0.75) !important; }
`;

/* ─── Palette ────────────────────────────────────────────────────────────────── */
const C = {
  bg:      '#080607',
  left:    '#100D0E',
  crimson: '#8B1520',
  crimsonH:'#C41E33',
  white:   '#F5F0EF',
  muted:   'rgba(245,240,239,0.45)',
  hint:    'rgba(245,240,239,0.22)',
  inputBg: 'rgba(255,255,255,0.04)',
  border:  'rgba(255,255,255,0.07)',
};

/* ─── Animation helper ───────────────────────────────────────────────────────── */
// Returns inline style object for staggered fadeUp page-load animation.
// Elements start invisible and slide up on mount.
const anim = (delay, duration = '0.6s') => ({
  opacity: 0,
  animation: `fadeUp ${duration} cubic-bezier(0.16,1,0.3,1) ${delay} both`,
});

/* ─── Reused style objects ───────────────────────────────────────────────────── */
const labelStyle = {
  display: 'block',
  fontSize: '0.7rem',
  fontFamily: "'DM Sans', sans-serif",
  fontWeight: 400,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: C.muted,
  marginBottom: '8px',
};

const inputBase = {
  width: '100%',
  height: '48px',
  background: C.inputBg,
  border: `1px solid ${C.border}`,
  borderRadius: '4px',
  color: C.white,
  fontSize: '0.9rem',
  fontFamily: "'DM Sans', sans-serif",
  fontWeight: 300,
  padding: '0 14px',
  display: 'block',
};

/* ─── Preserved helpers (logic unchanged) ────────────────────────────────────── */
function calcPasswordStrength(pw) {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score;
}

const strengthColors = [C.border, '#8B1520', '#C41E33', '#1A7A4A', '#1A7A4A'];

function PasswordStrengthBar({ password }) {
  const s = calcPasswordStrength(password);
  return (
    <div style={{ display: 'flex', gap: '3px', marginTop: '6px', height: '2px' }}>
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          style={{
            flex: 1,
            borderRadius: '99px',
            background: i < s ? strengthColors[s] : C.border,
            transition: 'background 0.3s',
          }}
        />
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
      marginTop: '6px', fontSize: '0.72rem', color: C.crimsonH,
      fontFamily: "'DM Sans', sans-serif",
      opacity: msg ? 1 : 0, transition: 'opacity 0.15s',
    }}>
      <AlertCircle size={11} />
      {msg}
    </p>
  );
}

const EyeOpen = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeClosed = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

function LogoMark({ size = 38 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none">
      <path
        d="M56,24 C56,15 49,8 40,8 C31,8 24,15 24,24 C24,33 31,40 40,40"
        stroke="#8B1520" strokeWidth="11" strokeLinecap="round"
      />
      <path
        d="M40,40 C49,40 56,47 56,56 C56,65 49,72 40,72 C31,72 24,65 24,56"
        stroke="#F5F0EF" strokeWidth="11" strokeLinecap="round"
      />
    </svg>
  );
}

function SubmitBtn({ loading, disabled, children }) {
  return (
    <button
      type="submit"
      className="auth-submit"
      disabled={disabled}
      style={{
        width: '100%',
        height: '50px',
        borderRadius: '4px',
        border: 'none',
        color: C.white,
        fontFamily: "'DM Sans', sans-serif",
        fontWeight: 500,
        fontSize: '0.82rem',
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        cursor: 'pointer',
      }}
    >
      {loading && <Loader2 size={14} className="animate-spin" />}
      {children}
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════════
   LOGIN FORM — logic preserved verbatim, visual layer updated
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

  const emailError =
    touched.email && !EMAIL_RE.test(email.trim()) ? 'Enter a valid email address.' : '';
  const passwordError =
    touched.password && password.length < 1 ? 'Password is required.' : '';
  const canSubmit = EMAIL_RE.test(email.trim()) && password.length >= 1 && !loading;

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

  const eyeStyle = {
    position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
    background: 'none', border: 'none', cursor: 'pointer', padding: '4px',
    color: showPassword ? C.crimsonH : C.muted,
    display: 'flex', alignItems: 'center',
    transition: 'color 0.15s',
  };

  return (
    <div>
      {/* Heading */}
      <h1
        className="auth-anim"
        style={{
          fontFamily: "'Cormorant Garamond', serif", fontWeight: 700,
          fontSize: '2.2rem', color: C.white, marginBottom: '6px', lineHeight: 1.1,
          ...anim('0.25s', '0.6s'),
        }}
      >
        Welcome back.
      </h1>

      {/* Subheading */}
      <p
        className="auth-anim"
        style={{
          fontFamily: "'DM Sans', sans-serif", fontWeight: 300,
          fontSize: '0.82rem', color: C.muted, marginBottom: '2rem',
          ...anim('0.3s', '0.5s'),
        }}
      >
        Enter your credentials to continue.
      </p>

      <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>

        {/* Email */}
        <div className="auth-anim" style={anim('0.35s', '0.5s')}>
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
            style={{ ...inputBase, borderColor: emailError ? C.crimson : C.border, caretColor: C.crimsonH }}
          />
          <FieldError msg={emailError} />
        </div>

        {/* Password */}
        <div className="auth-anim" style={anim('0.42s', '0.5s')}>
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
              style={{ ...inputBase, paddingRight: '44px', borderColor: passwordError ? C.crimson : C.border, caretColor: C.crimsonH }}
            />
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              style={eyeStyle}
            >
              {showPassword ? <EyeOpen /> : <EyeClosed />}
            </button>
          </div>
          <FieldError msg={passwordError} />
        </div>

        {/* Forgot password */}
        <div className="auth-anim" style={{ textAlign: 'right', marginTop: '-4px', ...anim('0.49s', '0.5s') }}>
          <a
            href="#"
            className="auth-link"
            style={{ fontSize: '0.75rem', color: C.crimsonH, fontFamily: "'DM Sans', sans-serif", textDecoration: 'none' }}
          >
            Forgot password?
          </a>
        </div>

        {/* Server error */}
        {error && (
          <div style={{
            background: 'rgba(139,21,32,0.12)', border: `1px solid ${C.crimson}`,
            borderRadius: '4px', padding: '10px 12px', fontSize: '0.8rem',
            color: '#E05555', display: 'flex', alignItems: 'center', gap: '8px',
            fontFamily: "'DM Sans', sans-serif",
          }}>
            <AlertCircle size={14} className="shrink-0" />
            {error}
          </div>
        )}

        {/* Submit */}
        <div className="auth-anim" style={anim('0.55s', '0.5s')}>
          <SubmitBtn loading={loading} disabled={!canSubmit}>
            {loading ? 'Signing in…' : 'Sign in'}
          </SubmitBtn>
        </div>

      </form>

      <p
        className="auth-anim"
        style={{
          textAlign: 'center', marginTop: '1.6rem', fontSize: '0.78rem',
          color: C.muted, fontFamily: "'DM Sans', sans-serif",
          ...anim('0.62s', '0.5s'),
        }}
      >
        New to Sora Link?{' '}
        <Link to="/register" className="auth-link" style={{ color: C.crimsonH, textDecoration: 'none' }}>
          Create an account
        </Link>
      </p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   REGISTER FORM — logic preserved verbatim, visual layer updated
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

  const firstNameError  = touched.firstName && !firstName.trim()              ? 'First name is required.'                  : '';
  const lastNameError   = touched.lastName  && !lastName.trim()               ? 'Last name is required.'                   : '';
  const usernameValErr  = validateUsername(username);
  const usernameError   = touched.username  && usernameValErr                 ? usernameValErr                             : '';
  const usernameValid   = username.length > 0 && !usernameValErr;
  const emailError      = touched.email     && !EMAIL_RE.test(email.trim())   ? 'Enter a valid email address.'             : '';
  const passwordError   = touched.password  && password.length < 8            ? 'Password must be at least 8 characters.' : '';

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
        first_name: firstName.trim(),
        last_name:  lastName.trim(),
        username,
        email:      email.trim(),
        password,
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

  const eyeStyle = {
    position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
    background: 'none', border: 'none', cursor: 'pointer', padding: '4px',
    color: showPassword ? C.crimsonH : C.muted,
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
      <h1
        className="auth-anim"
        style={{
          fontFamily: "'Cormorant Garamond', serif", fontWeight: 700,
          fontSize: '2.2rem', color: C.white, marginBottom: '6px', lineHeight: 1.1,
          ...anim('0.25s', '0.6s'),
        }}
      >
        Create your account.
      </h1>
      <p
        className="auth-anim"
        style={{
          fontFamily: "'DM Sans', sans-serif", fontWeight: 300,
          fontSize: '0.82rem', color: C.muted, marginBottom: '1.6rem',
          ...anim('0.3s', '0.5s'),
        }}
      >
        Fill in your details to get started.
      </p>

      <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

        {/* First + Last name */}
        <div
          className="auth-anim"
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', ...anim('0.35s', '0.5s') }}
        >
          <div>
            <label style={labelStyle}>First Name</label>
            <input type="text" className="auth-input"
              value={firstName} onChange={(e) => setFirstName(e.target.value)} onBlur={() => touch('firstName')}
              placeholder="Jane"
              style={{ ...inputBase, borderColor: firstNameError ? C.crimson : C.border }}
            />
            <FieldError msg={firstNameError} />
          </div>
          <div>
            <label style={labelStyle}>Last Name</label>
            <input type="text" className="auth-input"
              value={lastName} onChange={(e) => setLastName(e.target.value)} onBlur={() => touch('lastName')}
              placeholder="Smith"
              style={{ ...inputBase, borderColor: lastNameError ? C.crimson : C.border }}
            />
            <FieldError msg={lastNameError} />
          </div>
        </div>

        {/* Username */}
        <div className="auth-anim" style={anim('0.42s', '0.5s')}>
          <label style={labelStyle}>
            Username{' '}
            <span style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 300 }}>(8–12 chars, no spaces)</span>
          </label>
          <div style={{ position: 'relative' }}>
            <input type="text" className="auth-input"
              value={username} onChange={(e) => setUsername(e.target.value)} onBlur={() => touch('username')}
              minLength={8} maxLength={12} placeholder="cooluser99"
              style={{
                ...inputBase,
                paddingRight: '36px',
                borderColor: usernameError
                  ? C.crimson
                  : username.length > 0 && usernameValid
                    ? '#1A7A4A'
                    : C.border,
              }}
            />
            {username.length > 0 && (
              <span style={{ position: 'absolute', right: '11px', top: '50%', transform: 'translateY(-50%)' }}>
                {usernameValid
                  ? <CheckCircle2 size={14} color="#1A7A4A" />
                  : <XCircle     size={14} color="#8B1520"  />}
              </span>
            )}
          </div>
          <FieldError msg={usernameError} />
        </div>

        {/* Email */}
        <div className="auth-anim" style={anim('0.49s', '0.5s')}>
          <label style={labelStyle}>Email</label>
          <input type="email" className="auth-input"
            value={email} onChange={(e) => setEmail(e.target.value)} onBlur={() => touch('email')}
            autoComplete="email" placeholder="you@example.com"
            style={{ ...inputBase, borderColor: emailError ? C.crimson : C.border }}
          />
          <FieldError msg={emailError} />
        </div>

        {/* Password */}
        <div className="auth-anim" style={anim('0.56s', '0.5s')}>
          <label style={labelStyle}>Password</label>
          <div style={{ position: 'relative' }}>
            <input type={showPassword ? 'text' : 'password'} className="auth-input"
              value={password} onChange={(e) => setPassword(e.target.value)} onBlur={() => touch('password')}
              autoComplete="new-password" minLength={8} placeholder="••••••••"
              style={{ ...inputBase, paddingRight: '44px', borderColor: passwordError ? C.crimson : C.border }}
            />
            <button type="button" tabIndex={-1} onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'} style={eyeStyle}>
              {showPassword ? <EyeOpen /> : <EyeClosed />}
            </button>
          </div>
          {password.length > 0 && <PasswordStrengthBar password={password} />}
          <FieldError msg={passwordError} />
        </div>

        {/* Date of birth */}
        <div className="auth-anim" style={anim('0.63s', '0.5s')}>
          <label style={labelStyle}>
            Date of Birth{' '}
            <span style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 300 }}>(optional)</span>
          </label>
          <input type="date" className="auth-input"
            value={dob} onChange={(e) => setDob(e.target.value)}
            style={{ ...inputBase, colorScheme: 'dark' }}
          />
        </div>

        {/* Gender */}
        <div className="auth-anim" style={anim('0.70s', '0.5s')}>
          <label style={{ ...labelStyle, marginBottom: '10px' }}>
            Gender{' '}
            <span style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 300 }}>(optional)</span>
          </label>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {genderOptions.map((opt) => (
              <button
                key={opt.label}
                type="button"
                className="auth-gender-btn"
                onClick={() => setGender(opt.value)}
                style={{
                  padding: '7px 14px',
                  border: `1px solid ${gender === opt.value ? C.crimson : C.border}`,
                  borderRadius: '4px',
                  background: gender === opt.value ? 'rgba(139,21,32,0.2)' : 'transparent',
                  color: gender === opt.value ? C.white : C.muted,
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Server error */}
        {error && (
          <div style={{
            background: 'rgba(139,21,32,0.12)', border: `1px solid ${C.crimson}`,
            borderRadius: '4px', padding: '10px 12px', fontSize: '0.8rem',
            color: '#E05555', display: 'flex', alignItems: 'center', gap: '8px',
            fontFamily: "'DM Sans', sans-serif",
          }}>
            <AlertCircle size={14} className="shrink-0" />
            {error}
          </div>
        )}

        {/* Submit */}
        <div className="auth-anim" style={anim('0.77s', '0.5s')}>
          <SubmitBtn loading={loading} disabled={!canSubmit}>
            {loading ? 'Creating account…' : 'Create account'}
          </SubmitBtn>
        </div>

      </form>

      <p
        className="auth-anim"
        style={{
          textAlign: 'center', marginTop: '1.6rem', fontSize: '0.78rem',
          color: C.muted, fontFamily: "'DM Sans', sans-serif",
          ...anim('0.84s', '0.5s'),
        }}
      >
        Already have an account?{' '}
        <Link to="/login" className="auth-link" style={{ color: C.crimsonH, textDecoration: 'none' }}>
          Sign in
        </Link>
      </p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   LEFT PANEL — atmosphere, depth, staggered animations
═══════════════════════════════════════════════════════════════ */
function LeftPanel() {
  return (
    <div style={{
      width: '100%',
      height: '100%',
      background: C.left,
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      padding: '3rem 3.5rem',
    }}>

      {/* Layer 1 — radial crimson glow */}
      <div aria-hidden="true" style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 60% 55% at 35% 55%, rgba(139,21,32,0.18) 0%, transparent 70%)',
      }} />

      {/* Layer 2 — diagonal dot-grid texture */}
      <div aria-hidden="true" style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.12) 1px, transparent 1px)',
        backgroundSize: '28px 28px',
        maskImage: 'linear-gradient(135deg, transparent 10%, rgba(0,0,0,0.65) 42%, transparent 72%)',
        WebkitMaskImage: 'linear-gradient(135deg, transparent 10%, rgba(0,0,0,0.65) 42%, transparent 72%)',
      }} />

      {/* Layer 3 — giant watermark S-shape */}
      <div aria-hidden="true" style={{
        position: 'absolute',
        right: '-60px',
        top: '50%',
        transform: 'translateY(-50%)',
        opacity: 0.05,
        pointerEvents: 'none',
      }}>
        <svg width="480" height="480" viewBox="0 0 80 80" fill="none">
          <path d="M56,24 C56,15 49,8 40,8 C31,8 24,15 24,24 C24,33 31,40 40,40"
            stroke="#F5F0EF" strokeWidth="11" strokeLinecap="round" />
          <path d="M40,40 C49,40 56,47 56,56 C56,65 49,72 40,72 C31,72 24,65 24,56"
            stroke="#F5F0EF" strokeWidth="11" strokeLinecap="round" />
        </svg>
      </div>

      {/* TOP — logo + brand name */}
      <div
        className="auth-anim"
        style={{
          position: 'relative', zIndex: 1,
          display: 'flex', alignItems: 'center', gap: '12px',
          ...anim('0s', '0.6s'),
        }}
      >
        <LogoMark size={38} />
        <span style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontWeight: 700,
          fontSize: '1.4rem',
          letterSpacing: '0.03em',
          color: C.white,
        }}>
          Sora Link
        </span>
      </div>

      {/* MIDDLE — tagline + divider + features */}
      <div style={{ position: 'relative', zIndex: 1 }}>

        {/* Tagline — each line animated separately */}
        <div style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontWeight: 700,
          fontSize: 'clamp(2.8rem, 4.5vw, 4.2rem)',
          lineHeight: 1.08,
          marginBottom: '1.5rem',
        }}>
          <div className="auth-anim" style={{ color: C.white,   ...anim('0.1s', '0.7s') }}>Connect.</div>
          <div className="auth-anim" style={{ color: C.white,   ...anim('0.2s', '0.7s') }}>Share.</div>
          <div className="auth-anim" style={{ color: C.crimsonH,...anim('0.3s', '0.7s') }}>Play.</div>
        </div>

        {/* Divider + feature list — animated as a unit */}
        <div className="auth-anim" style={anim('0.45s', '0.6s')}>
          <div style={{ width: '48px', height: '2px', background: C.crimson, marginBottom: '1.8rem' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
            {[
              'Friend graph with smart suggestions',
              'Real-time chat and group messaging',
              'Multiplayer games built in',
            ].map((text) => (
              <div key={text} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '6px', height: '6px',
                  borderRadius: '50%',
                  background: C.crimson,
                  flexShrink: 0,
                }} />
                <span style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontWeight: 300,
                  fontSize: '0.85rem',
                  color: C.muted,
                }}>
                  {text}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* BOTTOM — copyright */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        <p style={{
          fontSize: '0.75rem',
          color: C.hint,
          fontFamily: "'DM Sans', sans-serif",
          fontWeight: 300,
        }}>
          © 2025 Sora Link. All rights reserved.
        </p>
      </div>

    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   AUTH PAGE — root layout
═══════════════════════════════════════════════════════════════ */
export default function AuthPage({ mode }) {
  const isLogin = mode === 'login';

  return (
    <div className="h-screen overflow-hidden flex">
      <style>{AUTH_CSS}</style>

      {/* Left panel (hidden on mobile) */}
      <div className="hidden md:block" style={{ flex: '1.1', minWidth: 0 }}>
        <LeftPanel />
      </div>

      {/* 1px crimson-gradient divider */}
      <div className="hidden md:block" style={{
        width: '1px',
        flexShrink: 0,
        alignSelf: 'stretch',
        background: 'linear-gradient(to bottom, transparent 0%, #8B1520 50%, transparent 100%)',
      }} />

      {/* Right panel */}
      <div style={{
        flex: '0.9',
        background: C.bg,
        overflowY: 'auto',
        position: 'relative',
        scrollbarGutter: 'stable',
      }}>
        {/* Radial bg glow */}
        <div aria-hidden="true" style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse 50% 40% at 50% 50%, rgba(139,21,32,0.07) 0%, transparent 70%)',
        }} />

        {/* Centered form area */}
        <div style={{
          position: 'relative',
          zIndex: 1,
          minHeight: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '3rem 2rem',
        }}>
          <div style={{ width: '100%', maxWidth: '380px' }}>

            {/* Tab row */}
            <div
              className="auth-anim"
              style={{
                display: 'flex',
                borderBottom: `1px solid ${C.border}`,
                marginBottom: '2rem',
                ...anim('0.15s', '0.5s'),
              }}
            >
              {[
                { to: '/login',    label: 'Sign in',        active: isLogin  },
                { to: '/register', label: 'Create account', active: !isLogin },
              ].map((tab) => (
                <Link
                  key={tab.to}
                  to={tab.to}
                  className="auth-tab-link"
                  style={{
                    position: 'relative',
                    marginRight: tab.to === '/login' ? '1.6rem' : 0,
                    paddingBottom: '10px',
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: '0.82rem',
                    fontWeight: tab.active ? 500 : 400,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    color: tab.active ? C.white : C.muted,
                    textDecoration: 'none',
                  }}
                >
                  {tab.label}
                  {tab.active && (
                    <span style={{
                      position: 'absolute',
                      bottom: '-1px',
                      left: 0,
                      right: 0,
                      height: '2px',
                      background: C.crimsonH,
                    }} />
                  )}
                </Link>
              ))}
            </div>

            {isLogin ? <LoginForm /> : <RegisterForm />}

          </div>
        </div>
      </div>

    </div>
  );
}
