/**
 * BookingPage.jsx – Luồng đặt vé 3 bước theo Figma E-Ticket
 * Step 1 → Chọn khu vực sân (Tribun/Zone map)
 * Step 2 → Nhập thông tin cá nhân
 * Step 3 → Xác nhận + countdown 15 phút + thanh toán
 */
import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getMatchById } from '../../api/matchApi';
import { getSeatsByMatch } from '../../api/seatApi';
import { createOrder } from '../../api/orderApi';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../../components/LoadingSpinner';
import { formatCurrency } from '../../utils/formatCurrency';

/* ── Helpers ─────────────────────────── */
const TEAM_COLORS = [
  ['#c0392b','#7f0000'], ['#1565c0','#003c8f'], ['#2e7d32','#005005'],
  ['#f57f17','#7e4700'], ['#6a1b9a','#38006b'], ['#00838f','#005662'],
];
function getTeamColor(name = '') {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return TEAM_COLORS[Math.abs(h) % TEAM_COLORS.length];
}
function TeamAvatar({ name, size = 52 }) {
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
function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
}
function fmtTime(d) {
  if (!d) return '';
  return new Date(d).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

/* ── Zone / Tribun definitions ─────── */
const ZONES = [
  { key: 'VIP', label: 'Khán Đài VIP',  color: '#f5b700', icon: '⭐' },
  { key: 'A',   label: 'Khán Đài Bắc',  color: '#39ff14', icon: '🟢' },
  { key: 'B',   label: 'Khán Đài Nam',  color: '#5b9cf6', icon: '🔵' },
  { key: 'C',   label: 'Khán Đài Đông', color: '#f97316', icon: '🟠' },
  { key: 'D',   label: 'Khán Đài Tây',  color: '#a855f7', icon: '🟣' },
];
const STEPS = ['Chọn Khu Vực', 'Thông Tin', 'Xác Nhận'];
const HOLD_DURATION = 15 * 60;

/* ── Zone Button ──────────────────── */
function ZoneButton({ zone, selected, onSelect, zonePrice, avail, style = {} }) {
  const isSelected = selected === zone.key;
  const isSoldOut = avail === 0;
  return (
    <button
      onClick={() => !isSoldOut && onSelect(zone.key)}
      disabled={isSoldOut}
      title={isSoldOut ? 'Hết vé' : zone.label}
      style={{
        padding: '10px 8px', borderRadius: '8px',
        border: `2px solid ${isSelected ? zone.color : '#2a2a2a'}`,
        background: isSelected ? `${zone.color}15` : '#141414',
        cursor: isSoldOut ? 'not-allowed' : 'pointer',
        textAlign: 'center', transition: 'all 0.2s',
        opacity: isSoldOut ? 0.4 : 1, ...style,
      }}
    >
      <p style={{ fontSize: '10px', fontWeight: 700, color: isSelected ? zone.color : '#888', marginBottom: '2px' }}>
        {zone.label}
      </p>
      <p style={{ fontSize: '12px', fontWeight: 800, color: isSelected ? '#fff' : '#666' }}>
        {formatCurrency(zonePrice)}
      </p>
      {isSoldOut && <p style={{ fontSize: '9px', color: '#e53935', marginTop: '2px' }}>HẾT VÉ</p>}
    </button>
  );
}

/* ── Main Component ───────────────── */
export default function BookingPage() {
  const { id } = useParams();
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  const [match, setMatch]         = useState(null);
  const [seats, setSeats]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [booking, setBooking]     = useState(false);
  const [step, setStep]           = useState(1);

  // Step 1
  const [selectedZone, setSelectedZone] = useState('A');
  const [quantity, setQuantity]         = useState(1);

  // Step 2
  const [info, setInfo] = useState({
    fullName: user?.fullName || '',
    phone:    user?.phone    || '',
    cccd:     '',
    email:    user?.email    || '',
  });

  // Step 3 timer
  const [timeLeft, setTimeLeft]       = useState(HOLD_DURATION);
  const timerRef                      = useRef(null);
  const holdStartedRef                = useRef(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([getMatchById(id), getSeatsByMatch(id)])
      .then(([m, s]) => { setMatch(m); setSeats(s); })
      .catch(() => toast.error('Không thể tải thông tin trận đấu'))
      .finally(() => setLoading(false));
  }, [id]);

  // Start timer when reaching step 3
  useEffect(() => {
    if (step === 3 && !holdStartedRef.current) {
      holdStartedRef.current = true;
      timerRef.current = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) {
            clearInterval(timerRef.current);
            toast.error('⏰ Hết thời gian giữ chỗ! Vui lòng thử lại.');
            navigate(`/matches/${id}`);
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    }
    return () => { if (step !== 3 && timerRef.current) clearInterval(timerRef.current); };
  }, [step]);

  if (loading) return <LoadingSpinner message="Đang tải thông tin trận đấu..." />;
  if (!match) return (
    <div style={{ textAlign: 'center', padding: '80px 20px', color: '#888' }}>
      <div style={{ fontSize: '48px', marginBottom: '12px' }}>🏟</div>
      <p>Không tìm thấy trận đấu.</p>
      <Link to="/" style={{ color: '#39ff14', fontSize: '14px' }}>← Quay về trang chủ</Link>
    </div>
  );
  if (!isAuthenticated) return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
      <div style={{ fontSize: '56px' }}>🔒</div>
      <p style={{ color: '#888', fontSize: '16px' }}>Bạn cần đăng nhập để đặt vé</p>
      <Link to="/login" className="gt-btn-primary" style={{ textDecoration: 'none', padding: '12px 28px' }}>
        Đăng nhập ngay →
      </Link>
    </div>
  );

  /* ── Zone helpers ── */
  const seatsByClass = {};
  seats.forEach(s => {
    const cls = s.seatClass || 'STANDARD';
    if (!seatsByClass[cls]) seatsByClass[cls] = [];
    seatsByClass[cls].push(s);
  });
  function getZonePrice(key) {
    const list = seatsByClass[key] || seatsByClass['STANDARD'] || [];
    return list.length > 0 ? Number(list[0].price) : Number(match.ticketPrice || 0);
  }
  function getZoneAvail(key) {
    const list = seatsByClass[key] || seatsByClass['STANDARD'] || [];
    return list.filter(s => s.status === 'AVAILABLE').length;
  }

  const currentZone = ZONES.find(z => z.key === selectedZone) || ZONES[1];
  const unitPrice   = getZonePrice(selectedZone);
  const totalPrice  = unitPrice * quantity;
  const availInZone = getZoneAvail(selectedZone);
  const timerMins   = String(Math.floor(timeLeft / 60)).padStart(2, '0');
  const timerSecs   = String(timeLeft % 60).padStart(2, '0');
  const timerUrgent = timeLeft < 120;

  async function handleBook() {
    setBooking(true);
    try {
      const order = await createOrder({ matchId: Number(id), seatIds: [] });
      toast.success('🎉 Đặt vé thành công! Vé đã được gửi qua email.');
      clearInterval(timerRef.current);
      navigate(`/orders/${order.id}`);
    } catch (err) {
      const msg = err.response?.data?.message || 'Đặt vé thất bại, vui lòng thử lại.';
      toast.error(msg);
    } finally {
      setBooking(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '60px' }}>
      <div className="gt-container" style={{ maxWidth: '760px' }}>

        {/* Back link */}
        <Link to={`/matches/${id}`}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#888', fontSize: '13px', padding: '20px 0', textDecoration: 'none', transition: 'color 0.2s' }}
          onMouseEnter={e => e.currentTarget.style.color = '#fff'}
          onMouseLeave={e => e.currentTarget.style.color = '#888'}>
          ← Quay lại chi tiết trận
        </Link>

        {/* Match Header */}
        <div className="gt-card-flat" style={{ padding: '20px', marginBottom: '24px' }}>
          <p style={{ fontSize: '11px', fontWeight: 700, color: '#39ff14', marginBottom: '12px' }}>
            {match.league || 'V.LEAGUE 1'} · {fmtDate(match.matchDate)}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '32px' }}>
            <div style={{ textAlign: 'center' }}>
              <TeamAvatar name={match.homeTeam} size={56} />
              <p style={{ color: '#fff', fontWeight: 700, fontSize: '13px', marginTop: '8px', maxWidth: '90px' }}>{match.homeTeam}</p>
              <p style={{ color: '#666', fontSize: '10px' }}>CHỦ NHÀ</p>
            </div>
            <div style={{ textAlign: 'center', background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '12px', padding: '12px 20px' }}>
              <p style={{ fontSize: '20px', fontWeight: 900, color: '#fff' }}>VS</p>
              <p style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>{fmtTime(match.matchDate)}</p>
              <p style={{ fontSize: '10px', color: '#555', marginTop: '2px' }}>📍 {match.venue}</p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <TeamAvatar name={match.awayTeam} size={56} />
              <p style={{ color: '#fff', fontWeight: 700, fontSize: '13px', marginTop: '8px', maxWidth: '90px' }}>{match.awayTeam}</p>
              <p style={{ color: '#666', fontSize: '10px' }}>KHÁCH</p>
            </div>
          </div>
        </div>

        {/* Step Indicator */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '28px' }}>
          {STEPS.map((s, i) => {
            const num = i + 1;
            const isActive = step === num;
            const isDone   = step > num;
            return (
              <div key={s} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '50%',
                    background: isDone || isActive ? '#39ff14' : '#1a1a1a',
                    border: `2px solid ${isDone || isActive ? '#39ff14' : '#2a2a2a'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '13px', fontWeight: 800,
                    color: isDone || isActive ? '#000' : '#555',
                    transition: 'all 0.3s',
                  }}>
                    {isDone ? '✓' : num}
                  </div>
                  <span style={{ fontSize: '11px', color: isActive ? '#fff' : isDone ? '#39ff14' : '#555', marginTop: '6px', fontWeight: isActive ? 700 : 400, whiteSpace: 'nowrap' }}>
                    {s}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div style={{ flex: 1, height: '2px', background: step > num ? '#39ff14' : '#2a2a2a', transition: 'background 0.4s', margin: '0 8px', marginBottom: '22px' }} />
                )}
              </div>
            );
          })}
        </div>

        {/* ══════ STEP 1 – Chọn Khu Vực ══════ */}
        {step === 1 && (
          <div>
            <p className="gt-section-label">// Bước 1 / 3</p>
            <h2 className="gt-section-title" style={{ marginTop: '6px', marginBottom: '24px' }}>CHỌN KHU VỰC SÂN</h2>

            {/* Stadium map */}
            <div className="gt-card-flat" style={{ padding: '24px', marginBottom: '20px' }}>
              <p style={{ fontSize: '11px', color: '#555', textAlign: 'center', marginBottom: '20px', fontWeight: 700, letterSpacing: '0.08em' }}>
                SƠ ĐỒ SÂN — {(match.venue || 'SÂN VẬN ĐỘNG').toUpperCase()}
              </p>

              {/* Bắc */}
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
                <ZoneButton zone={ZONES[1]} selected={selectedZone} onSelect={setSelectedZone}
                  zonePrice={getZonePrice('A')} avail={getZoneAvail('A') || 1000} style={{ width: '64%' }} />
              </div>

              {/* Tây + Sân + Đông */}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'stretch', marginBottom: '8px' }}>
                <ZoneButton zone={ZONES[4]} selected={selectedZone} onSelect={setSelectedZone}
                  zonePrice={getZonePrice('D')} avail={getZoneAvail('D') || 800} style={{ flex: 1, minHeight: '100px' }} />
                {/* Field */}
                <div style={{
                  flex: 2.5, minHeight: '100px', borderRadius: '10px',
                  background: 'linear-gradient(180deg, #154015 0%, #226622 50%, #154015 100%)',
                  border: '2px solid #2d7a2d', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  position: 'relative', overflow: 'hidden',
                }}>
                  {/* Field lines */}
                  <div style={{ position: 'absolute', inset: '10%', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '3px' }} />
                  <div style={{ position: 'absolute', left: '50%', top: '10%', bottom: '10%', width: '1px', background: 'rgba(255,255,255,0.12)' }} />
                  <div style={{ position: 'absolute', width: '24%', height: '40%', border: '1px solid rgba(255,255,255,0.15)', left: '10%', top: '30%' }} />
                  <div style={{ position: 'absolute', width: '24%', height: '40%', border: '1px solid rgba(255,255,255,0.15)', right: '10%', top: '30%' }} />
                  <div style={{ width: '28%', height: '48%', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '50%', zIndex: 1 }} />
                  <span style={{ position: 'absolute', color: 'rgba(255,255,255,0.3)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em' }}>SÂN CỎ</span>
                </div>
                <ZoneButton zone={ZONES[3]} selected={selectedZone} onSelect={setSelectedZone}
                  zonePrice={getZonePrice('C')} avail={getZoneAvail('C') || 800} style={{ flex: 1, minHeight: '100px' }} />
              </div>

              {/* Nam */}
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
                <ZoneButton zone={ZONES[2]} selected={selectedZone} onSelect={setSelectedZone}
                  zonePrice={getZonePrice('B')} avail={getZoneAvail('B') || 1000} style={{ width: '64%' }} />
              </div>

              {/* VIP */}
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <ZoneButton zone={ZONES[0]} selected={selectedZone} onSelect={setSelectedZone}
                  zonePrice={getZonePrice('VIP')} avail={getZoneAvail('VIP') || 200} style={{ width: '38%' }} />
              </div>
            </div>

            {/* Selected zone detail + quantity */}
            <div className="gt-card-flat" style={{ padding: '20px', marginBottom: '20px', border: `1px solid ${currentZone.color}40` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                <div style={{ width: '40px', height: '40px', background: `${currentZone.color}15`, border: `1px solid ${currentZone.color}50`, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
                  {currentZone.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 700, color: '#fff', fontSize: '15px' }}>{currentZone.label}</p>
                  <p style={{ fontSize: '12px', color: currentZone.color, fontWeight: 600 }}>{formatCurrency(unitPrice)} / vé</p>
                </div>
                <span style={{ fontSize: '11px', color: availInZone > 200 ? '#39ff14' : availInZone > 0 ? '#ff9800' : '#e53935', fontWeight: 700 }}>
                  {availInZone > 0 ? `${availInZone > 0 ? '~' : ''}${Math.max(availInZone, 500)} ghế trống` : 'HẾT VÉ'}
                </span>
              </div>

              <div>
                <p style={{ fontSize: '12px', color: '#666', marginBottom: '12px', fontWeight: 700, letterSpacing: '0.04em' }}>SỐ LƯỢNG VÉ (tối đa 8)</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <button onClick={() => setQuantity(q => Math.max(1, q - 1))}
                    style={{ width: '42px', height: '42px', borderRadius: '10px', border: '1px solid #2a2a2a', background: '#1a1a1a', color: '#fff', fontSize: '22px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    −
                  </button>
                  <span style={{ fontSize: '26px', fontWeight: 900, color: '#fff', minWidth: '40px', textAlign: 'center' }}>{quantity}</span>
                  <button onClick={() => setQuantity(q => Math.min(8, q + 1))}
                    style={{ width: '42px', height: '42px', borderRadius: '10px', border: '1px solid #2a2a2a', background: '#1a1a1a', color: '#fff', fontSize: '22px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    +
                  </button>
                  <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                    <p style={{ fontSize: '11px', color: '#666' }}>Tổng cộng</p>
                    <p style={{ fontSize: '24px', fontWeight: 900, color: '#39ff14' }}>{formatCurrency(totalPrice)}</p>
                  </div>
                </div>
              </div>
            </div>

            <button onClick={() => setStep(2)} className="gt-btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: '15px', borderRadius: '10px' }}>
              TIẾP THEO → Nhập Thông Tin
            </button>
          </div>
        )}

        {/* ══════ STEP 2 – Thông Tin Cá Nhân ══════ */}
        {step === 2 && (
          <div>
            <p className="gt-section-label">// Bước 2 / 3</p>
            <h2 className="gt-section-title" style={{ marginTop: '6px', marginBottom: '24px' }}>THÔNG TIN CÁ NHÂN</h2>

            <div className="gt-card-flat" style={{ padding: '24px', marginBottom: '20px' }}>
              <p style={{ fontSize: '12px', color: '#666', marginBottom: '20px' }}>
                📋 Thông tin này sẽ được in trên vé điện tử và dùng để xác thực khi vào cổng
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {[
                  { key: 'fullName', label: 'Họ và tên',        placeholder: 'Nguyễn Văn A',    type: 'text' },
                  { key: 'email',    label: 'Email',             placeholder: 'email@gmail.com', type: 'email' },
                  { key: 'phone',    label: 'Số điện thoại',    placeholder: '0912 345 678',     type: 'tel' },
                  { key: 'cccd',     label: 'CCCD / Hộ chiếu',  placeholder: '012345678901',     type: 'text' },
                ].map(f => (
                  <div key={f.key}>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#888', display: 'block', marginBottom: '8px' }}>
                      {f.label} <span style={{ color: '#e53935' }}>*</span>
                    </label>
                    <input className="gt-input" type={f.type} placeholder={f.placeholder}
                      value={info[f.key]} onChange={e => setInfo({ ...info, [f.key]: e.target.value })} />
                  </div>
                ))}
              </div>
            </div>

            {/* Mini order summary */}
            <div className="gt-card-flat" style={{ padding: '16px', marginBottom: '20px', background: '#0d0d0d' }}>
              <p style={{ fontSize: '11px', color: '#666', marginBottom: '10px', fontWeight: 700 }}>TÓM TẮT ĐƠN</p>
              {[
                ['Khu vực', currentZone.label],
                ['Số vé', `${quantity} vé`],
                ['Đơn giá', formatCurrency(unitPrice)],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#888', marginBottom: '4px' }}>
                  <span>{k}</span><span style={{ color: '#ccc' }}>{v}</span>
                </div>
              ))}
              <div style={{ height: '1px', background: '#2a2a2a', margin: '10px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '16px' }}>
                <span style={{ color: '#fff' }}>TỔNG CỘNG</span>
                <span style={{ color: '#39ff14' }}>{formatCurrency(totalPrice)}</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setStep(1)} className="gt-btn-outline"
                style={{ flex: 1, justifyContent: 'center', padding: '13px', borderRadius: '10px' }}>
                ← Quay lại
              </button>
              <button onClick={() => {
                if (!info.fullName.trim() || !info.phone.trim() || !info.email.trim() || !info.cccd.trim()) {
                  toast.error('Vui lòng điền đầy đủ thông tin');
                  return;
                }
                setStep(3);
              }} className="gt-btn-primary"
                style={{ flex: 2, justifyContent: 'center', padding: '13px', fontSize: '14px', borderRadius: '10px' }}>
                XÁC NHẬN THÔNG TIN →
              </button>
            </div>
          </div>
        )}

        {/* ══════ STEP 3 – Xác Nhận & Thanh Toán ══════ */}
        {step === 3 && (
          <div>
            <p className="gt-section-label">// Bước 3 / 3</p>
            <h2 className="gt-section-title" style={{ marginTop: '6px', marginBottom: '24px' }}>XÁC NHẬN & THANH TOÁN</h2>

            {/* Countdown timer */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '14px',
              padding: '14px 18px', marginBottom: '20px', borderRadius: '12px',
              background: timerUrgent ? 'rgba(229,57,53,0.1)' : 'rgba(57,255,20,0.06)',
              border: `1px solid ${timerUrgent ? 'rgba(229,57,53,0.4)' : 'rgba(57,255,20,0.2)'}`,
              animation: timerUrgent ? 'pulse 1s ease-in-out infinite' : 'none',
            }}>
              <span style={{ fontSize: '22px' }}>{timerUrgent ? '⚠️' : '⏱'}</span>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '11px', color: timerUrgent ? '#e53935' : '#39ff14', fontWeight: 700 }}>
                  {timerUrgent ? 'SẮP HẾT THỜI GIAN GIỮ CHỖ!' : 'Thời gian giữ chỗ còn lại'}
                </p>
                <p style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>
                  Hoàn tất thanh toán trước khi hết thời gian
                </p>
              </div>
              <span style={{ fontFamily: 'monospace', fontSize: '30px', fontWeight: 900, color: timerUrgent ? '#e53935' : '#fff' }}>
                {timerMins}:{timerSecs}
              </span>
            </div>

            {/* E-Ticket Preview */}
            <div style={{ borderRadius: '16px', overflow: 'hidden', border: '1px solid #2a2a2a', marginBottom: '20px', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
              {/* Ticket top stripe */}
              <div style={{ background: '#39ff14', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontFamily: "'Barlow', sans-serif", fontWeight: 900, fontSize: '15px', color: '#000' }}>⚽ GOALTICKET.VN</span>
                <span style={{ fontSize: '11px', fontWeight: 800, background: '#000', color: '#39ff14', padding: '3px 10px', borderRadius: '20px' }}>E-TICKET</span>
              </div>

              <div style={{ background: 'linear-gradient(135deg, #141414, #1a1a1a)', padding: '20px' }}>
                {/* Teams */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                  <div style={{ textAlign: 'center', flex: 1 }}>
                    <TeamAvatar name={match.homeTeam} size={44} />
                    <p style={{ color: '#ccc', fontSize: '11px', marginTop: '6px', fontWeight: 600 }}>{match.homeTeam}</p>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: '20px', fontWeight: 900, color: '#fff' }}>VS</p>
                    <p style={{ fontSize: '11px', color: '#555' }}>{fmtTime(match.matchDate)}</p>
                  </div>
                  <div style={{ textAlign: 'center', flex: 1 }}>
                    <TeamAvatar name={match.awayTeam} size={44} />
                    <p style={{ color: '#ccc', fontSize: '11px', marginTop: '6px', fontWeight: 600 }}>{match.awayTeam}</p>
                  </div>
                </div>

                {/* Details grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
                  {[
                    ['Ngày thi đấu', fmtDate(match.matchDate)],
                    ['Địa điểm', match.venue],
                    ['Khu vực', currentZone.label],
                    ['Số vé', `${quantity} vé`],
                    ['Người đặt', info.fullName],
                    ['CCCD', info.cccd],
                  ].map(([k, v]) => (
                    <div key={k} style={{ background: '#0d0d0d', borderRadius: '8px', padding: '10px' }}>
                      <p style={{ fontSize: '10px', color: '#555', marginBottom: '3px' }}>{k}</p>
                      <p style={{ fontSize: '12px', color: '#ccc', fontWeight: 600 }}>{v}</p>
                    </div>
                  ))}
                </div>

                {/* Tear line */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: '16px -20px' }}>
                  <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#0a0a0a', flexShrink: 0 }} />
                  <div style={{ flex: 1, borderTop: '2px dashed #2a2a2a' }} />
                  <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#0a0a0a', flexShrink: 0 }} />
                </div>

                {/* Total + QR */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '16px' }}>
                  <div>
                    <p style={{ fontSize: '11px', color: '#555', marginBottom: '4px' }}>TỔNG THANH TOÁN</p>
                    <p style={{ fontSize: '28px', fontWeight: 900, color: '#39ff14' }}>{formatCurrency(totalPrice)}</p>
                  </div>
                  <div style={{ width: '72px', height: '72px', background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px' }}>
                    📱
                  </div>
                </div>
              </div>
            </div>

            {/* Payment methods */}
            <div className="gt-card-flat" style={{ padding: '16px', marginBottom: '20px' }}>
              <p style={{ fontSize: '11px', color: '#666', marginBottom: '12px', fontWeight: 700 }}>CHỌN PHƯƠNG THỨC THANH TOÁN</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                {[
                  { name: 'VNPay',   color: '#e53935', icon: '💳', active: true },
                  { name: 'MoMo',    color: '#a855f7', icon: '💜', active: false },
                  { name: 'ZaloPay', color: '#0088ff', icon: '🔵', active: false },
                ].map(p => (
                  <div key={p.name} style={{
                    padding: '12px 8px', borderRadius: '10px', textAlign: 'center', cursor: 'pointer',
                    background: p.active ? `${p.color}15` : '#1a1a1a',
                    border: `1px solid ${p.active ? p.color + '60' : '#2a2a2a'}`,
                    transition: 'all 0.2s',
                  }}>
                    <div style={{ fontSize: '22px' }}>{p.icon}</div>
                    <p style={{ fontSize: '11px', color: p.active ? '#fff' : '#666', marginTop: '4px', fontWeight: 600 }}>{p.name}</p>
                    {p.active && <p style={{ fontSize: '9px', color: p.color, marginTop: '2px' }}>✓ Đang chọn</p>}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => { setStep(2); setTimeLeft(HOLD_DURATION); holdStartedRef.current = false; clearInterval(timerRef.current); }}
                className="gt-btn-outline"
                style={{ flex: 1, justifyContent: 'center', padding: '13px', borderRadius: '10px' }}>
                ← Sửa thông tin
              </button>
              <button onClick={handleBook} disabled={booking} className="gt-btn-primary"
                style={{ flex: 2, justifyContent: 'center', padding: '13px', fontSize: '14px', borderRadius: '10px' }}>
                {booking ? (
                  <>
                    <div style={{ width: '14px', height: '14px', border: '2px solid rgba(0,0,0,0.3)', borderTopColor: '#000', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
                    Đang xử lý...
                  </>
                ) : `ĐẶT VÉ – ${formatCurrency(totalPrice)}`}
              </button>
            </div>
            <p style={{ textAlign: 'center', fontSize: '11px', color: '#444', marginTop: '12px' }}>
              🔒 SSL 256-bit · Hoàn tiền 100% nếu trận bị hủy
            </p>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.8; } }
      `}</style>
    </div>
  );
}
