import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getMatchById } from '../../api/matchApi';
import { getSeatsByMatch } from '../../api/seatApi';
import { createOrder } from '../../api/orderApi';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import LoadingSpinner from '../../components/LoadingSpinner';
import { formatCurrency } from '../../utils/formatCurrency';

/* ── Helpers ─────────────────────────────────────── */
const TEAM_COLORS = [
  ['#c0392b','#7f0000'], ['#1565c0','#003c8f'], ['#2e7d32','#005005'],
  ['#f57f17','#7e4700'], ['#6a1b9a','#38006b'], ['#00838f','#005662'],
];
function getTeamColor(name = '') {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return TEAM_COLORS[Math.abs(h) % TEAM_COLORS.length];
}
function TeamAvatar({ name, size = 48 }) {
  const [c1, c2] = getTeamColor(name);
  const initials = name ? name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : 'GH';
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: `linear-gradient(135deg, ${c1}, ${c2})`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.34, fontWeight: 900, color: '#fff', flexShrink: 0,
    }}>{initials}</div>
  );
}
function formatMatchDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
}
function formatMatchTime(d) {
  if (!d) return '';
  return new Date(d).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

/* ── Real Zone definitions matching backend SeatClass (VIP, STANDARD) ─── */
const ZONE_DEFS = [
  { key: 'VIP', label: 'Khán Đài VIP', color: '#f5b700', desc: 'Ghế hạng sang, tầm nhìn trung tâm khán đài' },
  { key: 'STANDARD', label: 'Khán Đài Tiêu Chuẩn', color: '#39ff14', desc: 'Không khí sôi động, tầm nhìn bao quát toàn sân' },
];

export default function MatchDetailPage() {
  const { id } = useParams();
  const { isAuthenticated } = useAuth();
  const { addToCart } = useCart();
  const navigate = useNavigate();

  const [match, setMatch] = useState(null);
  const [seats, setSeats] = useState([]);
  const [selectedSeatIds, setSelectedSeatIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [activeZone, setActiveZone] = useState('VIP');

  useEffect(() => {
    let isMounted = true;
    Promise.all([getMatchById(id), getSeatsByMatch(id)])
      .then(([matchData, seatsData]) => {
        if (!isMounted) return;
        setMatch(matchData);
        setSeats(seatsData);
        if (seatsData.length > 0) {
          const firstClass = seatsData[0].seatClass;
          setActiveZone(firstClass === 'VIP' ? 'VIP' : 'STANDARD');
        }
      })
      .catch(() => toast.error('Không thể tải thông tin trận đấu'))
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => { isMounted = false; };
  }, [id]);

  function handleSeatToggle(seatId) {
    setSelectedSeatIds(prev =>
      prev.includes(seatId) ? prev.filter(s => s !== seatId) : [...prev, seatId]
    );
  }

  function handleAddToCart() {
    if (selectedSeatIds.length === 0) {
      toast.error('Vui lòng chọn ít nhất 1 ghế trên sơ đồ trước khi thêm vào giỏ');
      return;
    }
    const chosenSeats = seats.filter(s => selectedSeatIds.includes(s.id));
    addToCart({
      match,
      seats: chosenSeats,
      qty: chosenSeats.length,
      open: true,
    });
    toast.success(`Đã thêm ${chosenSeats.length} vé vào giỏ hàng!`);
  }

  // Direct checkout flow (Lựa chọn 1)
  async function handleBook() {
    if (!isAuthenticated) {
      toast('Vui lòng đăng nhập để tiến hành đặt vé', { icon: '🔐' });
      navigate('/login');
      return;
    }
    if (selectedSeatIds.length === 0) {
      toast.error('Vui lòng chọn ít nhất 1 ghế trên sơ đồ');
      return;
    }
    setBooking(true);
    try {
      const order = await createOrder({ matchId: Number(id), seatIds: selectedSeatIds });
      toast.success('🎉 Khởi tạo đơn hàng thành công! Đang chuyển đến trang thanh toán...');
      navigate(`/orders/${order.id}`);
    } catch (err) {
      const msg = err.response?.data?.message || 'Đặt vé thất bại, vui lòng thử lại.';
      toast.error(msg);
      // Reload seats to refresh lock status
      getSeatsByMatch(id).then(setSeats).catch(console.error);
    } finally {
      setBooking(false);
    }
  }

  if (loading) return <LoadingSpinner message="Đang tải thông tin trận đấu..." />;
  if (!match) return (
    <div style={{ textAlign: 'center', padding: '80px 20px', color: '#888' }}>
      <div style={{ fontSize: '48px', marginBottom: '12px' }}>🏟</div>
      <p style={{ marginBottom: '12px' }}>Không tìm thấy trận đấu.</p>
      <Link to="/" style={{ color: '#39ff14', fontSize: '14px' }}>← Quay về trang chủ</Link>
    </div>
  );

  const isUpcoming = match.status === 'UPCOMING';
  const selectedSeats = seats.filter(s => selectedSeatIds.includes(s.id));
  const totalPrice = selectedSeats.reduce((sum, s) => sum + Number(s.price), 0);
  const availableSeats = seats.filter(s => s.status === 'AVAILABLE').length;
  const soldPct = seats.length > 0 ? Math.round((1 - availableSeats / seats.length) * 100) : 0;

  // Group seats by backend SeatClass
  const seatsByClass = {
    VIP: seats.filter(s => s.seatClass === 'VIP'),
    STANDARD: seats.filter(s => s.seatClass === 'STANDARD'),
  };

  const zoneSeats = seatsByClass[activeZone] || seats;

  // Group rows for active zone
  const rows = {};
  zoneSeats.forEach(seat => {
    const rowKey = seat.seatCode.replace(/\d+$/, '') || 'A';
    if (!rows[rowKey]) rows[rowKey] = [];
    rows[rowKey].push(seat);
  });

  const activeZoneDef = ZONE_DEFS.find(z => z.key === activeZone) || ZONE_DEFS[0];
  const activeZoneSeats = seatsByClass[activeZone] || [];
  const activeZonePrice = activeZoneSeats.length > 0 ? activeZoneSeats[0].price : match.ticketPrice;

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '40px' }}>
      <div className="gt-container">
        {/* Back */}
        <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#888', fontSize: '13px', padding: '20px 0', textDecoration: 'none', transition: 'color 0.2s' }}
          onMouseEnter={e => e.currentTarget.style.color = '#fff'}
          onMouseLeave={e => e.currentTarget.style.color = '#888'}>
          ← Quay lại lịch đấu
        </Link>

        {/* Match Header Card */}
        <div className="gt-card-flat" style={{ padding: '20px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <p style={{ fontSize: '11px', fontWeight: 700, color: '#39ff14', marginBottom: '4px' }}>
                V.LEAGUE 1 · {match.status}
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '13px', color: '#888' }}>{formatMatchDate(match.matchDate)}</p>
              <p style={{ fontSize: '13px', color: '#888' }}>{match.venue}</p>
            </div>
          </div>

          {/* Teams */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <TeamAvatar name={match.homeTeam} size={52} />
              <div>
                <p style={{ fontWeight: 800, fontSize: '18px', color: '#fff' }}>{match.homeTeam}</p>
                <p style={{ color: '#666', fontSize: '11px' }}>CHỦ NHÀ</p>
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '22px', fontWeight: 900, color: '#fff' }}>{formatMatchTime(match.matchDate)}</p>
              <p style={{ fontSize: '11px', color: '#555', marginTop: '2px' }}>Trực tiếp</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexDirection: 'row-reverse' }}>
              <TeamAvatar name={match.awayTeam} size={52} />
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontWeight: 800, fontSize: '18px', color: '#fff' }}>{match.awayTeam}</p>
                <p style={{ color: '#666', fontSize: '11px' }}>ĐỘI KHÁCH</p>
              </div>
            </div>
          </div>

          {/* Sold progress */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="gt-progress-bar" style={{ flex: 1 }}>
              <div className={`gt-progress-fill ${soldPct > 90 ? 'danger' : soldPct > 70 ? 'warn' : ''}`}
                style={{ width: `${soldPct}%` }} />
            </div>
            <span style={{ fontSize: '12px', color: '#666', flexShrink: 0 }}>
              {availableSeats} ghế còn trống / {match.totalSeats} tổng ghế ({soldPct}% đã giữ/bán)
            </span>
          </div>
        </div>

        {/* Zone Selector (VIP & STANDARD) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '20px' }}>
          {ZONE_DEFS.map(zone => {
            const isActive = activeZone === zone.key;
            const zoneList = seatsByClass[zone.key] || [];
            const zonePrice = zoneList.length > 0 ? zoneList[0].price : match.ticketPrice;
            const availInZone = zoneList.filter(s => s.status === 'AVAILABLE').length;

            return (
              <button
                key={zone.key}
                type="button"
                onClick={() => setActiveZone(zone.key)}
                className="gt-zone-card"
                style={{
                  borderColor: isActive ? zone.color : '#2a2a2a',
                  background: isActive ? `${zone.color}10` : '#141414',
                  padding: '16px',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <p style={{ fontWeight: 700, fontSize: '14px', color: isActive ? zone.color : '#fff' }}>
                    {zone.label}
                  </p>
                  <span style={{ fontSize: '11px', color: availInZone > 0 ? '#39ff14' : '#e53935', fontWeight: 600 }}>
                    {availInZone} ghế trống
                  </span>
                </div>
                <p style={{ fontWeight: 800, fontSize: '16px', color: isActive ? '#fff' : '#aaa' }}>
                  {formatCurrency(zonePrice)}
                </p>
                <p style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>{zone.desc}</p>
              </button>
            );
          })}
        </div>

        {/* Seat Map */}
        <div className="gt-card-flat" style={{ padding: '20px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <p style={{ fontWeight: 700, color: '#fff', fontSize: '14px' }}>
              SƠ ĐỒ GHẾ — {activeZoneDef.label.toUpperCase()} ({formatCurrency(activeZonePrice)}/vé)
            </p>
            <p style={{ fontSize: '13px', color: '#39ff14', fontWeight: 700 }}>
              {selectedSeatIds.length} ghế đã chọn
            </p>
          </div>

          {/* Pitch */}
          <div className="gt-pitch" style={{ height: '52px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px', maxWidth: '340px', margin: '0 auto 20px' }}>
            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: 700, letterSpacing: '0.12em', position: 'relative', zIndex: 1 }}>
              SÂN CỎ (VIEW HƯỚNG SÂN)
            </span>
          </div>

          {/* Seat Grid */}
          {seats.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#555', padding: '32px 0' }}>Chưa có cấu hình ghế cho trận này.</p>
          ) : (
            <div style={{ overflowX: 'auto', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: 'max-content', margin: '0 auto', width: 'fit-content' }}>
                {Object.entries(rows).map(([rowKey, rowSeats]) => (
                  <div key={rowKey} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '48px', fontSize: '11px', color: '#888', fontWeight: 700, textAlign: 'right', flexShrink: 0 }}>
                      {rowKey}
                    </span>
                    <div style={{ display: 'flex', gap: '5px' }}>
                      {rowSeats.map(seat => {
                        const isSelected = selectedSeatIds.includes(seat.id);
                        const isAvail = seat.status === 'AVAILABLE';
                        const isSold = seat.status === 'SOLD';
                        const isReserved = seat.status === 'RESERVED';
                        let cls = 'gt-seat';
                        if (isSelected) cls += ' selected';
                        else if (isAvail) cls += ' available';
                        else if (isSold) cls += ' sold';
                        else if (isReserved) cls += ' reserved';

                        return (
                          <button
                            key={seat.id}
                            type="button"
                            className={cls}
                            title={`${seat.seatCode} · ${formatCurrency(seat.price)} (${seat.status})`}
                            disabled={!isAvail || !isUpcoming}
                            onClick={() => isAvail && handleSeatToggle(seat.id)}
                          >
                            {seat.seatCode.replace(rowKey, '')}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Legend */}
          <div style={{ display: 'flex', gap: '20px', marginTop: '20px', justifyContent: 'center', flexWrap: 'wrap' }}>
            {[
              { cls: 'gt-seat available', label: 'Ghế trống' },
              { cls: 'gt-seat selected', label: 'Đang chọn' },
              { cls: 'gt-seat reserved', label: 'Đang giữ chỗ' },
              { cls: 'gt-seat sold', label: 'Đã bán' },
            ].map(l => (
              <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div className={l.cls} style={{ cursor: 'default', transform: 'none', pointerEvents: 'none' }} />
                <span style={{ fontSize: '11px', color: '#888' }}>{l.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Checkout Panel */}
        <div className="gt-card-flat" style={{ padding: '20px' }}>
          <p style={{ fontWeight: 700, fontSize: '14px', color: '#fff', marginBottom: '16px' }}>
            DANH SÁCH GHẾ ĐÃ CHỌN ({selectedSeatIds.length})
          </p>

          <div style={{ borderTop: '1px solid #1e1e1e', paddingTop: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#888', marginBottom: '8px' }}>
              <span>Ghế đã chọn:</span>
              <span style={{ color: '#fff', fontWeight: 600 }}>
                {selectedSeats.length > 0 ? selectedSeats.map(s => s.seatCode).join(', ') : 'Chưa chọn ghế nào'}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '16px', marginBottom: '20px' }}>
              <span style={{ color: '#fff' }}>TỔNG TIỀN DỰ KIẾN</span>
              <span style={{ color: '#39ff14', fontSize: '20px', fontWeight: 900 }}>
                {formatCurrency(totalPrice)}
              </span>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={!isUpcoming || selectedSeatIds.length === 0}
                className="gt-btn-outline"
                style={{ flex: 1, justifyContent: 'center', fontSize: '13px', padding: '13px', borderRadius: '8px' }}
              >
                🛒 Thêm Vào Giỏ
              </button>

              <button
                id="btn-book-ticket"
                type="button"
                disabled={booking || !isUpcoming || selectedSeatIds.length === 0}
                onClick={handleBook}
                className="gt-btn-primary"
                style={{
                  flex: 1.5,
                  justifyContent: 'center',
                  fontSize: '14px',
                  padding: '13px',
                  borderRadius: '8px',
                  opacity: selectedSeatIds.length === 0 ? 0.5 : 1,
                }}
              >
                {booking ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '14px', height: '14px', border: '2px solid rgba(0,0,0,0.3)', borderTopColor: '#000', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
                    Đang khóa ghế...
                  </span>
                ) : (
                  `TIẾN HÀNH ĐẶT VÉ (${selectedSeatIds.length} GHẾ) →`
                )}
              </button>
            </div>
            <p style={{ textAlign: 'center', fontSize: '11px', color: '#555', marginTop: '10px' }}>
              🔒 Cơ chế khoá ghế nguyên tử (Atomic locking) · Tránh đặt trùng vé 100%
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
