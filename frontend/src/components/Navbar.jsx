import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import toast from 'react-hot-toast';

/* Live ticker data */
const TICKER_ITEMS = [
  { home: 'B', homeScore: 3, away: 'CLB Phú Thọ', awayScore: 2, status: 'KT' },
  { home: 'Hải Phòng', homeScore: 2, away: 'SLNA', awayScore: 1, status: '67', live: true },
  { home: 'Bình Định', homeScore: 0, away: 'Khánh Hòa', awayScore: 0, status: '23', live: true },
  { home: 'Hà Nội B', homeScore: 3, away: 'CLB Phú Thọ', awayScore: 2, status: 'KT' },
];

function LiveTicker() {
  // duplicate items for seamless loop
  const items = [...TICKER_ITEMS, ...TICKER_ITEMS];
  return (
    <div className="gt-ticker-wrap">
      <div className="gt-ticker-live">
        <span className="dot" />
        LIVE
      </div>
      <div style={{ overflow: 'hidden', flex: 1 }}>
        <div className="gt-ticker-scroll">
          {items.map((item, i) => (
            <div key={i} className="gt-ticker-item">
              <span>{item.home}</span>
              <span className="score">{item.homeScore} – {item.awayScore}</span>
              <span>{item.away}</span>
              {item.live
                ? <span className="live-badge">{item.status}&apos;</span>
                : <span className="kt-badge">KT</span>
              }
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Navbar() {
  const { isAuthenticated, isAdmin, user, logout } = useAuth();
  const { openCart, totalItemCount } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  function handleLogout() {
    logout();
    toast.success('Đã đăng xuất thành công');
    navigate('/');
  }

  const isActive = (path) => location.pathname === path;

  return (
    <>
      <LiveTicker />
      <nav className={`gt-navbar ${scrolled ? 'scrolled' : ''}`}>
        <div className="gt-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', height: '100%' }}>
          {/* Logo */}
          <Link to="/" className="gt-logo">
            <div className="gt-logo-icon">⚽</div>
            <span className="gt-logo-text">GOAL<span>TICKET</span></span>
          </Link>

          {/* Desktop Nav */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }} className="nav-desktop">
            <Link to="/" className={`gt-nav-link ${isActive('/') ? 'active' : ''}`}>Trang Chủ</Link>
            <Link to="/lich-dau" className={`gt-nav-link ${isActive('/lich-dau') ? 'active' : ''}`}>Lịch Đấu</Link>
            <Link to="/tin-tuc" className={`gt-nav-link ${isActive('/tin-tuc') ? 'active' : ''}`}>Tin Tức</Link>
            {isAuthenticated && (
              <>
                <Link to="/orders/my" className={`gt-nav-link ${isActive('/orders/my') ? 'active' : ''}`}>Vé Của Tôi</Link>
                <Link to="/profile" className={`gt-nav-link ${isActive('/profile') ? 'active' : ''}`}>Hồ Sơ</Link>
              </>
            )}
            {isAdmin && (
              <Link to="/admin/matches" className={`gt-nav-link ${location.pathname.startsWith('/admin') ? 'active' : ''}`}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#fbbf24', animation: 'blink 1s infinite' }} />
                  Quản lý
                </span>
              </Link>
            )}
          </div>

          {/* Auth area */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }} className="nav-desktop">
            {/* Interactive Cart Drawer Trigger */}
            <button
              onClick={openCart}
              title="Giỏ vé"
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: '#141414',
                border: '1px solid #222',
                color: '#ddd',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = '#39ff14'}
              onMouseLeave={e => e.currentTarget.style.borderColor = '#222'}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="2"/>
                <line x1="2" y1="10" x2="22" y2="10"/>
                <circle cx="6" cy="15" r="1"/>
                <circle cx="10" cy="15" r="1"/>
              </svg>
              {totalItemCount > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-4px',
                  background: '#39ff14',
                  color: '#000',
                  fontSize: '10px',
                  fontWeight: 900,
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 6px rgba(57,255,20,0.6)',
                }}>
                  {totalItemCount}
                </span>
              )}
            </button>

            {isAuthenticated ? (
              <>
                <Link to="/profile" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
                  <div style={{
                    width: '32px', height: '32px', borderRadius: '50%',
                    background: 'linear-gradient(135deg, #39ff14, #1a8a00)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 800, fontSize: '13px', color: '#000', border: '2px solid transparent',
                    transition: 'border-color 0.2s',
                  }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = '#39ff14'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = 'transparent'}
                  >
                    {user?.fullName?.charAt(0) || 'U'}
                  </div>
                </Link>
                <button onClick={handleLogout} className="gt-btn-outline" style={{ fontSize: '12px', padding: '6px 14px' }}>
                  Đăng xuất
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="gt-btn-ghost">Đăng nhập</Link>
                <Link to="/register" className="gt-btn-primary">Đăng ký</Link>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            style={{ display: 'none', background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: '8px' }}
            className="nav-mobile-toggle"
            aria-label="Mở menu"
          >
            <div style={{ width: '20px', height: '2px', background: '#fff', marginBottom: '4px', transition: 'all 0.2s', transform: mobileOpen ? 'rotate(45deg) translateY(6px)' : 'none' }} />
            <div style={{ width: '20px', height: '2px', background: '#fff', marginBottom: '4px', transition: 'all 0.2s', opacity: mobileOpen ? 0 : 1 }} />
            <div style={{ width: '20px', height: '2px', background: '#fff', transition: 'all 0.2s', transform: mobileOpen ? 'rotate(-45deg) translateY(-6px)' : 'none' }} />
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileOpen && (
          <div style={{
            position: 'absolute', top: '60px', left: 0, right: 0,
            background: '#0d0d0d', borderBottom: '1px solid #2a2a2a',
            padding: '12px 16px', zIndex: 200
          }}>
            <Link to="/" className={`gt-nav-link ${isActive('/') ? 'active' : ''}`} style={{ display: 'block', marginBottom: '4px' }}>Trang Chủ</Link>
            <Link to="/lich-dau" className={`gt-nav-link ${isActive('/lich-dau') ? 'active' : ''}`} style={{ display: 'block', marginBottom: '4px' }}>Lịch Đấu</Link>
            <Link to="/tin-tuc" className={`gt-nav-link ${isActive('/tin-tuc') ? 'active' : ''}`} style={{ display: 'block', marginBottom: '4px' }}>Tin Tức</Link>
            {isAuthenticated && (
              <>
                <Link to="/orders/my" className="gt-nav-link" style={{ display: 'block', marginBottom: '4px' }}>🎟️ Vé Của Tôi</Link>
                <Link to="/profile" className="gt-nav-link" style={{ display: 'block', marginBottom: '4px' }}>👤 Hồ Sơ</Link>
              </>
            )}
            <div style={{ borderTop: '1px solid #2a2a2a', marginTop: '8px', paddingTop: '8px' }}>
              {isAuthenticated ? (
                <button onClick={handleLogout} className="gt-btn-outline" style={{ width: '100%' }}>Đăng xuất</button>
              ) : (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Link to="/login" className="gt-btn-ghost">Đăng nhập</Link>
                  <Link to="/register" className="gt-btn-primary">Đăng ký</Link>
                </div>
              )}
            </div>
          </div>
        )}
      </nav>

      <style>{`
        @media (max-width: 768px) {
          .nav-desktop { display: none !important; }
          .nav-mobile-toggle { display: block !important; }
        }
      `}</style>
    </>
  );
}
