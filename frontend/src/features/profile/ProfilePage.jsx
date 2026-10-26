/**
 * ProfilePage.jsx – Trang cá nhân theo Figma flow
 * Bao gồm: Member Card, thông tin cá nhân, thống kê vé, liên kết nhanh
 */
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

const TEAM_COLORS = [
  ['#c0392b','#7f0000'], ['#1565c0','#003c8f'], ['#2e7d32','#005005'],
  ['#f57f17','#7e4700'], ['#6a1b9a','#38006b'], ['#00838f','#005662'],
];
function getUserColor(name = '') {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return TEAM_COLORS[Math.abs(h) % TEAM_COLORS.length];
}

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('info');

  const [c1, c2] = getUserColor(user?.fullName || '');

  function handleLogout() {
    logout();
    toast.success('Đã đăng xuất');
    navigate('/');
  }

  const initials = (user?.fullName || 'U')
    .split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  const menuItems = [
    { icon: '🎟️', label: 'Vé của tôi',       path: '/orders/my',   desc: 'Xem vé sắp tới & lịch sử' },
    { icon: '🔔', label: 'Thông báo',         path: '/orders/my',   desc: 'Cập nhật trận đấu & khuyến mãi' },
    { icon: '💳', label: 'Phương thức TT',    path: '/orders/my',   desc: 'VNPay, MoMo, ZaloPay' },
    { icon: '🛡️', label: 'Bảo mật tài khoản', path: '/orders/my',  desc: 'Đổi mật khẩu, 2FA' },
    { icon: '❓', label: 'Trợ giúp & hỗ trợ', path: '/orders/my',   desc: 'FAQ, liên hệ hỗ trợ' },
  ];

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '60px' }}>
      <div className="gt-container" style={{ maxWidth: '680px' }}>
        <div style={{ padding: '32px 0 24px' }}>
          <p className="gt-section-label">// Tài khoản</p>
          <h1 className="gt-section-title" style={{ marginTop: '8px' }}>HỒ SƠ CÁ NHÂN</h1>
        </div>

        {/* ── Member Card ─────────────────── */}
        <div style={{
          borderRadius: '20px', overflow: 'hidden', marginBottom: '24px',
          background: `linear-gradient(135deg, ${c1} 0%, ${c2} 100%)`,
          boxShadow: `0 16px 48px ${c1}40`,
          position: 'relative',
        }}>
          {/* Background decorations */}
          <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '200px', height: '200px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
          <div style={{ position: 'absolute', bottom: '-20px', left: '-20px', width: '120px', height: '120px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />

          <div style={{ padding: '24px', position: 'relative', zIndex: 1 }}>
            {/* Card header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 900, color: 'rgba(255,255,255,0.9)', fontFamily: "'Barlow', sans-serif" }}>⚽ GOALTICKET</span>
                </div>
                <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', letterSpacing: '0.08em' }}>MEMBER CARD</p>
              </div>
              <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: `linear-gradient(135deg, ${c1}, ${c2})`, border: '2px solid rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 900, color: '#fff' }}>
                {initials}
              </div>
            </div>

            {/* Name */}
            <div style={{ marginBottom: '16px' }}>
              <p style={{ fontSize: '22px', fontWeight: 900, color: '#fff', letterSpacing: '-0.01em' }}>{user?.fullName || 'Người dùng'}</p>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginTop: '4px' }}>{user?.email}</p>
            </div>

            {/* Card number mock */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <div>
                <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>ID THÀNH VIÊN</p>
                <p style={{ fontFamily: 'monospace', fontSize: '13px', color: 'rgba(255,255,255,0.8)', letterSpacing: '0.1em' }}>
                  GT-{String(user?.id || 0).padStart(6, '0')}
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>HẠNG THÀNH VIÊN</p>
                <span style={{ fontSize: '11px', fontWeight: 700, background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '20px', padding: '2px 10px', color: '#fff' }}>
                  {user?.role === 'ADMIN' ? '⭐ ADMIN' : '🥉 BRONZE'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Stats Row ─────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}>
          {[
            { label: 'Vé đã mua',  value: '—',  icon: '🎟️' },
            { label: 'Trận đã xem', value: '—', icon: '⚽' },
            { label: 'Tiết kiệm',  value: '—',  icon: '💰' },
          ].map(s => (
            <div key={s.label} className="gt-card-flat" style={{ padding: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: '22px', marginBottom: '6px' }}>{s.icon}</div>
              <p style={{ fontSize: '20px', fontWeight: 900, color: '#fff' }}>{s.value}</p>
              <p style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* ── Tabs ─────────────────── */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
          {[
            { key: 'info',  label: 'Thông tin' },
            { key: 'settings', label: 'Cài đặt' },
          ].map(t => (
            <button key={t.key}
              className={`gt-filter-btn ${activeTab === t.key ? 'active' : ''}`}
              onClick={() => setActiveTab(t.key)}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Info Tab ─────────────────── */}
        {activeTab === 'info' && (
          <div>
            <div className="gt-card-flat" style={{ padding: '20px', marginBottom: '16px' }}>
              <p style={{ fontSize: '12px', color: '#666', fontWeight: 700, marginBottom: '16px' }}>THÔNG TIN TÀI KHOẢN</p>
              {[
                { label: 'Họ và tên', value: user?.fullName || '—' },
                { label: 'Email',     value: user?.email    || '—' },
                { label: 'Vai trò',   value: user?.role === 'ADMIN' ? 'Quản trị viên' : 'Người dùng' },
              ].map(f => (
                <div key={f.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #1a1a1a' }}>
                  <span style={{ fontSize: '13px', color: '#666' }}>{f.label}</span>
                  <span style={{ fontSize: '13px', color: '#ccc', fontWeight: 600 }}>{f.value}</span>
                </div>
              ))}
            </div>

            {/* Quick links menu */}
            <div className="gt-card-flat" style={{ padding: '8px', marginBottom: '16px' }}>
              {menuItems.map((item, i) => (
                <Link key={item.label} to={item.path}
                  style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 12px', textDecoration: 'none', borderRadius: '8px', transition: 'background 0.2s', borderBottom: i < menuItems.length - 1 ? '1px solid #1a1a1a' : 'none' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#1a1a1a'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <span style={{ fontSize: '20px', width: '28px', textAlign: 'center' }}>{item.icon}</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>{item.label}</p>
                    <p style={{ fontSize: '11px', color: '#555', marginTop: '1px' }}>{item.desc}</p>
                  </div>
                  <span style={{ color: '#555', fontSize: '16px' }}>›</span>
                </Link>
              ))}
            </div>

            {/* Logout */}
            <button onClick={handleLogout}
              style={{ width: '100%', padding: '14px', borderRadius: '10px', border: '1px solid rgba(229,57,53,0.3)', background: 'rgba(229,57,53,0.06)', color: '#e53935', fontSize: '14px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(229,57,53,0.12)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(229,57,53,0.06)'}>
              🚪 Đăng xuất
            </button>
          </div>
        )}

        {/* ── Settings Tab ─────────────────── */}
        {activeTab === 'settings' && (
          <div className="gt-card-flat" style={{ padding: '24px' }}>
            <p style={{ fontSize: '12px', color: '#666', fontWeight: 700, marginBottom: '16px' }}>CÀI ĐẶT</p>
            {[
              { label: 'Ngôn ngữ',           value: 'Tiếng Việt',  icon: '🌐' },
              { label: 'Thông báo email',     value: 'Bật',         icon: '📧' },
              { label: 'Thông báo push',      value: 'Bật',         icon: '🔔' },
              { label: 'Giao diện tối',       value: 'Bật',         icon: '🌙' },
            ].map(s => (
              <div key={s.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid #1a1a1a' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '18px' }}>{s.icon}</span>
                  <span style={{ fontSize: '13px', color: '#ccc' }}>{s.label}</span>
                </div>
                <span style={{ fontSize: '12px', color: '#39ff14', fontWeight: 600 }}>{s.value}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
