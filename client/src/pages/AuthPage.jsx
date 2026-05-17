import { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  AlertCircle,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { register, login } from '../api/auth';
import useAuthStore from '../store/authStore';
import useToastStore from '../store/toastStore';
import socket from '../socket';
import Button from '../components/ui/Button';

/* ── CSS injected once for particle keyframe ── */
const PARTICLE_CSS = `
@keyframes particle-float {
  0%   { transform: translateY(0) translateX(0); opacity: 0; }
  10%  { opacity: 0.7; }
  90%  { opacity: 0.3; }
  100% { transform: translateY(-110vh) translateX(var(--drift)); opacity: 0; }
}
@keyframes blob-pulse {
  0%,100% { opacity:1; transform:scale(1); }
  50%      { opacity:0.5; transform:scale(1.12); }
}
@keyframes dot-blink {
  0%,100% { opacity:1; transform:scale(1); }
  50%      { opacity:0.3; transform:scale(0.65); }
}
`;

/* ── Helpers ── */
function calcPasswordStrength(pw) {
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return s;
}

const strengthColors = [
  'bg-[#E0E0E0]',
  'bg-[#CC0000]',
  'bg-[#FF6600]',
  'bg-[#1A7A4A]',
  'bg-[#1A7A4A]',
];

function PasswordStrengthBar({ password }) {
  const s = calcPasswordStrength(password);
  return (
    <div className="flex gap-0.5 mt-1.5 h-1">
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className={`flex-1 rounded-full transition-colors duration-300 ${
            i < s ? strengthColors[s] : 'bg-[#E0E0E0]'
          }`}
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

/* ── Shared field / label styles ── */
const fieldCls = (hasError) =>
  `w-full bg-white rounded-[10px] px-3.5 py-2.5 text-sm placeholder:text-[#9CA3AF] focus:outline-none transition-colors duration-150 border-[1.5px] ${
    hasError
      ? 'border-[#EF4444] focus:ring-2 focus:ring-[#EF4444]/10 focus:border-[#EF4444]'
      : 'border-[#D1D5DB] focus:border-[#111827] focus:ring-2 focus:ring-[#111827]/8'
  }`;

const labelCls =
  'block text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[#374151] mb-1.5';

function InlineError({ id, msg }) {
  if (!msg) return null;
  return (
    <p id={id} className="text-[11.5px] text-[#EF4444] mt-1 flex items-center gap-1">
      <AlertCircle size={12} className="shrink-0" />
      {msg}
    </p>
  );
}

/* ─────────────────────────────────────────────────────────────
   LOGIN FORM
───────────────────────────────────────────────────────────── */
function LoginForm() {
  const navigate   = useNavigate();
  const { login: storeLogin } = useAuthStore();
  const addToast   = useToastStore((s) => s.addToast);

  const [email,        setEmail]        = useState('');
  const [password,     setPassword]     = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState('');
  const [touched,      setTouched]      = useState({ email: false, password: false });

  const emailError    = touched.email    && !EMAIL_RE.test(email.trim()) ? 'Enter a valid email address.' : '';
  const passwordError = touched.password && password.length < 1          ? 'Password is required.'       : '';
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

  return (
    <>
      <h1 style={{ fontFamily: "'Syne', sans-serif" }}
        className="font-bold text-[26px] tracking-tight text-[#111827] mb-1 leading-[1.2]">
        Welcome back.
      </h1>
      <p className="text-[13.5px] text-[#9CA3AF] mb-6 leading-snug">
        Enter your credentials to continue.
      </p>

      <form onSubmit={handleSubmit} noValidate className="space-y-4">

        {/* Email */}
        <div>
          <label htmlFor="login-email" className={labelCls}>Email</label>
          <input
            id="login-email"
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); }}
            onBlur={() => setTouched((t) => ({ ...t, email: true }))}
            autoComplete="email"
            autoFocus
            placeholder="you@example.com"
            aria-invalid={!!emailError}
            className={fieldCls(!!emailError)}
          />
          <InlineError id="login-email-error" msg={emailError} />
        </div>

        {/* Password */}
        <div>
          <label htmlFor="login-password" className={labelCls}>Password</label>
          <div className="relative">
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, password: true }))}
              autoComplete="current-password"
              placeholder="Your password"
              aria-invalid={!!passwordError}
              className={`${fieldCls(!!passwordError)} pr-11`}
            />
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#374151] transition-colors duration-150"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <InlineError id="login-password-error" msg={passwordError} />
        </div>

        {/* Forgot password */}
        <div className="flex justify-end -mt-1">
          <a href="#" className="text-[12px] text-[#374151] font-medium hover:text-[#111827] transition-colors duration-150">
            Forgot password?
          </a>
        </div>

        {/* Server error */}
        {error && (
          <div role="alert"
            className="bg-[#FFF0F0] border border-[#CC0000] rounded-lg p-3 text-sm text-[#CC0000] flex items-center gap-2">
            <AlertCircle size={15} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Submit */}
        <Button
          type="submit"
          variant="primary"
          loading={loading}
          disabled={!canSubmit}
          className="w-full py-2.5 !rounded-[10px]"
        >
          {loading ? 'Signing in…' : 'Sign In'}
        </Button>

      </form>

      {/* Divider */}
      <div className="flex items-center gap-3 my-5">
        <div className="flex-1 h-px bg-[#E5E7EB]" />
        <span className="text-[11.5px] text-[#9CA3AF] whitespace-nowrap">or continue with</span>
        <div className="flex-1 h-px bg-[#E5E7EB]" />
      </div>

      {/* Social */}
      <div className="flex gap-2.5 mb-5">
        <button type="button"
          className="flex-1 h-10 flex items-center justify-center gap-2 border-[1.5px] border-[#111827] rounded-[10px] text-[13px] font-medium text-[#111827] bg-white hover:bg-[#F9FAFB] hover:border-[#374151] transition-colors duration-150">
          <svg viewBox="0 0 24 24" className="w-4 h-4">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Google
        </button>
        <button type="button"
          className="flex-1 h-10 flex items-center justify-center gap-2 border-[1.5px] border-[#111827] rounded-[10px] text-[13px] font-medium text-[#111827] bg-white hover:bg-[#F9FAFB] hover:border-[#374151] transition-colors duration-150">
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057.1 18.08.114 18.1.134 18.113a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
          </svg>
          Discord
        </button>
      </div>

      <p className="text-center text-[12.5px] text-[#9CA3AF]">
        New to Sora Link?{' '}
        <Link to="/register" className="font-semibold text-[#111827] hover:text-[#374151] transition-colors duration-150">
          Create an account
        </Link>
      </p>
    </>
  );
}

