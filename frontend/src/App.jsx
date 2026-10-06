import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import MatchListPage    from './features/matches/MatchListPage';
import MatchDetailPage  from './features/matches/MatchDetailPage';
import LoginPage        from './features/auth/LoginPage';
import RegisterPage     from './features/auth/RegisterPage';
import MyOrdersPage     from './features/orders/MyOrdersPage';
import OrderDetailPage  from './features/orders/OrderDetailPage';
import ManageMatchesPage from './features/admin/ManageMatchesPage';
import ManageSeatsPage  from './features/admin/ManageSeatsPage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen flex flex-col bg-slate-50">
          <Navbar />
          <main className="flex-1">
            <Routes>
              {/* Public */}
              <Route path="/"              element={<MatchListPage />} />
              <Route path="/matches/:id"  element={<MatchDetailPage />} />
              <Route path="/login"        element={<LoginPage />} />
              <Route path="/register"     element={<RegisterPage />} />

              {/* Authenticated */}
              <Route path="/orders/my"   element={<ProtectedRoute><MyOrdersPage /></ProtectedRoute>} />
              <Route path="/orders/:id"  element={<ProtectedRoute><OrderDetailPage /></ProtectedRoute>} />

              {/* Admin only */}
              <Route path="/admin/matches"
                element={<ProtectedRoute requiredRole="ADMIN"><ManageMatchesPage /></ProtectedRoute>} />
              <Route path="/admin/matches/:id/seats"
                element={<ProtectedRoute requiredRole="ADMIN"><ManageSeatsPage /></ProtectedRoute>} />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>

          {/* Footer */}
          <footer className="border-t border-slate-200 bg-white mt-auto">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-blue-500 to-green-400 flex items-center justify-center text-xs">⚽</div>
                <span className="text-sm font-bold text-slate-700" style={{ fontFamily: "'Outfit', sans-serif" }}>
                  Goal<span className="text-blue-600">Hub</span>
                </span>
                <span className="text-slate-300 text-sm">—</span>
                <span className="text-xs text-slate-400">Nền tảng đặt vé bóng đá số 1 Việt Nam</span>
              </div>
              <div className="flex items-center gap-4 text-xs text-slate-400">
                <span>© 2026 GoalHub</span>
                <span className="text-slate-200">•</span>
                <span>Phiên bản demo — Dữ liệu mẫu</span>
              </div>
            </div>
          </footer>
        </div>

        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3500,
            style: {
              fontFamily: "'Inter', sans-serif",
              fontSize: '14px',
              borderRadius: '12px',
              border: '1px solid rgba(0,0,0,0.08)',
              boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.06)',
            },
            success: {
              iconTheme: { primary: '#22c55e', secondary: '#fff' },
            },
            error: {
              iconTheme: { primary: '#ef4444', secondary: '#fff' },
            },
          }}
        />
      </BrowserRouter>
    </AuthProvider>
  );
}
