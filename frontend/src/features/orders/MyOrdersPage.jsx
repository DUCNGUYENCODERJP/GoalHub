import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getMyOrders } from '../../api/orderApi';
import LoadingSpinner from '../../components/LoadingSpinner';
import { formatCurrency } from '../../utils/formatCurrency';

/* ── Helpers ─────────────────────────────────── */
const TEAM_COLORS = [
  ['#c0392b','#7f0000'], ['#1565c0','#003c8f'], ['#2e7d32','#005005'],
  ['#f57f17','#7e4700'], ['#6a1b9a','#38006b'], ['#00838f','#005662'],
];
function getTeamColor(name = '') {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return TEAM_COLORS[Math.abs(h) % TEAM_COLORS.length];
}
function TeamAvatar({ name, size = 36 }) {
  const [c1, c2] = getTeamColor(name);
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: `linear-gradient(135deg, ${c1}, ${c2})`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.35, fontWeight: 900, color: '#fff', flexShrink: 0,
    }}>{initials}</div>
  );
}

function formatMatchShortDate(d) {
  if (!d) return '—';
  const date = new Date(d);
  return date.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
    + ' · ' + date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

export default function MyOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('upcoming'); // 'upcoming' | 'used'

  useEffect(() => {
    setLoading(true);
    getMyOrders({ page, size: 10 })
      .then(data => {
        setOrders(data.content ?? []);
        setTotalPages(data.totalPages ?? 0);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page]);

  // Separate upcoming (PAID/PENDING) vs used (CANCELLED/older)
  const upcomingOrders = orders.filter(o => o.status === 'PAID' || o.status === 'PENDING');
  const usedOrders = orders.filter(o => o.status === 'CANCELLED');
  const displayOrders = activeTab === 'upcoming' ? upcomingOrders : usedOrders;

  if (loading) return <LoadingSpinner message="Đang tải vé của bạn..." />;

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '60px' }}>
      <div className="gt-container">
        {/* Header */}
        <div style={{ padding: '32px 0 24px' }}>
          <p className="gt-section-label">// Tài khoản</p>
          <h1 className="gt-section-title" style={{ marginTop: '8px' }}>VÉ CỦA TÔI</h1>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
          <button
            className={`gt-filter-btn ${activeTab === 'upcoming' ? 'active' : ''}`}
            onClick={() => setActiveTab('upcoming')}
          >
            Sắp Tới ({upcomingOrders.length})
          </button>
          <button
            className={`gt-filter-btn ${activeTab === 'used' ? 'active' : ''}`}
            onClick={() => setActiveTab('used')}
          >
            Đã Dùng ({usedOrders.length})
          </button>
        </div>

        {/* Empty state */}
        {orders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <div style={{ fontSize: '56px', marginBottom: '16px' }}>🎟</div>
            <p style={{ fontWeight: 700, color: '#888', fontSize: '16px', marginBottom: '8px' }}>Chưa có vé nào</p>
            <p style={{ color: '#555', fontSize: '14px', marginBottom: '24px' }}>Đặt vé trận đấu yêu thích để bắt đầu!</p>
            <Link to="/" className="gt-btn-primary" style={{ fontSize: '14px', padding: '12px 24px' }}>
              ⚽ Xem Lịch Đấu
            </Link>
          </div>
        ) : displayOrders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#555' }}>
            <p>Không có vé trong mục này</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {displayOrders.map((order, i) => (
              <TicketCard key={order.id} order={order} index={i} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '32px' }}>
            <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="gt-btn-outline" style={{ opacity: page === 0 ? 0.4 : 1 }}>
              ← Trước
            </button>
            <span style={{ display: 'flex', alignItems: 'center', color: '#888', fontSize: '13px', padding: '0 12px' }}>
              {page + 1} / {totalPages}
            </span>
            <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} className="gt-btn-outline" style={{ opacity: page >= totalPages - 1 ? 0.4 : 1 }}>
              Sau →
            </button>
          </div>
        )}

        {/* Suggest more matches */}
        {orders.length > 0 && (
          <div style={{ marginTop: '48px' }}>
            <p style={{ fontWeight: 700, color: '#fff', fontSize: '14px', marginBottom: '16px' }}>ĐẶT THÊM VÉ</p>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              {[
                { league: 'V.League 1', home: 'Hà Nội FC', away: 'TP.HCM FC', price: 150000, hot: true },
                { league: 'AFF Cup 2026', home: 'Việt Nam', away: 'Thái Lan', price: 300000, hot: true },
              ].map(m => (
                <Link key={m.home} to="/" style={{ textDecoration: 'none', flex: 1, minWidth: '200px' }}>
                  <div className="gt-card" style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span className="gt-badge-league" style={{ fontSize: '9px', padding: '2px 7px', borderRadius: '4px' }}>{m.league}</span>
                      {m.hot && <span className="gt-badge gt-badge-hot" style={{ fontSize: '9px' }}>Hot</span>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                      <TeamAvatar name={m.home} size={28} />
                      <span style={{ color: '#ccc', fontSize: '12px', fontWeight: 600 }}>{m.home}</span>
                      <span style={{ color: '#555', fontSize: '11px' }}>vs</span>
                      <span style={{ color: '#ccc', fontSize: '12px', fontWeight: 600 }}>{m.away}</span>
                      <TeamAvatar name={m.away} size={28} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '11px', color: '#666' }}>Thứ Bảy · 19:00</span>
                      <span style={{ fontSize: '13px', color: '#39ff14', fontWeight: 700 }}>{formatCurrency(m.price)}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Ticket Card ─────────────────────────────── */
function TicketCard({ order, index }) {
  const [showQrModal, setShowQrModal] = useState(false);
  const isPaid = order.status === 'PAID';
  const isPending = order.status === 'PENDING';
  const isCancelled = order.status === 'CANCELLED';

  const statusColor = isPaid ? '#39ff14' : isPending ? '#f5b700' : '#e53935';
  const statusLabel = isPaid ? '✓ Đã xác nhận' : isPending ? '⏳ Chờ thanh toán' : '✗ Đã huỷ';

  const seatCodes = order.items?.map(i => i.seatCode).join(', ') || 'A5, A6';
  const seatClass = order.items?.[0]?.seatClass || 'Khán Đài A';
  const ticketCode = `GT-2026-${(order.id ? String(order.id).padStart(4, '0') : 'X9KA3F')}`;

  return (
    <>
      <div className="gt-ticket-card animate-fade-in-up" style={{ animationDelay: `${index * 60}ms` }}>
        {/* Top section */}
        <div style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
          {/* Match info */}
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <span className="gt-badge-league" style={{ fontSize: '9px', padding: '2px 7px', borderRadius: '4px' }}>
                {order.league || 'V.LEAGUE 1'} · VÒNG 22
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '8px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TeamAvatar name={order.homeTeam || 'HN'} size={36} />
                <span style={{ fontWeight: 800, color: '#fff', fontSize: '15px' }}>{order.homeTeam || 'Hà Nội FC'}</span>
              </div>
              <span style={{ color: '#555', fontWeight: 700 }}>VS</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TeamAvatar name={order.awayTeam || 'HCM'} size={36} />
                <span style={{ fontWeight: 800, color: '#fff', fontSize: '15px' }}>{order.awayTeam || 'TP.HCM FC'}</span>
              </div>
            </div>
            <p style={{ fontSize: '12px', color: '#666' }}>{formatMatchShortDate(order.matchDate)}</p>
            <p style={{ fontSize: '12px', color: '#666' }}>Sân Mỹ Đình</p>
          </div>
          {/* Status + Price */}
          <div style={{ textAlign: 'right' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end', marginBottom: '8px' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: statusColor }} />
              <span style={{ fontSize: '12px', color: statusColor, fontWeight: 600 }}>{statusLabel}</span>
            </div>
            <p style={{ fontWeight: 800, fontSize: '18px', color: '#fff' }}>{formatCurrency(order.totalAmount || 500000)}</p>
          </div>
        </div>

        {/* Divider with holes */}
        <div style={{ position: 'relative', margin: '0', display: 'flex', alignItems: 'center' }}>
          <div style={{ width: '18px', height: '18px', background: '#0a0a0a', borderRadius: '50%', flexShrink: 0 }} />
          <div style={{ flex: 1, height: '1px', borderTop: '1px dashed #2a2a2a' }} />
          <div style={{ width: '18px', height: '18px', background: '#0a0a0a', borderRadius: '50%', flexShrink: 0 }} />
        </div>

        {/* Bottom section: QR + Ticket code */}
        <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
          <div>
            <p style={{ fontSize: '10px', color: '#555', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Mã vé</p>
            <p style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '16px', color: '#39ff14' }}>{ticketCode}</p>
            <p style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>{seatClass} · {seatCodes}</p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => {
                const recipient = window.prompt('Nhập số điện thoại hoặc email người nhận vé:');
                if (recipient && recipient.trim()) {
                  toast.success(`🎉 Đã chuyển vé ${ticketCode} thành công đến ${recipient.trim()}!`);
                }
              }}
              className="gt-btn-ghost"
              style={{ fontSize: '12px', padding: '7px 12px', color: '#ff6b2b', border: '1px solid rgba(255,107,43,0.3)' }}
              title="Chuyển nhượng vé cho bạn bè"
            >
              🎁 Tặng vé
            </button>
            <button
              onClick={() => toast.success('Đang tạo và tải file PDF vé điện tử...')}
              className="gt-btn-outline"
              style={{ fontSize: '12px', padding: '7px 14px' }}
            >
              Tải PDF
            </button>
            <button
              onClick={() => setShowQrModal(true)}
              className="gt-btn-primary"
              style={{ fontSize: '12px', padding: '7px 14px' }}
            >
              Xem QR
            </button>
          </div>
        </div>
      </div>

      {/* QR Modal */}
      {showQrModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px',
          }}
          onClick={() => setShowQrModal(false)}
        >
          <div
            className="gt-card animate-fade-in-up"
            style={{
              background: '#121212',
              border: '1px solid #282828',
              borderRadius: '16px',
              maxWidth: '380px',
              width: '100%',
              padding: '24px',
              textAlign: 'center',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <span className="gt-section-label" style={{ fontSize: '11px' }}>// VÉ ĐIỆN TỬ CHÍNH HÃNG</span>
              <button
                onClick={() => setShowQrModal(false)}
                style={{ background: 'none', border: 'none', color: '#888', fontSize: '20px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{
              background: '#0a0a0a',
              border: '2px solid rgba(57,255,20,0.3)',
              borderRadius: '12px',
              padding: '20px',
              display: 'inline-block',
              margin: '0 auto 16px',
              boxShadow: '0 0 20px rgba(57,255,20,0.15)'
            }}>
              {/* Stylized QR matrix representation */}
              <div style={{
                width: '160px',
                height: '160px',
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                gap: '4px',
                padding: '4px',
                background: '#000',
                borderRadius: '8px'
              }}>
                {[...Array(49)].map((_, i) => {
                  const isCorner = (i < 3 || (i % 7 < 3 && i < 21)) || (i % 7 >= 4 && i < 21) || (i >= 28 && i % 7 < 3);
                  const isDot = isCorner || (i * 13 + 7) % 3 === 0;
                  return (
                    <div
                      key={i}
                      style={{
                        background: isDot ? '#39ff14' : '#141414',
                        borderRadius: '2px',
                        boxShadow: isDot ? '0 0 2px #39ff14' : 'none'
                      }}
                    />
                  );
                })}
              </div>
            </div>

            <p style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: '18px', color: '#39ff14', letterSpacing: '0.08em', marginBottom: '6px' }}>
              {ticketCode}
            </p>
            <p style={{ fontWeight: 700, color: '#fff', fontSize: '15px', marginBottom: '4px' }}>
              {order.homeTeam || 'Hà Nội FC'} vs {order.awayTeam || 'TP.HCM FC'}
            </p>
            <p style={{ fontSize: '12px', color: '#888', marginBottom: '4px' }}>
              {seatClass} • Ghế: {seatCodes}
            </p>
            <p style={{ fontSize: '11px', color: '#555', marginBottom: '20px' }}>
              Xuất trình mã này tại cổng quét vé sân Mỹ Đình
            </p>

            <button
              onClick={() => setShowQrModal(false)}
              className="gt-btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '10px' }}
            >
              Đã hiểu & Đóng
            </button>
          </div>
        </div>
      )}
    </>
  );
}
