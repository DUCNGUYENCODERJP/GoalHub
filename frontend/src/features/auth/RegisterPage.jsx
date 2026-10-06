import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { register as registerApi } from '../../api/authApi';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '', fullName: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  function set(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (form.password !== form.confirm) {
      toast.error('Mật khẩu xác nhận không khớp');
      return;
    }
    setLoading(true);
    try {
      await registerApi({ email: form.email, password: form.password, fullName: form.fullName });
      toast.success('🎉 Đăng ký thành công! Vui lòng đăng nhập.');
      navigate('/login');
    } catch (err) {
      const msg = err.response?.data?.message || 'Đăng ký thất bại, vui lòng thử lại.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  const pwStrength = (() => {
    const p = form.password;
    if (!p) return null;
    if (p.length < 6) return { level: 0, label: 'Quá ngắn', color: 'bg-red-400' };
    if (p.length < 8) return { level: 1, label: 'Yếu', color: 'bg-orange-400' };
    if (!/[A-Z]/.test(p) || !/[0-9]/.test(p)) return { level: 2, label: 'Trung bình', color: 'bg-yellow-400' };
    return { level: 3, label: 'Mạnh', color: 'bg-green-400' };
  })();

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
          <h1 className="text-2xl font-bold text-slate-800">Tạo tài khoản mới</h1>
          <p className="text-slate-400 text-sm mt-1">Miễn phí, nhanh chóng, an toàn</p>
        </div>

        {/* Benefits */}
        <div className="mb-6 grid grid-cols-3 gap-3">
          {[
            { icon: '🎟', text: 'Đặt vé nhanh' },
            { icon: '📱', text: 'Quản lý đơn' },
            { icon: '🔔', text: 'Thông báo KM' },
          ].map(b => (
            <div key={b.text} className="bg-white border border-slate-100 rounded-xl p-3 text-center shadow-sm">
              <div className="text-2xl mb-1">{b.icon}</div>
              <p className="text-xs text-slate-600 font-medium">{b.text}</p>
            </div>
          ))}
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8">
          <form onSubmit={handleSubmit} className="space-y-4" id="register-form">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Họ và tên
              </label>
              <input
                id="register-fullname"
                type="text"
                required
                value={form.fullName}
                onChange={set('fullName')}
                placeholder="Nguyễn Văn An"
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-400 focus:ring-3 focus:ring-blue-100 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Email
              </label>
              <input
                id="register-email"
                type="email"
                required
                autoComplete="email"
                value={form.email}
                onChange={set('email')}
                placeholder="you@example.com"
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-400 focus:ring-3 focus:ring-blue-100 transition-all"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-semibold text-slate-700">Mật khẩu</label>
                <button type="button" onClick={() => setShowPw(!showPw)} className="text-xs text-blue-600">
                  {showPw ? 'Ẩn' : 'Hiện'}
                </button>
              </div>
              <input
                id="register-password"
                type={showPw ? 'text' : 'password'}
                required
                minLength={6}
                value={form.password}
                onChange={set('password')}
                placeholder="Ít nhất 6 ký tự"
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-400 focus:ring-3 focus:ring-blue-100 transition-all"
              />
              {/* Password strength */}
              {pwStrength && (
                <div className="mt-2 space-y-1">
                  <div className="flex gap-1">
                    {[0, 1, 2].map(i => (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded-full transition-colors ${i <= pwStrength.level - 1 ? pwStrength.color : 'bg-slate-100'}`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-slate-400">Độ mạnh: <span className="font-medium">{pwStrength.label}</span></p>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Xác nhận mật khẩu
              </label>
              <input
                id="register-confirm"
                type={showPw ? 'text' : 'password'}
                required
                value={form.confirm}
                onChange={set('confirm')}
                placeholder="Nhập lại mật khẩu"
                className={`w-full border rounded-xl px-4 py-3 text-sm placeholder-slate-400 focus:outline-none focus:ring-3 transition-all ${
                  form.confirm && form.password !== form.confirm
                    ? 'border-red-300 bg-red-50 focus:border-red-400 focus:ring-red-100 text-red-800'
                    : 'border-slate-200 text-slate-800 focus:border-blue-400 focus:ring-blue-100'
                }`}
              />
              {form.confirm && form.password !== form.confirm && (
                <p className="text-xs text-red-500 mt-1">⚠ Mật khẩu không khớp</p>
              )}
            </div>

            <button
              id="register-submit"
              type="submit"
              disabled={loading || (form.confirm && form.password !== form.confirm)}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 disabled:from-blue-300 disabled:to-blue-300 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-blue-600/25 hover:shadow-xl hover:-translate-y-0.5 disabled:translate-y-0 disabled:shadow-none flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Đang đăng ký...
                </>
              ) : (
                'Tạo tài khoản miễn phí'
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-100 text-center">
            <p className="text-sm text-slate-500">
              Đã có tài khoản?{' '}
              <Link to="/login" id="goto-login" className="text-blue-600 hover:text-blue-700 font-semibold">
                Đăng nhập →
              </Link>
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 mt-4">
          Bằng cách đăng ký, bạn đồng ý với{' '}
          <span className="text-blue-500">Điều khoản dịch vụ</span> và{' '}
          <span className="text-blue-500">Chính sách bảo mật</span> của GoalHub.
        </p>
      </div>
    </div>
  );
}
