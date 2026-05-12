import { useState } from 'react';
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
            New to Nexus?{' '}
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

  const usernameError = validateUsername(username);
  const usernameValid = username.length > 0 && usernameError === '';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (usernameError) {
      setError('Please fix the username field.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const payload = {
        first_name: firstName,
        last_name: lastName,
        username,
        email,
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

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-[#0A0A0A] mb-1">Create your account.</h1>
        <p className="text-sm text-[#888888] mb-6">Fill in your details to get started.</p>
      </div>

      {/* Name row */}
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="First name"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          required
          placeholder="Jane"
        />
        <Input
          label="Last name"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          required
          placeholder="Smith"
        />
      </div>

      {/* Username with live validation */}
      <div className="w-full">
        <label className="text-xs font-semibold text-[#404040] mb-0.5 block">
          Username
          <span className="ml-1 text-[10px] text-[#888888] font-normal normal-case tracking-normal">
            8–12 characters
          </span>
        </label>
        <div className="relative">
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            minLength={8}
            maxLength={12}
            placeholder="cooluser99"
            className={`w-full border bg-white rounded-md px-3 py-2 text-sm placeholder:text-[#888888] focus:outline-none transition-colors pr-9 ${
              username.length === 0
                ? 'border-[#E0E0E0] focus:border-black focus:ring-1 focus:ring-black'
                : usernameValid
                ? 'border-[#1A7A4A] ring-1 ring-[#1A7A4A] focus:outline-none'
                : 'border-[#CC0000] ring-1 ring-[#CC0000] focus:outline-none'
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
        {username.length > 0 && usernameError && (
          <p className="text-xs text-[#CC0000] mt-1">{usernameError}</p>
        )}
      </div>

      <Input
        label="Email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        placeholder="you@example.com"
      />

      {/* Password with strength bar */}
      <div className="w-full">
        <label className="text-xs font-semibold text-[#404040] mb-1 block">Password</label>
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            placeholder="••••••••"
            className="w-full border border-[#E0E0E0] bg-white rounded-md px-3 py-2 text-sm placeholder:text-[#888888] focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors pr-10"
          />
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#888888] hover:text-[#0A0A0A] transition-colors"
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        {password.length > 0 && <PasswordStrengthBar password={password} />}
      </div>

      <Input
        label="Date of birth (optional)"
        type="date"
        value={dob}
        onChange={(e) => setDob(e.target.value)}
      />

      {/* Gender segmented control */}
      <div>
        <p className="text-xs font-semibold text-[#404040] mb-1">Gender (optional)</p>
        <div className="flex gap-2">
          {[
            { label: 'Male', value: 'MALE' },
            { label: 'Female', value: 'FEMALE' },
            { label: 'Prefer not to say', value: null },
          ].map((opt) => (
            <button
              key={opt.label}
              type="button"
              onClick={() => setGender(opt.value)}
              className={`border text-sm px-3 py-1.5 rounded cursor-pointer transition-colors ${
                gender === opt.value
                  ? 'bg-[#0A0A0A] text-white border-[#0A0A0A]'
                  : 'border-[#E0E0E0] text-[#404040] hover:bg-[#F7F7F7]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="bg-[#FFF0F0] border border-[#CC0000] rounded-md p-3 text-sm text-[#CC0000] flex items-center gap-2">
          <AlertCircle size={16} className="shrink-0" />
          {error}
        </div>
      )}

      <Button
        type="submit"
        variant="primary"
        loading={loading}
        className="w-full"
      >
        Create account
      </Button>
    </form>
  );
}

/* ── Main AuthPage ── */
export default function AuthPage({ mode }) {
  const isLogin = mode === 'login';

  return (
    <div className="min-h-screen flex">
      {/* Left panel — hidden on mobile */}
      <div className="hidden md:flex w-1/2 min-h-screen bg-[#0A0A0A] text-white flex-col p-8">
        {/* Logo */}
        <div className="font-black text-2xl tracking-[-0.04em]">NEXUS</div>

        {/* Center taglines */}
        <div className="flex-1 flex items-center">
          <div>
            <p className="font-black text-5xl leading-tight">Connect.</p>
            <p className="font-black text-5xl leading-tight">Share.</p>
            <p className="font-black text-5xl leading-tight">Play.</p>
          </div>
        </div>

        {/* Feature bullets */}
        <div className="flex flex-col gap-3 mt-8">
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

      {/* Right panel */}
      <div className="flex-1 md:w-1/2 flex items-center justify-center min-h-screen bg-white">
        <div className="max-w-sm w-full mx-auto px-8 py-16">
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
