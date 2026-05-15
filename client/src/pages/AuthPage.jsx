import { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Users,
  MessageCircle,
  Gamepad2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
} from 'lucide-react';
import { register, login } from '../api/auth';
import useAuthStore from '../store/authStore';
import useToastStore from '../store/toastStore';
import socket from '../socket';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

/* ── helpers ── */
function calcPasswordStrength(pw) {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score;
}

const strengthColors = ['bg-[#E0E0E0]', 'bg-[#CC0000]', 'bg-[#FF6600]', 'bg-[#1A7A4A]', 'bg-[#1A7A4A]'];

function PasswordStrengthBar({ password }) {
  const strength = calcPasswordStrength(password);
  return (
    <div className="flex gap-0.5 mt-1 h-1">
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className={`flex-1 rounded-full transition-colors ${
            i < strength ? strengthColors[strength] : 'bg-[#E0E0E0]'
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

/* ── Login Form ── */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function LoginForm() {
  const navigate = useNavigate();
  const { login: storeLogin } = useAuthStore();
  const addToast = useToastStore((s) => s.addToast);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [touched, setTouched] = useState({ email: false, password: false });

  const emailError =
    touched.email && !EMAIL_RE.test(email.trim())
      ? 'Enter a valid email address.'
      : '';
  const passwordError =
    touched.password && password.length < 1
      ? 'Password is required.'
      : '';

  const canSubmit =
    EMAIL_RE.test(email.trim()) && password.length >= 1 && !loading;

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
      addToast({
        message: `Welcome back, ${res.data.user.first_name}!`,
        type: 'success',
      });
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @keyframes login-rise {
          0%   { opacity: 0; transform: translateY(12px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .login-rise { animation: login-rise 0.45s cubic-bezier(0.22, 1, 0.36, 1) both; }
        .login-rise-1 { animation-delay: 0.04s; }
        .login-rise-2 { animation-delay: 0.10s; }
        .login-rise-3 { animation-delay: 0.16s; }
        .login-rise-4 { animation-delay: 0.22s; }
        .login-rise-5 { animation-delay: 0.28s; }
      `}</style>

      <div className="bg-white border border-[#E0E0E0] rounded-lg p-8 shadow-[0_1px_4px_rgba(0,0,0,0.08)] login-rise">
        <div className="mb-7 login-rise login-rise-1">
          <h1 className="text-3xl font-bold tracking-tight text-[#0A0A0A] mb-1.5 leading-tight">
            Welcome back.
          </h1>
          <p className="text-sm text-[#888888]">
            Enter your credentials to continue.
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          {/* Email */}
          <div className="login-rise login-rise-2">
            <label
              htmlFor="login-email"
              className="block text-xs font-semibold uppercase tracking-widest text-[#404040] mb-2"
            >
              Email
            </label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, email: true }))}
              autoComplete="email"
              autoFocus
              placeholder="you@example.com"
              aria-invalid={!!emailError}
              aria-describedby={emailError ? 'login-email-error' : undefined}
              className={`w-full bg-white rounded-md px-3 py-2.5 text-sm placeholder:text-[#888888] focus:outline-none transition-colors border ${
                emailError
                  ? 'border-[#CC0000] focus:ring-1 focus:ring-[#CC0000] focus:border-[#CC0000]'
                  : 'border-[#E0E0E0] focus:border-black focus:ring-1 focus:ring-black'
              }`}
            />
            {emailError && (
              <p
                id="login-email-error"
                className="text-xs text-[#CC0000] mt-1.5 flex items-center gap-1"
              >
                <AlertCircle size={12} className="shrink-0" />
                {emailError}
              </p>
            )}
          </div>

          {/* Password */}
          <div className="login-rise login-rise-3">
            <label
              htmlFor="login-password"
              className="block text-xs font-semibold uppercase tracking-widest text-[#404040] mb-2"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, password: true }))}
                autoComplete="current-password"
                placeholder="••••••••"
                aria-invalid={!!passwordError}
                aria-describedby={
                  passwordError ? 'login-password-error' : undefined
                }
                className={`w-full bg-white rounded-md px-3 py-2.5 pr-10 text-sm placeholder:text-[#888888] focus:outline-none transition-colors border ${
                  passwordError
                    ? 'border-[#CC0000] focus:ring-1 focus:ring-[#CC0000] focus:border-[#CC0000]'
                    : 'border-[#E0E0E0] focus:border-black focus:ring-1 focus:ring-black'
                }`}
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#888888] hover:text-[#0A0A0A] transition-colors duration-150"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {passwordError && (
              <p
                id="login-password-error"
                className="text-xs text-[#CC0000] mt-1.5 flex items-center gap-1"
              >
                <AlertCircle size={12} className="shrink-0" />
                {passwordError}
              </p>
            )}
          </div>

          {/* Server / submission error */}
          {error && (
            <div
              role="alert"
              className="bg-[#FFF0F0] border border-[#CC0000] rounded-md p-3 text-sm text-[#CC0000] flex items-center gap-2"
            >
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Submit */}
          <div className="login-rise login-rise-4 pt-1">
            <Button
              type="submit"
              variant="primary"
              loading={loading}
              disabled={!canSubmit}
              className="w-full py-2.5"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
          </div>

          {/* Footer */}
          <p className="login-rise login-rise-5 text-center text-xs text-[#888888] pt-2">
            New to Sora Link?{' '}
            <Link
              to="/register"
              className="font-semibold text-[#0A0A0A] hover:underline transition-colors"
            >
              Create an account
            </Link>
          </p>
        </form>
      </div>
    </>
  );
}

