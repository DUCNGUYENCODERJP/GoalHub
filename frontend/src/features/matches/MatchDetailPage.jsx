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
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
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

/* ── Zone definitions for seat map display ─── */
const ZONE_DEFS = [
  { key: 'VIP',    label: 'VIP',       color: '#f5b700', desc: 'Ghế hạng sang, view tốt nhất, phục vụ đồ uống' },
  { key: 'A',      label: 'Khán Đài A', color: '#39ff14', desc: 'Phía tây khán đài, mái che hoàn toàn' },
  { key: 'B',      label: 'Khán Đài B', color: '#5b9cf6', desc: 'Phía đông, view từ trên cao' },
  { key: 'C',      label: 'Khán Đài C', color: '#f97316', desc: 'Cổ động viên nhiệt tình, không khí sôi động' },
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
  const [activeZone, setActiveZone] = useState(null);
  const [quantity, setQuantity] = useState(1);

  function handleAddToCart() {
    if (selectedSeatIds.length === 0 && quantity === 0) {
      toast.error('Vui lòng chọn ít nhất 1 ghế hoặc số lượng');
      return;
    }
    const chosenSeats = seats.filter(s => selectedSeatIds.includes(s.id));
    addToCart({
      match,
      seats: chosenSeats,
      qty: quantity,
      open: true,
    });
    toast.success('Đã thêm vé vào giỏ hàng!');
  }

  useEffect(() => {
    setLoading(true);
    Promise.all([getMatchById(id), getSeatsByMatch(id)])
      .then(([matchData, seatsData]) => {
        setMatch(matchData);
        setSeats(seatsData);
        // Set default zone to first available
        if (seatsData.length > 0) {
          const firstClass = seatsData[0].seatClass;
          setActiveZone(firstClass === 'VIP' ? 'VIP' : 'A');
        }
      })
      .catch(() => toast.error('Không thể tải thông tin trận đấu'))
      .finally(() => setLoading(false));
  }, [id]);

  function handleSeatToggle(seatId) {
    setSelectedSeatIds(prev =>
      prev.includes(seatId) ? prev.filter(s => s !== seatId) : [...prev, seatId]
    );
  }

  async function handleBook() {
    if (!isAuthenticated) { navigate('/login'); return; }
    if (selectedSeatIds.length === 0 && quantity === 0) {
      toast.error('Vui lòng chọn ít nhất 1 ghế hoặc nhập số lượng');
      return;
    }
    setBooking(true);
    try {
      const order = await createOrder({ matchId: Number(id), seatIds: selectedSeatIds });
      toast.success('🎉 Đặt vé thành công!');
      navigate(`/orders/${order.id}`);
    } catch (err) {
      const msg = err.response?.data?.message || 'Đặt vé thất bại, vui lòng thử lại.';
      toast.error(msg);
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

  // Group seats by class
  const seatsByClass = {};
  seats.forEach(s => {
    const cls = s.seatClass || 'STANDARD';
    if (!seatsByClass[cls]) seatsByClass[cls] = [];
    seatsByClass[cls].push(s);
  });

  // Current zone seats
  const zoneSeats = activeZone
    ? (seatsByClass[activeZone] || seatsByClass['STANDARD'] || seats).slice(0, 112)
    : seats;

  // Group by row
  const rows = {};
  zoneSeats.forEach(seat => {
    const rowKey = seat.seatCode.replace(/\d+$/, '') || 'A';
    if (!rows[rowKey]) rows[rowKey] = [];
    rows[rowKey].push(seat);
  });

  // Zone price map
  const zonePrices = {};
  ZONE_DEFS.forEach(z => {
    const zoneSeatList = seatsByClass[z.key] || seatsByClass['STANDARD'] || [];
    if (zoneSeatList.length > 0) zonePrices[z.key] = zoneSeatList[0].price;
    else zonePrices[z.key] = match.ticketPrice;
  });

  // Determine active zone color
  const activeZoneDef = ZONE_DEFS.find(z => z.key === activeZone) || ZONE_DEFS[0];

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '40px' }}>
      <div className="gt-container">
        {/* Back */}
        <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#888', fontSize: '13px', padding: '20px 0', textDecoration: 'none', transition: 'color 0.2s' }}
          onMouseEnter={e => e.currentTarget.style.color = '#fff'}
          onMouseLeave={e => e.currentTarget.style.color = '#888'}>
          ← Quay lại
        </Link>

        {/* Match Header Card */}
        <div className="gt-card-flat" style={{ padding: '20px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
            {/* League / Round */}
            <div>
              <p style={{ fontSize: '11px', fontWeight: 700, color: '#39ff14', marginBottom: '4px' }}>
                {match.league || 'V.LEAGUE 1'} · VÒNG 22
              </p>
            </div>
            {/* Date */}
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '13px', color: '#888' }}>{formatMatchDate(match.matchDate)}</p>
              <p style={{ fontSize: '13px', color: '#888' }}>Sân {match.venue}</p>
            </div>
          </div>

          {/* Teams */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <TeamAvatar name={match.homeTeam} size={52} />
              <div>
                <p style={{ fontWeight: 800, fontSize: '18px', color: '#fff' }}>{match.homeTeam}</p>
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '22px', fontWeight: 900, color: '#fff' }}>{formatMatchTime(match.matchDate)}</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexDirection: 'row-reverse' }}>
              <TeamAvatar name={match.awayTeam} size={52} />
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontWeight: 800, fontSize: '18px', color: '#fff' }}>{match.awayTeam}</p>
              </div>
            </div>
          </div>

          {/* Sold progress */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="gt-progress-bar" style={{ flex: 1 }}>
              <div className={`gt-progress-fill ${soldPct > 90 ? 'danger' : soldPct > 70 ? 'warn' : ''}`}
                style={{ width: `${soldPct}%` }} />
            </div>
            <span style={{ fontSize: '12px', color: '#666', flexShrink: 0 }}>{soldPct}% đã bán</span>
          </div>
        </div>

        {/* Zone selector */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '20px' }}>
          {ZONE_DEFS.map(zone => {
            const isActive = activeZone === zone.key;
            const zonePrice = zonePrices[zone.key];
            return (
              <button
                key={zone.key}
                onClick={() => setActiveZone(zone.key)}
                className="gt-zone-card"
                style={{ borderColor: isActive ? zone.color : '#2a2a2a', color: zone.color }}
              >
                <div style={{ width: '20px', height: '20px', background: zone.color, borderRadius: '4px', margin: '0 auto 8px', opacity: 0.9 }} />
                <p style={{ fontWeight: 700, fontSize: '12px', color: isActive ? zone.color : '#888', marginBottom: '4px' }}>{zone.label}</p>
                <p style={{ fontWeight: 800, fontSize: '14px', color: isActive ? '#fff' : '#666' }}>
                  {formatCurrency(zonePrice)} <span style={{ fontWeight: 400, color: '#555', fontSize: '11px' }}>đ</span>
                </p>
                <p style={{ fontSize: '10px', color: '#555', marginTop: '4px' }}>{zone.desc}</p>
              </button>
            );
          })}
        </div>

        {/* Seat Map */}
        <div className="gt-card-flat" style={{ padding: '20px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <p style={{ fontWeight: 700, color: '#fff', fontSize: '14px' }}>{activeZoneDef.label}</p>
            <p style={{ fontSize: '13px', color: '#39ff14' }}>
              {selectedSeatIds.length} ghế đã chọn
            </p>
          </div>

          {/* Pitch */}
          <div className="gt-pitch" style={{ height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', maxWidth: '320px', margin: '0 auto 16px' }}>
            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: 700, letterSpacing: '0.1em', position: 'relative', zIndex: 1 }}>SÂN CỎ</span>
          </div>

          {/* Seat grid */}
          {seats.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#555', padding: '32px 0' }}>Chưa có ghế nào cho trận này.</p>
          ) : (
            <div style={{ overflowX: 'auto', paddingBottom: '8px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: 'max-content' }}>
                {Object.entries(rows).map(([rowKey, rowSeats]) => (
                  <div key={rowKey} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '20px', fontSize: '10px', color: '#555', fontWeight: 700, textAlign: 'right', flexShrink: 0 }}>{rowKey}</span>
                    <div style={{ display: 'flex', gap: '4px' }}>
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
                            className={cls}
                            title={`${seat.seatCode} · ${formatCurrency(seat.price)}`}
                            disabled={!isAvail || !isAuthenticated || !isUpcoming}
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
          <div style={{ display: 'flex', gap: '20px', marginTop: '16px', flexWrap: 'wrap' }}>
            {[
              { cls: 'gt-seat available', label: 'Trống' },
              { cls: 'gt-seat selected', label: 'Đã chọn' },
              { cls: 'gt-seat sold', label: 'Đã đặt' },
            ].map(l => (
              <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div className={l.cls} style={{ cursor: 'default', transform: 'none', pointerEvents: 'none' }} />
                <span style={{ fontSize: '11px', color: '#666' }}>{l.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Cart / Checkout Panel */}
        <div className="gt-card-flat" style={{ padding: '20px' }}>
          <p style={{ fontWeight: 700, fontSize: '14px', color: '#fff', marginBottom: '16px' }}>GIỎ VÉ</p>

          {/* Quantity selector (if no specific seats) */}
          {selectedSeatIds.length === 0 && (
            <div style={{ marginBottom: '16px' }}>
              <p style={{ fontSize: '12px', color: '#888', marginBottom: '10px' }}>Số lượng (nếu không chọn ghế)</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button onClick={() => setQuantity(q => Math.max(1, q - 1))}
                  style={{ width: '36px', height: '36px', borderRadius: '8px', border: '1px solid #2a2a2a', background: '#1a1a1a', color: '#fff', fontSize: '18px', cursor: 'pointer' }}>−</button>
                <span style={{ fontSize: '18px', fontWeight: 700, color: '#fff', minWidth: '32px', textAlign: 'center' }}>{quantity}</span>
                <button onClick={() => setQuantity(q => Math.min(10, q + 1))}
                  style={{ width: '36px', height: '36px', borderRadius: '8px', border: '1px solid #2a2a2a', background: '#1a1a1a', color: '#fff', fontSize: '18px', cursor: 'pointer' }}>+</button>
              </div>
            </div>
          )}

          {/* Summary */}
          <div style={{ borderTop: '1px solid #1e1e1e', paddingTop: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#888', marginBottom: '8px' }}>
              <span>Khu vực</span>
              <span style={{ color: '#fff' }}>{activeZoneDef.label}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#888', marginBottom: '16px' }}>
              <span>Số vé</span>
              <span style={{ color: '#fff' }}>{selectedSeatIds.length || quantity}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '16px', marginBottom: '20px' }}>
              <span style={{ color: '#fff' }}>TỔNG</span>
              <span style={{ color: '#39ff14' }}>
                {selectedSeatIds.length > 0
                  ? formatCurrency(totalPrice)
                  : formatCurrency((zonePrices[activeZone] || match.ticketPrice || 0) * quantity)}
              </span>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={!isUpcoming}
                className="gt-btn-outline"
                style={{ flex: 1, justifyContent: 'center', fontSize: '13px', padding: '13px', borderRadius: '8px' }}
              >
                🛒 Thêm Vào Giỏ
              </button>
              {isAuthenticated ? (
                <Link
                  id="btn-book-ticket"
                  to={`/booking/${id}`}
                  className="gt-btn-primary"
                  style={{ flex: 1.4, justifyContent: 'center', fontSize: '14px', padding: '13px', borderRadius: '8px', textDecoration: 'none', display: 'flex', alignItems: 'center' }}
                >
                  ĐẶT VÉ NGAY →
                </Link>
              ) : (
                <Link to="/login" className="gt-btn-primary" style={{ flex: 1.4, justifyContent: 'center', fontSize: '14px', padding: '13px', borderRadius: '8px', textDecoration: 'none' }}>
                  Đăng nhập để đặt →
                </Link>
              )}
            </div>
            <p style={{ textAlign: 'center', fontSize: '11px', color: '#444', marginTop: '10px' }}>
              🔒 SSL 256-bit · Hoàn tiền 100%
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
