import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { login as loginApi, getMe } from '../../api/authApi';
import { useAuth } from '../../context/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const { token } = await loginApi(form);
      localStorage.setItem('goalhub_token', token);
      const profile = await getMe();
      login(token, profile);
      toast.success(`⚽ Chào mừng, ${profile.fullName}!`);
      navigate('/');
    } catch (err) {
      const msg = err.response?.data?.message || 'Email hoặc mật khẩu không đúng';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: 'calc(100vh - 96px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <div className="gt-logo-icon" style={{ width: '44px', height: '44px', fontSize: '22px' }}>⚽</div>
            <span className="gt-logo-text" style={{ fontSize: '24px' }}>GOAL<span>TICKET</span></span>
          </div>
          <h1 style={{ fontFamily: "'Barlow', sans-serif", fontSize: '26px', fontWeight: 900, color: '#fff', marginBottom: '6px' }}>
            Chào mừng trở lại
          </h1>
          <p style={{ fontSize: '13px', color: '#666' }}>Đăng nhập để đặt vé và quản lý đơn hàng</p>
        </div>

        {/* Demo hint */}
        <div style={{ background: '#141414', border: '1px solid #2a2a2a', borderRadius: '10px', padding: '14px', marginBottom: '20px' }}>
          <p style={{ fontSize: '12px', fontWeight: 700, color: '#39ff14', marginBottom: '8px' }}>🎯 Tài khoản demo:</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <p style={{ fontFamily: 'monospace', fontSize: '12px', color: '#888' }}>👤 user@goalhub.vn / <strong style={{ color: '#ccc' }}>password</strong></p>
            <p style={{ fontFamily: 'monospace', fontSize: '12px', color: '#888' }}>🛠 admin@goalhub.vn / <strong style={{ color: '#ccc' }}>admin123</strong></p>
          </div>
        </div>

        {/* Form */}
        <div className="gt-card-flat" style={{ padding: '28px' }}>
          <form onSubmit={handleSubmit} id="login-form" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#888', display: 'block', marginBottom: '8px' }}>Email</label>
              <input
                id="login-email"
                type="email"
                required
                autoComplete="email"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                placeholder="you@example.com"
                className="gt-input"
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#888' }}>Mật khẩu</label>
                <button type="button" onClick={() => setShowPw(!showPw)}
                  style={{ fontSize: '12px', color: '#39ff14', background: 'none', border: 'none', cursor: 'pointer' }}>
                  {showPw ? 'Ẩn' : 'Hiện'}
                </button>
              </div>
              <input
                id="login-password"
                type={showPw ? 'text' : 'password'}
                required
                autoComplete="current-password"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                placeholder="••••••••"
                className="gt-input"
              />
            </div>

            <button
              id="login-submit"
              type="submit"
              disabled={loading}
              className="gt-btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '13px', fontSize: '14px', borderRadius: '8px', marginTop: '4px', opacity: loading ? 0.7 : 1 }}
            >
              {loading ? (
                <>
                  <div style={{ width: '14px', height: '14px', border: '2px solid rgba(0,0,0,0.3)', borderTopColor: '#000', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
                  Đang đăng nhập...
                </>
              ) : 'Đăng nhập'}
            </button>
          </form>

          <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #1e1e1e', textAlign: 'center' }}>
            <p style={{ fontSize: '13px', color: '#666' }}>
              Chưa có tài khoản?{' '}
              <Link to="/register" id="goto-register" style={{ color: '#39ff14', fontWeight: 600, textDecoration: 'none' }}>
                Đăng ký miễn phí →
              </Link>
            </p>
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
