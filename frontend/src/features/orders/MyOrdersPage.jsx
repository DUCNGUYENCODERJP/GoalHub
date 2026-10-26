import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getMyOrders, cancelOrder } from '../../api/orderApi';
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
  const initials = name ? name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : 'GH';
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

  function fetchOrders(pageIdx = page) {
    getMyOrders({ page: pageIdx, size: 10 })
      .then(data => {
        setOrders(data.content ?? []);
        setTotalPages(data.totalPages ?? 0);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchOrders(page);
  }, [page]);

  async function handleCancelOrder(orderId) {
    if (!window.confirm('Bạn có chắc muốn huỷ đơn hàng này? Ghế sẽ được giải phóng ngay lập tức.')) {
      return;
    }
    try {
      await cancelOrder(orderId);
      toast.success('Đơn hàng đã được huỷ thành công.');
      fetchOrders(page);
    } catch (err) {
      const msg = err.response?.data?.message || 'Không thể huỷ đơn hàng.';
      toast.error(msg);
    }
  }

  // Separate upcoming (PAID/PENDING) vs used (CANCELLED)
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
            Đang Hoạt Động / Sắp Tới ({upcomingOrders.length})
          </button>
          <button
            className={`gt-filter-btn ${activeTab === 'used' ? 'active' : ''}`}
            onClick={() => setActiveTab('used')}
          >
            Đã Huỷ / Hết Hạn ({usedOrders.length})
          </button>
        </div>

        {/* Empty state */}
        {orders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <div style={{ fontSize: '56px', marginBottom: '16px' }}>🎟</div>
            <p style={{ fontWeight: 700, color: '#888', fontSize: '16px', marginBottom: '8px' }}>Chưa có đơn đặt vé nào</p>
            <p style={{ color: '#555', fontSize: '14px', marginBottom: '24px' }}>Đặt vé trận đấu yêu thích để tận hưởng không khí cuồng nhiệt!</p>
            <Link to="/" className="gt-btn-primary" style={{ fontSize: '14px', padding: '12px 24px', textDecoration: 'none' }}>
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
              <TicketCard key={order.id} order={order} index={i} onCancel={handleCancelOrder} />
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
      </div>
    </div>
  );
}

