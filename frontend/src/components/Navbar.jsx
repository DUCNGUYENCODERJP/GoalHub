import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function Navbar() {
  const { isAuthenticated, isAdmin, user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  function handleLogout() {
    logout();
    toast.success('Đã đăng xuất thành công');
    navigate('/');
  }

  const isActive = (path) => location.pathname === path;

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-[#0a0f1e]/95 backdrop-blur-md shadow-2xl border-b border-white/10'
            : 'bg-[#0a0f1e]'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-green-400 flex items-center justify-center text-lg shadow-lg group-hover:scale-105 transition-transform">
                ⚽
              </div>
              <span
                className="text-xl font-black tracking-tight text-white"
                style={{ fontFamily: "'Outfit', sans-serif" }}
              >
                Goal<span className="text-green-400">Hub</span>
              </span>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-1">
              <NavLink to="/" active={isActive('/')}>Trận đấu</NavLink>

              {isAuthenticated && (
                <NavLink to="/orders/my" active={isActive('/orders/my')}>
                  Đơn hàng
                </NavLink>
              )}

              {isAdmin && (
                <NavLink to="/admin/matches" active={location.pathname.startsWith('/admin')}>
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
                    Quản lý
                  </span>
                </NavLink>
              )}
            </div>

            {/* Auth area */}
            <div className="hidden md:flex items-center gap-3">
              {isAuthenticated ? (
                <>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs">
                      {user?.fullName?.charAt(0) || 'U'}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-white text-xs font-medium leading-none">{user?.fullName}</span>
                      {isAdmin && (
                        <span className="text-[10px] bg-yellow-400/20 text-yellow-300 px-1.5 py-0.5 rounded mt-0.5 font-bold uppercase leading-none">
                          Admin
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="text-sm text-slate-400 hover:text-white border border-white/10 hover:border-white/30 px-4 py-1.5 rounded-lg transition-all"
                  >
                    Đăng xuất
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="text-sm text-slate-300 hover:text-white px-4 py-1.5 rounded-lg transition-colors"
                  >
                    Đăng nhập
                  </Link>
                  <Link
                    to="/register"
                    className="text-sm bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 text-white font-semibold px-4 py-1.5 rounded-lg transition-all shadow-lg shadow-blue-900/40"
                  >
                    Đăng ký miễn phí
                  </Link>
                </>
              )}
            </div>

            {/* Mobile hamburger */}
            <button
              className="md:hidden text-white p-2"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Mở menu"
            >
              <div className={`w-5 h-0.5 bg-white mb-1 transition-all ${mobileOpen ? 'rotate-45 translate-y-1.5' : ''}`} />
              <div className={`w-5 h-0.5 bg-white mb-1 transition-all ${mobileOpen ? 'opacity-0' : ''}`} />
              <div className={`w-5 h-0.5 bg-white transition-all ${mobileOpen ? '-rotate-45 -translate-y-1.5' : ''}`} />
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <div
          className={`md:hidden overflow-hidden transition-all duration-300 ${
            mobileOpen ? 'max-h-96 border-t border-white/10' : 'max-h-0'
          }`}
        >
          <div className="px-4 py-4 space-y-2 bg-[#0d1633]">
            <MobileNavLink to="/" active={isActive('/')}>⚽ Trận đấu</MobileNavLink>
            {isAuthenticated && (
              <MobileNavLink to="/orders/my" active={isActive('/orders/my')}>📋 Đơn hàng của tôi</MobileNavLink>
            )}
            {isAdmin && (
              <MobileNavLink to="/admin/matches" active={location.pathname.startsWith('/admin')}>🛠 Quản lý</MobileNavLink>
            )}
            <div className="pt-2 border-t border-white/10">
              {isAuthenticated ? (
                <div className="space-y-2">
                  <p className="text-slate-400 text-sm px-3">{user?.fullName}</p>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left text-sm text-red-400 hover:text-red-300 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors"
                  >
                    Đăng xuất
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Link to="/login" className="block text-sm text-slate-300 hover:text-white px-3 py-2 rounded-lg hover:bg-white/5 transition-colors">
                    Đăng nhập
                  </Link>
                  <Link to="/register" className="block text-sm bg-blue-600 hover:bg-blue-500 text-white font-semibold px-3 py-2 rounded-lg transition-colors text-center">
                    Đăng ký miễn phí
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Navbar spacer */}
      <div className="h-16" />
    </>
  );
}

function NavLink({ to, active, children }) {
  return (
    <Link
      to={to}
      className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-all ${
        active
          ? 'text-white bg-white/10'
          : 'text-slate-400 hover:text-white hover:bg-white/5'
      }`}
    >
      {children}
      {active && (
        <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-green-400" />
      )}
    </Link>
  );
}

function MobileNavLink({ to, active, children }) {
  return (
    <Link
      to={to}
      className={`block px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
        active ? 'bg-blue-600/20 text-blue-400' : 'text-slate-300 hover:text-white hover:bg-white/5'
      }`}
    >
      {children}
    </Link>
  );
}
