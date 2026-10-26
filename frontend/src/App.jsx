import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import Navbar from './components/Navbar';
import CartDrawer from './components/CartDrawer';
import SocialProofToast from './components/SocialProofToast';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import MatchListPage    from './features/matches/MatchListPage';
import MatchDetailPage  from './features/matches/MatchDetailPage';
import BookingPage      from './features/booking/BookingPage';
import ProfilePage      from './features/profile/ProfilePage';
import NewsPage         from './features/news/NewsPage';
import LoginPage        from './features/auth/LoginPage';
import RegisterPage     from './features/auth/RegisterPage';
import MyOrdersPage     from './features/orders/MyOrdersPage';
import OrderDetailPage  from './features/orders/OrderDetailPage';
import ManageMatchesPage from './features/admin/ManageMatchesPage';
import ManageSeatsPage  from './features/admin/ManageSeatsPage';

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <BrowserRouter>
          <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#0a0a0a' }}>
            <Navbar />
            <CartDrawer />
            <SocialProofToast />
            <main style={{ flex: 1 }}>
            <Routes>
              {/* Public */}
              <Route path="/"             element={<MatchListPage />} />
              <Route path="/lich-dau"     element={<MatchListPage />} />
              <Route path="/tin-tuc"      element={<NewsPage />} />
              <Route path="/matches/:id"  element={<MatchDetailPage />} />
              <Route path="/login"        element={<LoginPage />} />
              <Route path="/register"     element={<RegisterPage />} />

              {/* Authenticated */}
              <Route path="/booking/:id" element={<ProtectedRoute><BookingPage /></ProtectedRoute>} />
              <Route path="/profile"     element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
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
        </div>

        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3500,
            style: {
              background: '#1a1a1a',
              color: '#f0f0f0',
              border: '1px solid #2a2a2a',
              borderRadius: '10px',
              fontFamily: "'Inter', sans-serif",
              fontSize: '13px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            },
            success: {
              iconTheme: { primary: '#39ff14', secondary: '#000' },
            },
            error: {
              iconTheme: { primary: '#e53935', secondary: '#fff' },
            },
          }}
        />
      </BrowserRouter>
      </CartProvider>
    </AuthProvider>
  );
}