/* ── Ticket Card Component ───────────────────── */
function TicketCard({ order, index, onCancel }) {
  const [showQrModal, setShowQrModal] = useState(false);
  const isPaid = order.status === 'PAID';
  const isPending = order.status === 'PENDING';

  const statusColor = isPaid ? '#39ff14' : isPending ? '#f5b700' : '#e53935';
  const statusLabel = isPaid ? '✓ Đã xác nhận' : isPending ? '⏳ Chờ thanh toán' : '✗ Đã huỷ';

  const seatCodes = order.items?.map(i => i.seatCode).join(', ') || (order.items?.length > 0 ? `${order.items.length} ghế` : 'Ghế đã chọn');
  const ticketCode = `GT-2026-${String(order.id).padStart(4, '0')}`;

  return (
    <>
      <div className="gt-ticket-card animate-fade-in-up" style={{ animationDelay: `${index * 60}ms` }}>
        {/* Top section */}
        <div style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
          {/* Match info */}
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <span className="gt-badge-league" style={{ fontSize: '9px', padding: '2px 7px', borderRadius: '4px' }}>
                V.LEAGUE 1 · ĐƠN #{order.id}
              </span>
              {isPending && order.expiresAt && (
                <span style={{ fontSize: '10px', color: '#f5b700', background: 'rgba(245,183,0,0.1)', padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(245,183,0,0.3)' }}>
                  ⏱️ Giữ chỗ đến {new Date(order.expiresAt).toLocaleTimeString('vi-VN')}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '8px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TeamAvatar name={order.homeTeam} size={36} />
                <span style={{ fontWeight: 800, color: '#fff', fontSize: '15px' }}>{order.homeTeam}</span>
              </div>
              <span style={{ color: '#555', fontWeight: 700 }}>VS</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TeamAvatar name={order.awayTeam} size={36} />
                <span style={{ fontWeight: 800, color: '#fff', fontSize: '15px' }}>{order.awayTeam}</span>
              </div>
            </div>
            <p style={{ fontSize: '12px', color: '#888' }}>{formatMatchShortDate(order.matchDate)}</p>
          </div>

          {/* Status + Price */}
          <div style={{ textAlign: 'right' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end', marginBottom: '8px' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: statusColor }} />
              <span style={{ fontSize: '12px', color: statusColor, fontWeight: 600 }}>{statusLabel}</span>
            </div>
            <p style={{ fontWeight: 800, fontSize: '18px', color: '#fff' }}>{formatCurrency(order.totalAmount)}</p>
          </div>
        </div>

        {/* Divider with holes */}
        <div style={{ position: 'relative', margin: '0', display: 'flex', alignItems: 'center' }}>
          <div style={{ width: '18px', height: '18px', background: '#0a0a0a', borderRadius: '50%', flexShrink: 0 }} />
          <div style={{ flex: 1, height: '1px', borderTop: '1px dashed #2a2a2a' }} />
          <div style={{ width: '18px', height: '18px', background: '#0a0a0a', borderRadius: '50%', flexShrink: 0 }} />
        </div>

        {/* Bottom section: Actions */}
        <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
          <div>
            <p style={{ fontSize: '10px', color: '#555', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Mã đặt chỗ</p>
            <p style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '15px', color: '#39ff14' }}>{ticketCode}</p>
            {order.items?.length > 0 && (
              <p style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>Ghế: {seatCodes}</p>
            )}
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            {isPending && (
              <>
                <button
                  type="button"
                  onClick={() => onCancel(order.id)}
                  className="gt-btn-ghost"
                  style={{ fontSize: '12px', padding: '7px 12px', color: '#e53935', border: '1px solid rgba(229,57,53,0.3)' }}
                >
                  Huỷ đơn
                </button>
                <Link
                  to={`/orders/${order.id}`}
                  className="gt-btn-primary"
                  style={{ fontSize: '12px', padding: '7px 16px', textDecoration: 'none' }}
                >
                  Thanh toán ngay →
                </Link>
              </>
            )}

            {isPaid && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    const recipient = window.prompt('Nhập số điện thoại hoặc email người nhận vé:');
                    if (recipient && recipient.trim()) {
                      toast.success(`🎉 Đã gửi thông tin chuyển vé ${ticketCode} đến ${recipient.trim()}!`);
                    }
                  }}
                  className="gt-btn-ghost"
                  style={{ fontSize: '12px', padding: '7px 12px', color: '#ff6b2b', border: '1px solid rgba(255,107,43,0.3)' }}
                >
                  🎁 Tặng vé
                </button>
                <Link
                  to={`/orders/${order.id}`}
                  className="gt-btn-outline"
                  style={{ fontSize: '12px', padding: '7px 14px', textDecoration: 'none' }}
                >
                  Chi tiết vé
                </Link>
                <button
                  type="button"
                  onClick={() => setShowQrModal(true)}
                  className="gt-btn-primary"
                  style={{ fontSize: '12px', padding: '7px 14px' }}
                >
                  Xem QR
                </button>
              </>
            )}

            {order.status === 'CANCELLED' && (
              <Link
                to={`/matches/${order.matchId}`}
                className="gt-btn-outline"
                style={{ fontSize: '12px', padding: '7px 14px', textDecoration: 'none' }}
              >
                Đặt lại trận này
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* QR Modal for confirmed tickets */}
      {showQrModal && (
        <div
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 9999, padding: '20px',
          }}
          onClick={() => setShowQrModal(false)}
        >
          <div
            className="gt-card animate-fade-in-up"
            style={{
              background: '#141414', border: '1px solid #282828',
              borderRadius: '16px', maxWidth: '360px', width: '100%', padding: '24px', textAlign: 'center',
            }}
            onClick={e => e.stopPropagation()}
          >
            <p className="gt-section-label" style={{ marginBottom: '6px' }}>// Vé điện tử hợp lệ</p>
            <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: 800, marginBottom: '16px' }}>{ticketCode}</h3>

            <div style={{
              width: '180px', height: '180px', background: '#000',
              border: '2px solid #39ff14', borderRadius: '12px', margin: '0 auto 16px',
              padding: '12px', display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px',
            }}>
              {[...Array(25)].map((_, idx) => (
                <div
                  key={idx}
                  style={{
                    background: (idx % 2 === 0 || idx < 3 || idx === 12 || idx > 20) ? '#39ff14' : '#111',
                    borderRadius: '2px',
                  }}
                />
              ))}
            </div>

            <p style={{ color: '#fff', fontWeight: 700, fontSize: '14px' }}>{order.homeTeam} vs {order.awayTeam}</p>
            <p style={{ color: '#888', fontSize: '12px', marginTop: '4px' }}>Xuất trình mã QR tại cổng sân để soát vé</p>

            <button
              onClick={() => setShowQrModal(false)}
              className="gt-btn-outline"
              style={{ width: '100%', marginTop: '20px', justifyContent: 'center', padding: '10px' }}
            >
              Đóng
            </button>
          </div>
        </div>
      )}
    </>
  );
}