/* ── Register Form ── */
function RegisterForm() {
  const navigate = useNavigate();
  const { login: storeLogin } = useAuthStore();
  const addToast = useToastStore((s) => s.addToast);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [touched, setTouched] = useState({
    firstName: false,
    lastName: false,
    username: false,
    email: false,
    password: false,
  });

  const touch = (field) => setTouched((t) => ({ ...t, [field]: true }));

  const firstNameError =
    touched.firstName && !firstName.trim() ? 'First name is required.' : '';
  const lastNameError =
    touched.lastName && !lastName.trim() ? 'Last name is required.' : '';
  const usernameValidationError = validateUsername(username);
  const usernameError =
    touched.username && usernameValidationError ? usernameValidationError : '';
  const usernameValid = username.length > 0 && !usernameValidationError;
  const emailError =
    touched.email && !EMAIL_RE.test(email.trim())
      ? 'Enter a valid email address.'
      : '';
  const passwordError =
    touched.password && password.length < 8
      ? 'Password must be at least 8 characters.'
      : '';

  const canSubmit =
    firstName.trim() &&
    lastName.trim() &&
    usernameValid &&
    EMAIL_RE.test(email.trim()) &&
    password.length >= 8 &&
    !loading;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched({ firstName: true, lastName: true, username: true, email: true, password: true });
    if (!canSubmit) return;
    setError('');
    setLoading(true);
    try {
      const payload = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        username,
        email: email.trim(),
        password,
      };
      if (dob) payload.date_of_birth = dob;
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

  const fieldCls = (hasError) =>
    `w-full bg-white rounded-md px-3 py-2.5 text-sm placeholder:text-[#888888] focus:outline-none transition-colors border ${
      hasError
        ? 'border-[#CC0000] focus:ring-1 focus:ring-[#CC0000] focus:border-[#CC0000]'
        : 'border-[#E0E0E0] focus:border-black focus:ring-1 focus:ring-black'
    }`;

  const labelCls = 'block text-xs font-semibold uppercase tracking-widest text-[#404040] mb-2';

  const InlineError = ({ id, msg }) =>
    msg ? (
      <p id={id} className="text-xs text-[#CC0000] mt-1.5 flex items-center gap-1">
        <AlertCircle size={12} className="shrink-0" />
        {msg}
      </p>
    ) : null;

  return (
    <>
      <style>{`
        @keyframes reg-rise {
          0%   { opacity: 0; transform: translateY(12px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .reg-rise   { animation: reg-rise 0.45s cubic-bezier(0.22, 1, 0.36, 1) both; }
        .reg-rise-1 { animation-delay: 0.04s; }
        .reg-rise-2 { animation-delay: 0.09s; }
        .reg-rise-3 { animation-delay: 0.14s; }
        .reg-rise-4 { animation-delay: 0.19s; }
        .reg-rise-5 { animation-delay: 0.24s; }
        .reg-rise-6 { animation-delay: 0.29s; }
        .reg-rise-7 { animation-delay: 0.34s; }
        .reg-rise-8 { animation-delay: 0.39s; }
      `}</style>

      <div className="bg-white border border-[#E0E0E0] rounded-lg p-8 shadow-[0_1px_4px_rgba(0,0,0,0.08)] reg-rise">
        <div className="mb-7 reg-rise reg-rise-1">
          <h1 className="text-3xl font-bold tracking-tight text-[#0A0A0A] mb-1.5 leading-tight">
            Create your account.
          </h1>
          <p className="text-sm text-[#888888]">
            Fill in your details to get started.
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-5">

          {/* Name row */}
          <div className="grid grid-cols-2 gap-3 reg-rise reg-rise-2">
            <div>
              <label htmlFor="reg-first" className={labelCls}>First name</label>
              <input
                id="reg-first"
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
              <label htmlFor="reg-last" className={labelCls}>Last name</label>
              <input
                id="reg-last"
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
          <div className="reg-rise reg-rise-3">
            <label htmlFor="reg-username" className={labelCls}>
              Username{' '}
              <span className="normal-case tracking-normal font-normal text-[#888888]">
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
                    ? '!border-[#1A7A4A] !ring-1 !ring-[#1A7A4A]'
                    : ''
                }`}
              />
              {username.length > 0 && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2">
                  {usernameValid ? (
                    <CheckCircle2 size={16} className="text-[#1A7A4A]" />
                  ) : (
                    <XCircle size={16} className="text-[#CC0000]" />
                  )}
                </span>
              )}
            </div>
            <InlineError id="reg-username-error" msg={usernameError} />
          </div>

          {/* Email */}
          <div className="reg-rise reg-rise-4">
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

          {/* Password + strength bar */}
          <div className="reg-rise reg-rise-5">
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
                className={`${fieldCls(!!passwordError)} pr-10`}
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#888888] hover:text-[#0A0A0A] transition-colors duration-150"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {password.length > 0 && <PasswordStrengthBar password={password} />}
            <InlineError id="reg-password-error" msg={passwordError} />
          </div>

          {/* Date of birth */}
          <div className="reg-rise reg-rise-6">
            <label htmlFor="reg-dob" className={labelCls}>
              Date of birth{' '}
              <span className="normal-case tracking-normal font-normal text-[#888888]">
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
          <div className="reg-rise reg-rise-7">
            <p className={labelCls}>
              Gender{' '}
              <span className="normal-case tracking-normal font-normal text-[#888888]">
                (optional)
              </span>
            </p>
            <div className="flex gap-2 flex-wrap">
              {[
                { label: 'Male', value: 'MALE' },
                { label: 'Female', value: 'FEMALE' },
                { label: 'Prefer not to say', value: null },
              ].map((opt) => (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => setGender(opt.value)}
                  className={`text-xs font-semibold px-3 py-2 rounded-none border cursor-pointer transition-colors duration-150 ${
                    gender === opt.value
                      ? 'bg-[#0A0A0A] text-white border-[#0A0A0A]'
                      : 'bg-white border-[#E0E0E0] text-[#404040] hover:bg-[#F7F7F7] hover:border-[#C0C0C0]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Server error */}
          {error && (
            <div
              role="alert"
              className="bg-[#FFF0F0] border border-[#CC0000] rounded-md p-3 text-sm text-[#CC0000] flex items-center gap-2"
            >
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Submit */}
          <div className="reg-rise reg-rise-8 pt-1">
            <Button
              type="submit"
              variant="primary"
              loading={loading}
              disabled={!canSubmit}
              className="w-full py-2.5"
            >
              {loading ? 'Creating account…' : 'Create account'}
            </Button>
          </div>

          {/* Footer */}
          <p className="text-center text-xs text-[#888888] pt-2">
            Already have an account?{' '}
            <Link
              to="/login"
              className="font-semibold text-[#0A0A0A] hover:underline transition-colors"
            >
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </>
  );
}

/* ── Friend Graph canvas animation ── */
// hoveredRef.current: null | 'connect' | 'share' | 'play'
function FriendGraph({ hoveredRef }) {
  const canvasRef = useRef(null);
  const stateRef = useRef({ nodes: null, frame: null });

  // Interpolated animation params — all lerped toward targets each frame
  const pRef = useRef({
    edgeAlphaMax: 0.25, // connect → 0.8
    nodeAlpha:    0.35, // connect → 0.65
    lineWidth:    0.5,  // share   → 1.5
    colorT:       0,    // 0 = #888888, 1 = #ffffff (share)
    speedMult:    1,    // play    → 2.2
    pulseAmp:     0,    // connect → 1.6  (radius oscillation px)
    pulseSpeed:   0.04, // connect → 0.13 (phase increment / frame)
    pulsePhase:   0,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const s = stateRef.current;
    const p = pRef.current;
    const COUNT = 18;
    const LINK_DIST = 150;
    const LERP = 0.09; // ~0.45 s to reach target at 60 fps

    const setSize = () => {
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    setSize();

    const lerp = (a, b) => a + (b - a) * LERP;

    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;

      if (w === 0 || h === 0) {
        s.frame = requestAnimationFrame(draw);
        return;
      }

      if (!s.nodes) {
        s.nodes = Array.from({ length: COUNT }, () => ({
          x:  Math.random() * w,
          y:  Math.random() * h,
          vx: (Math.random() - 0.5) * 0.35,
          vy: (Math.random() - 0.5) * 0.35,
          r:  2 + Math.random() * 1.5,
        }));
      }

      // ── Lerp params toward hover targets ──────────────────────────────────
      const hov = hoveredRef ? hoveredRef.current : null;
      p.edgeAlphaMax = lerp(p.edgeAlphaMax, hov === 'connect' ? 0.80 : 0.25);
      p.nodeAlpha    = lerp(p.nodeAlpha,    hov === 'connect' ? 0.65 : 0.35);
      p.lineWidth    = lerp(p.lineWidth,    hov === 'share'   ? 1.50 : 0.50);
      p.colorT       = lerp(p.colorT,       hov === 'share'   ? 1.00 : 0.00);
      p.speedMult    = lerp(p.speedMult,    hov === 'play'    ? 2.20 : 1.00);
      p.pulseAmp     = lerp(p.pulseAmp,     hov === 'connect' ? 1.60 : 0.00);
      p.pulseSpeed   = lerp(p.pulseSpeed,   hov === 'connect' ? 0.13 : 0.04);
      p.pulsePhase  += p.pulseSpeed;

      // Stroke color: #888888 → #ffffff
      const cv = Math.round(136 + 119 * p.colorT);
      const strokeColor = `rgb(${cv},${cv},${cv})`;

      ctx.clearRect(0, 0, w, h);
      const nodes = s.nodes;

      // ── Move nodes ────────────────────────────────────────────────────────
      nodes.forEach((n) => {
        n.x += n.vx * p.speedMult;
        n.y += n.vy * p.speedMult;
        if (n.x < -20) n.x = w + 20;
        if (n.x > w + 20) n.x = -20;
        if (n.y < -20) n.y = h + 20;
        if (n.y > h + 20) n.y = -20;
      });

      // ── Edges ─────────────────────────────────────────────────────────────
      ctx.lineWidth = p.lineWidth;
      ctx.strokeStyle = strokeColor;
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const d  = Math.sqrt(dx * dx + dy * dy);
          if (d < LINK_DIST) {
            ctx.globalAlpha = (1 - d / LINK_DIST) * p.edgeAlphaMax;
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.stroke();
          }
        }
      }

      // ── Nodes ─────────────────────────────────────────────────────────────
      ctx.fillStyle = strokeColor;
      ctx.globalAlpha = p.nodeAlpha;
      nodes.forEach((n, i) => {
        const r = Math.max(0.5, n.r + Math.sin(p.pulsePhase + i * 0.72) * p.pulseAmp);
        ctx.beginPath();
        ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.globalAlpha = 1;
      s.frame = requestAnimationFrame(draw);
    };

    draw();

    const ro = new ResizeObserver(setSize);
    ro.observe(canvas);

    return () => {
      cancelAnimationFrame(s.frame);
      ro.disconnect();
    };
  }, [hoveredRef]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{
        zIndex: 0,
        maskImage:
          'radial-gradient(ellipse 72% 56% at 50% 46%, black 8%, transparent 70%)',
        WebkitMaskImage:
          'radial-gradient(ellipse 72% 56% at 50% 46%, black 8%, transparent 70%)',
      }}
    />
  );
}

