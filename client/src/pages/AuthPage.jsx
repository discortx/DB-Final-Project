import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { register, login } from '../api/auth';
import useAuthStore from '../store/authStore';
import socket from '../socket';

export default function AuthPage({ mode }) {
  const navigate = useNavigate();
  const { login: storeLogin } = useAuthStore();
  const isLogin = mode === 'login';

  const [form, setForm] = useState({
    username: '', email: '', password: '',
    first_name: '', last_name: '', date_of_birth: '', gender: '',
  });
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      let res;
      if (isLogin) {
        res = await login({ email: form.email, password: form.password });
      } else {
        const payload = { ...form };
        if (!payload.date_of_birth) delete payload.date_of_birth;
        if (!payload.gender)        delete payload.gender;
        res = await register(payload);
      }
      storeLogin(res.data.user, res.data.token);
      socket.auth = { token: res.data.token };
      socket.connect();
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong');
    }
    setLoading(false);
  };

  const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white shadow-lg rounded-2xl p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold text-center text-gray-900 mb-1">SocialNet</h1>
        <p className="text-center text-gray-500 text-sm mb-6">
          {isLogin ? 'Welcome back!' : 'Create your account'}
        </p>

        <div className="flex rounded-lg border border-gray-200 mb-6 overflow-hidden">
          <Link to="/login"
            className={`flex-1 py-2 text-sm font-medium text-center transition-colors ${isLogin ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
            Login
          </Link>
          <Link to="/register"
            className={`flex-1 py-2 text-sm font-medium text-center transition-colors ${!isLogin ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
            Register
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {!isLogin && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <input className={inputCls} placeholder="First name" value={form.first_name} onChange={set('first_name')} required />
                <input className={inputCls} placeholder="Last name"  value={form.last_name}  onChange={set('last_name')}  required />
              </div>
              <input
                className={inputCls}
                placeholder="Username (8–12 chars)"
                value={form.username}
                onChange={set('username')}
                minLength={8} maxLength={12} required
              />
            </>
          )}

          <input
            className={inputCls} type="email"
            placeholder="Email" value={form.email}
            onChange={set('email')} required
          />
          <input
            className={inputCls} type="password"
            placeholder="Password (min 8 chars)" value={form.password}
            onChange={set('password')} minLength={8} required
          />

          {!isLogin && (
            <div className="grid grid-cols-2 gap-3">
              <input className={inputCls} type="date" value={form.date_of_birth} onChange={set('date_of_birth')} />
              <select className={inputCls} value={form.gender} onChange={set('gender')}>
                <option value="">Gender (optional)</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
              </select>
            </div>
          )}

          {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

          <button
            type="submit" disabled={loading}
            className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 disabled:opacity-60 transition-colors"
          >
            {loading ? 'Please wait…' : isLogin ? 'Login' : 'Create account'}
          </button>
        </form>
      </div>
    </div>
  );
}
