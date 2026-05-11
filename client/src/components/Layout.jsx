import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import useAuthStore from '../store/authStore';
import { logout as apiLogout } from '../api/auth';
import { getNotifications } from '../api/notifications';
import socket from '../socket';

export default function Layout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const res = await getNotifications(true);
        setUnread(parseInt(res.headers['x-unread-count'] || '0', 10));
      } catch {}
    };
    fetchUnread();
    const t = setInterval(fetchUnread, 30_000);
    return () => clearInterval(t);
  }, []);

  const handleLogout = async () => {
    try { await apiLogout(); } catch {}
    socket.disconnect();
    logout();
    navigate('/login');
  };

  const navCls = ({ isActive }) =>
    `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
      isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
    }`;

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 flex items-center gap-2 h-14">
          <Link to="/" className="font-bold text-blue-600 text-lg mr-4">SocialNet</Link>
          <NavLink to="/"              end className={navCls}>Feed</NavLink>
          <NavLink to="/friends"           className={navCls}>Friends</NavLink>
          <NavLink to="/chats"             className={navCls}>Chats</NavLink>
          <NavLink to="/notifications"     className={navCls}>
            <span className="relative">
              Notifications
              {unread > 0 && (
                <span className="absolute -top-2 -right-3 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </span>
          </NavLink>
          <NavLink to="/games"             className={navCls}>Games</NavLink>
          <div className="ml-auto flex items-center gap-3">
            <NavLink to={`/profile/${user?.id}`} className={navCls}>
              {user?.first_name}
            </NavLink>
            <button
              onClick={handleLogout}
              className="px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:text-red-600 hover:bg-red-50 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
