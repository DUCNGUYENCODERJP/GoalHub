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
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 py-12 px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2.5 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-green-400 flex items-center justify-center text-2xl shadow-xl">
              ⚽
            </div>
            <span className="text-2xl font-black text-slate-800" style={{ fontFamily: "'Outfit', sans-serif" }}>
              Goal<span className="text-blue-600">Hub</span>
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Chào mừng trở lại</h1>
          <p className="text-slate-400 text-sm mt-1">Đăng nhập để đặt vé và quản lý đơn hàng</p>
        </div>

        {/* Demo credentials hint */}
        <div className="mb-6 bg-blue-50 border border-blue-100 rounded-2xl p-4 text-sm">
          <p className="font-semibold text-blue-800 mb-2">🎯 Tài khoản demo:</p>
          <div className="space-y-1 text-blue-700 font-mono text-xs">
            <p>👤 user@goalhub.vn / <strong>password</strong></p>
            <p>🛠 admin@goalhub.vn / <strong>admin123</strong></p>
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8">
          <form onSubmit={handleSubmit} className="space-y-5" id="login-form">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Email
              </label>
              <input
                id="login-email"
                type="email"
                required
                autoComplete="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="you@example.com"
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-400 focus:ring-3 focus:ring-blue-100 transition-all"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-semibold text-slate-700">
                  Mật khẩu
                </label>
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="text-xs text-blue-600 hover:text-blue-700"
                >
                  {showPw ? 'Ẩn' : 'Hiện'}
                </button>
              </div>
              <input
                id="login-password"
                type={showPw ? 'text' : 'password'}
                required
                autoComplete="current-password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="••••••••"
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-400 focus:ring-3 focus:ring-blue-100 transition-all"
              />
            </div>

            <button
              id="login-submit"
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 disabled:from-blue-300 disabled:to-blue-300 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-blue-600/25 hover:shadow-xl hover:-translate-y-0.5 disabled:translate-y-0 disabled:shadow-none flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Đang đăng nhập...
                </>
              ) : (
                'Đăng nhập'
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-100 text-center">
            <p className="text-sm text-slate-500">
              Chưa có tài khoản?{' '}
              <Link to="/register" id="goto-register" className="text-blue-600 hover:text-blue-700 font-semibold">
                Đăng ký miễn phí →
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
