import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from './store/authStore';
import AppShell from './components/layout/AppShell';
import AuthPage from './pages/AuthPage';
import FeedPage from './pages/FeedPage';
import ProfilePage from './pages/ProfilePage';
import FriendsPage from './pages/FriendsPage';
import ChatsPage from './pages/ChatsPage';
import ChatThreadPage from './pages/ChatThreadPage';
import NotificationsPage from './pages/NotificationsPage';
import GamesLobbyPage from './pages/GamesLobbyPage';
import TicTacToePage from './pages/TicTacToePage';
import SnakePage from './pages/SnakePage';
import HangmanPage from './pages/HangmanPage';

function ProtectedRoute({ children }) {
  const token = useAuthStore((s) => s.token);
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login"    element={<AuthPage mode="login" />} />
        <Route path="/register" element={<AuthPage mode="register" />} />

        <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
          <Route path="/"                    element={<FeedPage />} />
          <Route path="/profile/:id"         element={<ProfilePage />} />
          <Route path="/friends"             element={<FriendsPage tab="friends" />} />
          <Route path="/friends/requests"    element={<FriendsPage tab="requests" />} />
          <Route path="/friends/suggest"     element={<FriendsPage tab="suggestions" />} />
          <Route path="/chats"               element={<ChatsPage />} />
          <Route path="/chats/:id"           element={<ChatThreadPage />} />
          <Route path="/notifications"       element={<NotificationsPage />} />
          <Route path="/games"               element={<GamesLobbyPage />} />
          <Route path="/games/ttt/:id"       element={<TicTacToePage />} />
          <Route path="/games/snake"         element={<SnakePage />} />
          <Route path="/games/hangman"       element={<HangmanPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
