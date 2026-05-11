import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute   from './components/ProtectedRoute';
import Layout           from './components/Layout';
import AuthPage         from './pages/AuthPage';
import FeedPage         from './pages/FeedPage';
import ProfilePage      from './pages/ProfilePage';
import FriendsPage      from './pages/FriendsPage';
import ChatInboxPage    from './pages/ChatInboxPage';
import ChatThreadPage   from './pages/ChatThreadPage';
import NotificationsPage from './pages/NotificationsPage';
import GamesLobbyPage   from './pages/GamesLobbyPage';
import TicTacToePage    from './pages/TicTacToePage';
import SnakePage        from './pages/SnakePage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login"    element={<AuthPage mode="login"    />} />
        <Route path="/register" element={<AuthPage mode="register" />} />

        <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route path="/"              element={<FeedPage />} />
          <Route path="/profile/:id"   element={<ProfilePage />} />
          <Route path="/friends"       element={<FriendsPage />} />
          <Route path="/chats"         element={<ChatInboxPage />} />
          <Route path="/chats/:id"     element={<ChatThreadPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/games"         element={<GamesLobbyPage />} />
          <Route path="/games/ttt/:id" element={<TicTacToePage />} />
          <Route path="/games/snake"   element={<SnakePage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