/* ─────────────────────────────────────────────────────────────
   REGISTER FORM
───────────────────────────────────────────────────────────── */
function RegisterForm() {
  const navigate   = useNavigate();
  const { login: storeLogin } = useAuthStore();
  const addToast   = useToastStore((s) => s.addToast);

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

  const firstNameError        = touched.firstName && !firstName.trim()                ? 'First name is required.'             : '';
  const lastNameError         = touched.lastName  && !lastName.trim()                 ? 'Last name is required.'              : '';
  const usernameValidErr      = validateUsername(username);
  const usernameError         = touched.username  && usernameValidErr                 ? usernameValidErr                     : '';
  const usernameValid         = username.length > 0 && !usernameValidErr;
  const emailError            = touched.email     && !EMAIL_RE.test(email.trim())     ? 'Enter a valid email address.'        : '';
  const passwordError         = touched.password  && password.length < 8             ? 'Password must be at least 8 characters.' : '';

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

  const genderOptions = [
    { label: 'Male',             value: 'MALE'   },
    { label: 'Female',           value: 'FEMALE' },
    { label: 'Prefer not to say', value: null    },
  ];

  return (
    <>
      <h1 style={{ fontFamily: "'Syne', sans-serif" }}
        className="font-bold text-[26px] tracking-tight text-[#111827] mb-1 leading-[1.2]">
        Create your<br />account.
      </h1>
      <p className="text-[13.5px] text-[#9CA3AF] mb-6 leading-snug">
        Fill in your details to get started.
      </p>

      <form onSubmit={handleSubmit} noValidate className="space-y-3.5">

        {/* First + Last name */}
        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label htmlFor="reg-first" className={labelCls}>First Name</label>
            <input
              id="reg-first"
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              onBlur={() => touch('firstName')}
              placeholder="Jane"
              aria-invalid={!!firstNameError}
              className={fieldCls(!!firstNameError)}
            />
            <InlineError id="reg-first-error" msg={firstNameError} />
          </div>
          <div>
            <label htmlFor="reg-last" className={labelCls}>Last Name</label>
            <input
              id="reg-last"
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              onBlur={() => touch('lastName')}
              placeholder="Smith"
              aria-invalid={!!lastNameError}
              className={fieldCls(!!lastNameError)}
            />
            <InlineError id="reg-last-error" msg={lastNameError} />
          </div>
        </div>

        {/* Username */}
        <div>
          <label htmlFor="reg-username" className={labelCls}>
            Username{' '}
            <span className="normal-case tracking-normal font-normal text-[#9CA3AF]">
              (8–12 chars)
            </span>
          </label>
          <div className="relative">
            <input
              id="reg-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onBlur={() => touch('username')}
              minLength={8}
              maxLength={12}
              placeholder="cooluser99"
              aria-invalid={!!usernameError}
              className={`${fieldCls(!!usernameError)} pr-9 ${
                username.length > 0 && usernameValid
                  ? '!border-[#1A7A4A] !ring-2 !ring-[#1A7A4A]/10'
                  : ''
              }`}
            />
            {username.length > 0 && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2">
                {usernameValid
                  ? <CheckCircle2 size={15} className="text-[#1A7A4A]" />
                  : <XCircle     size={15} className="text-[#EF4444]"  />}
              </span>
            )}
          </div>
          <InlineError id="reg-username-error" msg={usernameError} />
        </div>

        {/* Email */}
        <div>
          <label htmlFor="reg-email" className={labelCls}>Email</label>
          <input
            id="reg-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => touch('email')}
            autoComplete="email"
            placeholder="you@example.com"
            aria-invalid={!!emailError}
            className={fieldCls(!!emailError)}
          />
          <InlineError id="reg-email-error" msg={emailError} />
        </div>

        {/* Password */}
        <div>
          <label htmlFor="reg-password" className={labelCls}>Password</label>
          <div className="relative">
            <input
              id="reg-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={() => touch('password')}
              autoComplete="new-password"
              minLength={8}
              placeholder="••••••••"
              aria-invalid={!!passwordError}
              className={`${fieldCls(!!passwordError)} pr-11`}
            />
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#374151] transition-colors duration-150"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {password.length > 0 && <PasswordStrengthBar password={password} />}
          <InlineError id="reg-password-error" msg={passwordError} />
        </div>

        {/* Date of birth */}
        <div>
          <label htmlFor="reg-dob" className={labelCls}>
            Date of Birth{' '}
            <span className="normal-case tracking-normal font-normal text-[#9CA3AF]">
              (optional)
            </span>
          </label>
          <input
            id="reg-dob"
            type="date"
            value={dob}
            onChange={(e) => setDob(e.target.value)}
            className={fieldCls(false)}
          />
        </div>

        {/* Gender */}
        <div>
          <p className={labelCls}>
            Gender{' '}
            <span className="normal-case tracking-normal font-normal text-[#9CA3AF]">
              (optional)
            </span>
          </p>
          <div className="flex gap-2 flex-wrap">
            {genderOptions.map((opt) => (
              <button
                key={opt.label}
                type="button"
                onClick={() => setGender(opt.value)}
                className={`text-[12.5px] font-medium px-3.5 py-1.5 rounded-lg border-[1.5px] cursor-pointer transition-colors duration-150 ${
                  gender === opt.value
                    ? 'bg-[#111827] text-white border-[#111827]'
                    : 'bg-white border-[#D1D5DB] text-[#374151] hover:border-[#374151] hover:bg-[#F9FAFB]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Server error */}
        {error && (
          <div role="alert"
            className="bg-[#FFF0F0] border border-[#CC0000] rounded-lg p-3 text-sm text-[#CC0000] flex items-center gap-2">
            <AlertCircle size={15} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Submit */}
        <Button
          type="submit"
          variant="primary"
          loading={loading}
          disabled={!canSubmit}
          className="w-full py-2.5 !rounded-[10px] mt-1"
        >
          {loading ? 'Creating account…' : 'Create account'}
        </Button>

      </form>

      <p className="text-center text-[12.5px] text-[#9CA3AF] mt-5">
        Already have an account?{' '}
        <Link to="/login" className="font-semibold text-[#111827] hover:text-[#374151] transition-colors duration-150">
          Sign in
        </Link>
      </p>
    </>
  );
}

/* ─────────────────────────────────────────────────────────────
   LEFT PANEL — particles + grid + blobs + badge + tagline
───────────────────────────────────────────────────────────── */
function LeftPanel() {
  const particlesRef = useRef(null);

  useEffect(() => {
    const container = particlesRef.current;
    if (!container) return;
    const els = [];
    for (let i = 0; i < 12; i++) {
      const p = document.createElement('div');
      const size = 2 + Math.random() * 3;
      Object.assign(p.style, {
        position:        'absolute',
        borderRadius:    '50%',
        background:      'rgba(255,255,255,0.7)',
        width:           `${size}px`,
        height:          `${size}px`,
        left:            `${Math.random() * 100}%`,
        bottom:          `${60 + Math.random() * 40}%`,
        animation:       `particle-float ${10 + Math.random() * 16}s linear infinite`,
        animationDelay:  `-${Math.random() * 12}s`,
        '--drift':       `${(Math.random() - 0.5) * 80}px`,
        opacity:         '0',
        pointerEvents:   'none',
      });
      container.appendChild(p);
      els.push(p);
    }
    return () => els.forEach((p) => p.remove());
  }, []);

  return (
    <div
      className="hidden md:flex relative w-[55%] h-screen flex-col justify-center px-14 py-12 overflow-hidden shrink-0"
      style={{ background: '#0A0A0F' }}
    >
      {/* CSS keyframes */}
      <style>{PARTICLE_CSS}</style>

      {/* Grid overlay */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: [
            'linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)',
            'linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)',
          ].join(','),
          backgroundSize: '48px 48px',
        }}
      />

      {/* Glow blobs */}
      <div
        aria-hidden="true"
        className="absolute rounded-full pointer-events-none"
        style={{
          width: 420, height: 420,
          top: -140, left: -140,
          background: 'radial-gradient(circle, rgba(255,255,255,0.07) 0%, transparent 70%)',
          animation: 'blob-pulse 5s ease-in-out infinite',
        }}
      />
      <div
        aria-hidden="true"
        className="absolute rounded-full pointer-events-none"
        style={{
          width: 380, height: 380,
          bottom: -130, right: -110,
          background: 'radial-gradient(circle, rgba(255,255,255,0.06) 0%, transparent 70%)',
          animation: 'blob-pulse 6.5s ease-in-out infinite reverse',
        }}
      />

      {/* Particles container */}
      <div ref={particlesRef} aria-hidden="true" className="absolute inset-0 z-[1]" />

      {/* Content */}
      <div className="relative z-10">

        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/50 text-white text-[11px] font-semibold uppercase tracking-[0.12em] mb-12">
          <span
            className="w-[7px] h-[7px] rounded-full bg-white"
            style={{ animation: 'dot-blink 1.8s ease-in-out infinite' }}
          />
          Now in Beta
        </div>

        {/* Tagline */}
        <div
          style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, lineHeight: 1.05 }}
          className="text-[clamp(44px,5vw,64px)] mb-5 flex flex-col"
        >
          <span className="text-[#E5E7EB]">Connect.</span>
          <span className="text-[#E5E7EB]">Share.</span>
          <span className="text-white">Play.</span>
        </div>

        {/* Subtitle */}
        <p className="text-[#6B7280] text-[14.5px] max-w-[280px] leading-relaxed mb-12">
          The social platform built for gamers who live to connect, compete, and create together.
        </p>

        {/* Features */}
        <div className="flex flex-col gap-4">
          {[
            { icon: '👥', label: 'Friend graph with smart suggestions'  },
            { icon: '💬', label: 'Real-time chat and group messaging'    },
            { icon: '🎮', label: 'Multiplayer games built in'            },
          ].map(({ icon, label }) => (
            <div key={label} className="flex items-center gap-3.5">
              <div
                className="w-9 h-9 flex items-center justify-center rounded-lg text-base shrink-0"
                style={{
                  border: '1px solid rgba(255,255,255,0.25)',
                  background: 'rgba(255,255,255,0.04)',
                }}
              >
                {icon}
              </div>
              <span className="text-[#9CA3AF] text-[13.5px]">{label}</span>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   AUTH PAGE
───────────────────────────────────────────────────────────── */
export default function AuthPage({ mode }) {
  const isLogin = mode === 'login';

  return (
    <div className="h-screen overflow-hidden flex">

      <LeftPanel />

      {/* Right panel */}
      <div
        className="flex-1 h-screen overflow-y-auto flex items-start justify-center py-8 px-5"
        style={{ background: '#F0F0EE', scrollbarGutter: 'stable' }}
      >
        <div className="w-full max-w-[400px] my-auto">

          {/* Card */}
          <div
            className="bg-white rounded-[18px] px-8 py-8"
            style={{
              border: '1.5px solid #E5E7EB',
              boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.07)',
            }}
          >
            {/* Tabs */}
            <div className="flex border-b-[1.5px] border-[#E5E7EB] mb-7">
              <Link
                to="/login"
                className={`relative text-sm font-medium pb-2.5 mr-7 transition-colors duration-150 ${
                  isLogin ? 'text-[#111827]' : 'text-[#9CA3AF] hover:text-[#374151]'
                }`}
              >
                Sign in
                {isLogin && (
                  <span className="absolute bottom-[-1.5px] left-0 right-0 h-[2px] bg-[#111827] rounded-full" />
                )}
              </Link>
              <Link
                to="/register"
                className={`relative text-sm font-medium pb-2.5 transition-colors duration-150 ${
                  !isLogin ? 'text-[#111827]' : 'text-[#9CA3AF] hover:text-[#374151]'
                }`}
              >
                Create account
                {!isLogin && (
                  <span className="absolute bottom-[-1.5px] left-0 right-0 h-[2px] bg-[#111827] rounded-full" />
                )}
              </Link>
            </div>

            {isLogin ? <LoginForm /> : <RegisterForm />}

          </div>
        </div>
      </div>

    </div>
  );
}
