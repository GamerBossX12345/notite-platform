import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import Layout from './components/Layout.jsx';
import HomePage from './pages/HomePage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import NotePage from './pages/NotePage.jsx';
import UploadPage from './pages/UploadPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import UsersPage from './pages/UsersPage.jsx';
import AdminPage from './pages/AdminPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';
import VerifyEmailPage from './pages/VerifyEmailPage.jsx';
import VerifyDevicePage from './pages/VerifyDevicePage.jsx';
import SavedPage from './pages/SavedPage.jsx';
import PublicAppealsPage from './pages/PublicAppealsPage.jsx';
import MyActivityPage from './pages/MyActivityPage.jsx';
import HistoryPage from './pages/HistoryPage.jsx';
import RulesPage from './pages/RulesPage.jsx';
import FlashcardsPage from './pages/FlashcardsPage.jsx';
import FlashcardsStudyPage from './pages/FlashcardsStudyPage.jsx';
import TrendingPage from './pages/TrendingPage.jsx';
import RequestsPage from './pages/RequestsPage.jsx';
import BannedPage from './pages/BannedPage.jsx';
import BanHistoryPage from './pages/BanHistoryPage.jsx';
import BannedGate from './components/BannedGate.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <BannedGate />
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/notes/:id" element={<NotePage />} />
            <Route path="/upload" element={<UploadPage />} />
            <Route path="/profile/:username" element={<ProfilePage />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/saved" element={<SavedPage />} />
            <Route path="/appeals/public" element={<PublicAppealsPage />} />
            <Route path="/activity" element={<MyActivityPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/rules" element={<RulesPage />} />
            <Route path="/flashcards" element={<FlashcardsPage />} />
            <Route path="/flashcards/study" element={<FlashcardsStudyPage />} />
            <Route path="/trending" element={<TrendingPage />} />
            <Route path="/requests" element={<RequestsPage />} />
            <Route path="/verify-email" element={<VerifyEmailPage />} />
            <Route path="/verify-device" element={<VerifyDevicePage />} />
            <Route path="/banned" element={<BannedPage />} />
            <Route path="/ban-history" element={<BanHistoryPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