/* ── Main AuthPage ── */
export default function AuthPage({ mode }) {
  const isLogin = mode === 'login';
  const hoveredRef = useRef(null);

  return (
    <div className="h-screen overflow-hidden flex">
      {/* Left panel — fixed to viewport height, never scrolls */}
      <div className="hidden md:flex w-1/2 h-screen bg-[#0A0A0A] text-white flex-col p-8 overflow-hidden relative">
        {/* Friend graph — z-0, masked to soft ellipse behind taglines */}
        <FriendGraph hoveredRef={hoveredRef} />

        {/* Content — z-10 so it sits above the canvas */}
        <div className="relative z-10 flex flex-col h-full">
          {/* Logo */}
          <div className="font-black text-2xl tracking-tighter text-[#0A0A0A] shrink-0 font-sans">SORA LINK</div>

          {/* Center taglines — each word triggers a different graph state */}
          <div className="flex-1 flex items-center min-h-0">
            <div>
              <p className="font-black text-5xl leading-tight">
                <span
                  className="cursor-default select-none transition-opacity duration-300 hover:opacity-100 opacity-80"
                  onMouseEnter={() => { hoveredRef.current = 'connect'; }}
                  onMouseLeave={() => { hoveredRef.current = null; }}
                >Connect</span>.
              </p>
              <p className="font-black text-5xl leading-tight">
                <span
                  className="cursor-default select-none transition-opacity duration-300 hover:opacity-100 opacity-80"
                  onMouseEnter={() => { hoveredRef.current = 'share'; }}
                  onMouseLeave={() => { hoveredRef.current = null; }}
                >Share</span>.
              </p>
              <p className="font-black text-5xl leading-tight">
                <span
                  className="cursor-default select-none transition-opacity duration-300 hover:opacity-100 opacity-80"
                  onMouseEnter={() => { hoveredRef.current = 'play'; }}
                  onMouseLeave={() => { hoveredRef.current = null; }}
                >Play</span>.
              </p>
            </div>
          </div>

          {/* Feature bullets — shrink-0 pins them to the bottom, never pushed off-screen */}
          <div className="shrink-0 flex flex-col gap-3">
            <div className="flex items-center gap-2 text-sm text-[#888888]">
              <Users size={16} />
              Friend graph with smart suggestions
            </div>
            <div className="flex items-center gap-2 text-sm text-[#888888]">
              <MessageCircle size={16} />
              Real-time chat and group messaging
            </div>
            <div className="flex items-center gap-2 text-sm text-[#888888]">
              <Gamepad2 size={16} />
              Multiplayer games built in
            </div>
          </div>
        </div>
      </div>

      {/* Right panel — only this region scrolls; gutter reserved to prevent layout shift */}
      <div
        className="flex-1 md:w-1/2 h-screen overflow-y-auto bg-white"
        style={{ scrollbarGutter: 'stable' }}
      >
        <div className="max-w-sm w-full mx-auto px-8 py-12">
          {/* Tab switcher */}
          <div className="flex gap-6 mb-8">
            <Link
              to="/login"
              className={`text-sm font-semibold pb-2 cursor-pointer transition-colors ${
                isLogin
                  ? 'text-[#0A0A0A] border-b-2 border-black'
                  : 'text-[#888888] hover:text-[#0A0A0A]'
              }`}
            >
              Sign in
            </Link>
            <Link
              to="/register"
              className={`text-sm font-semibold pb-2 cursor-pointer transition-colors ${
                !isLogin
                  ? 'text-[#0A0A0A] border-b-2 border-black'
                  : 'text-[#888888] hover:text-[#0A0A0A]'
              }`}
            >
              Create account
            </Link>
          </div>

          {isLogin ? <LoginForm /> : <RegisterForm />}
        </div>
      </div>
    </div>
  );
}
