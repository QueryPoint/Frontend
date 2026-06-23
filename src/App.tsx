import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthInitializer } from './components/AuthInitializer/AuthInitializer';
import { ProtectedRoute } from './components/ProtectedRoute/ProtectedRoute';
import { Layout } from './components/Layout/Layout';
import { LoginPage } from './pages/Login/Login';
import { RegisterPage } from './pages/Register/Register';
import { DocumentsPage } from './pages/Documents/Documents';
import { DocumentDetailPage } from './pages/DocumentDetail/DocumentDetail';
import { UploadPage } from './pages/Upload/Upload';
import { SearchPage } from './pages/Search/Search';
import { AssistantPage } from './pages/Assistant/Assistant';
import { HistoryPage } from './pages/History/History';
import { ProfilePage } from './pages/Profile/Profile';
import { NotFoundPage } from './pages/NotFound/NotFound';

function App() {
  return (
    <AuthInitializer>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route path="/documents" element={<DocumentsPage />} />
          <Route path="/documents/:documentId" element={<DocumentDetailPage />} />
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/assistant" element={<AssistantPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>
        <Route path="/" element={<Navigate to="/documents" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AuthInitializer>
  );
}
export default App;
