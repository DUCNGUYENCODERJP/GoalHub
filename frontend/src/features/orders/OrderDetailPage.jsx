import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getOrderById } from '../../api/orderApi';
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
function TeamAvatar({ name, size = 48 }) {
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

const PAYMENT_METHODS = [
  { id: 'vnpay', name: 'VNPAY', desc: 'ATM / Internet Banking / QR Code', icon: '🏦', popular: true },
  { id: 'momo',  name: 'MoMo',  desc: 'Ví điện tử MoMo', icon: '💜' },
  { id: 'card',  name: 'Thẻ Quốc Tế', desc: 'Visa / Mastercard / JCB', icon: '💳' },
  { id: 'zalo',  name: 'ZaloPay', desc: 'Ví điện tử ZaloPay', icon: '💙' },
];

const CHECKOUT_STEPS = ['Chọn trận', 'Chọn ghế', 'Thanh toán', 'Xác nhận'];

export default function OrderDetailPage() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [payMethod, setPayMethod] = useState('vnpay');
  const [promoCode, setPromoCode] = useState('');
  const [promoApplied, setPromoApplied] = useState(false);
  const [buyerInfo, setBuyerInfo] = useState({ name: '', phone: '', email: '', cccd: '' });
  const [paying, setPaying] = useState(false);
  const [paymentCompleted, setPaymentCompleted] = useState(false);

  useEffect(() => {
    getOrderById(id)
      .then(setOrder)
      .catch(err => {
        const msg = err.response?.status === 403
          ? 'Bạn không có quyền xem đơn hàng này.'
          : 'Không tìm thấy đơn hàng.';
        toast.error(msg);
      })
      .finally(() => setLoading(false));
  }, [id]);

  function handlePayment() {
    setPaying(true);
    setTimeout(() => {
      setPaying(false);
      setPaymentCompleted(true);
      toast.success('🎉 Thanh toán thành công! Vé đã được xác nhận.');
    }, 700);
  }

  if (loading) return <LoadingSpinner message="Đang tải đơn hàng..." />;

  if (!order) return (
    <div style={{ textAlign: 'center', padding: '80px 20px', color: '#888' }}>
      <div style={{ fontSize: '48px', marginBottom: '12px' }}>🎟</div>
      <p style={{ marginBottom: '12px' }}>Không tìm thấy đơn hàng.</p>
      <Link to="/orders/my" style={{ color: '#39ff14', fontSize: '14px' }}>← Về vé của tôi</Link>
    </div>
  );

  const isPaid = order.status === 'PAID';
  const isPending = order.status === 'PENDING';

  // If order is PAID or user just completed checkout → show confirmation page
  if (isPaid || paymentCompleted) return <ConfirmationPage order={order} />;

  // Processing fee
  const processingFee = Math.round(order.totalAmount * 0.02);
  const discountAmt = promoApplied ? Math.round(order.totalAmount * 0.2) : 0;
  const grandTotal = order.totalAmount + processingFee - discountAmt;

  const seatCodes = order.items?.map(i => i.seatCode).join(', ') || '—';
  const seatClass = order.items?.[0]?.seatClass || 'STANDARD';

  // Step = 3 (Thanh toán) for pending
  const currentStep = 3;

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '60px' }}>
      <div className="gt-container">
        {/* Back */}
        <div style={{ padding: '20px 0 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Link to={`/`} style={{ color: '#888', fontSize: '13px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
            ← Quay lại chọn ghế
          </Link>
        </div>

        {/* Title + Steps */}
        <div style={{ marginBottom: '28px' }}>
          <p className="gt-section-label">// Thanh toán</p>
          <h1 className="gt-section-title" style={{ marginTop: '8px', marginBottom: '20px' }}>HOÀN TẤT ĐẶT VÉ</h1>

          {/* Steps */}
          <div className="gt-steps">
            {CHECKOUT_STEPS.map((step, i) => {
              const stepNum = i + 1;
              const isDone = stepNum < currentStep;
              const isActive = stepNum === currentStep;
              return (
                <div key={step} style={{ display: 'flex', alignItems: 'center', flex: i < CHECKOUT_STEPS.length - 1 ? 1 : 'none' }}>
                  <div className="gt-step">
                    <div className={`gt-step-circle ${isDone ? 'done' : isActive ? 'active' : ''}`}>
                      {isDone ? '✓' : stepNum}
                    </div>
                    <span className={`gt-step-label ${isActive ? 'active' : ''}`}>{step}</span>
                  </div>
                  {i < CHECKOUT_STEPS.length - 1 && (
                    <div className={`gt-step-line ${isDone ? 'done' : ''}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '20px', alignItems: 'start' }}>
          {/* Left column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Buyer info */}
            <div className="gt-card-flat" style={{ padding: '20px' }}>
              <p style={{ fontWeight: 700, fontSize: '13px', color: '#39ff14', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '16px' }}>
                Thông Tin Người Mua
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '6px' }}>Họ và tên</label>
                  <input
                    className="gt-input"
                    placeholder="Nguyễn Văn An"
                    value={buyerInfo.name}
                    onChange={e => setBuyerInfo({ ...buyerInfo, name: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '6px' }}>Số điện thoại</label>
                  <input
                    className="gt-input"
                    placeholder="0901 234 567"
                    value={buyerInfo.phone}
                    onChange={e => setBuyerInfo({ ...buyerInfo, phone: e.target.value })}
                  />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '6px' }}>Email</label>
                  <input
                    className="gt-input"
                    type="email"
                    placeholder="email@example.com"
                    value={buyerInfo.email}
                    onChange={e => setBuyerInfo({ ...buyerInfo, email: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '6px' }}>CCCD / CMND</label>
                  <input
                    className="gt-input"
                    placeholder="001234567890"
                    value={buyerInfo.cccd}
                    onChange={e => setBuyerInfo({ ...buyerInfo, cccd: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Payment methods */}
            <div className="gt-card-flat" style={{ padding: '20px' }}>
              <p style={{ fontWeight: 700, fontSize: '13px', color: '#39ff14', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '16px' }}>
                Phương Thức Thanh Toán
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {PAYMENT_METHODS.map(pm => (
                  <div
                    key={pm.id}
                    className={`gt-payment-option ${payMethod === pm.id ? 'selected' : ''}`}
                    onClick={() => setPayMethod(pm.id)}
                  >
                    {/* Radio */}
                    <div style={{
                      width: '18px', height: '18px', borderRadius: '50%',
                      border: `2px solid ${payMethod === pm.id ? '#39ff14' : '#444'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0, transition: 'border-color 0.2s'
                    }}>
                      {payMethod === pm.id && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#39ff14' }} />}
                    </div>
                    <span style={{ fontSize: '18px' }}>{pm.icon}</span>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: 700, color: '#fff', fontSize: '14px' }}>{pm.name}</p>
                      <p style={{ fontSize: '12px', color: '#555' }}>{pm.desc}</p>
                    </div>
                    {pm.popular && <span style={{ fontSize: '10px', fontWeight: 700, background: '#39ff14', color: '#000', padding: '2px 8px', borderRadius: '4px' }}>Phổ biến</span>}
                  </div>
                ))}
              </div>
            </div>

            {/* Promo code */}
            <div className="gt-card-flat" style={{ padding: '20px' }}>
              <p style={{ fontWeight: 700, fontSize: '13px', color: '#39ff14', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '14px' }}>
                Mã Khuyến Mãi
              </p>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  className="gt-input"
                  placeholder="GOALVN20"
                  value={promoCode}
                  onChange={e => setPromoCode(e.target.value.toUpperCase())}
                  style={{ letterSpacing: '0.06em', fontWeight: 600 }}
                />
                <button
                  onClick={() => {
                    if (promoCode === 'GOALVN20') { setPromoApplied(true); toast.success('Mã giảm giá đã được áp dụng!'); }
                    else toast.error('Mã không hợp lệ');
                  }}
                  className="gt-btn-primary"
                  style={{ flexShrink: 0, padding: '10px 20px' }}
                >
                  Áp dụng
                </button>
              </div>
              {promoApplied && (
                <p style={{ fontSize: '12px', color: '#39ff14', marginTop: '8px' }}>
                  ✓ Giảm 20% – Tiết kiệm {formatCurrency(discountAmt)}
                </p>
              )}
            </div>
          </div>

          {/* Right column: Summary */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', position: 'sticky', top: '80px' }}>
            <div className="gt-card-flat" style={{ padding: '20px' }}>
              <p style={{ fontWeight: 700, fontSize: '13px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '16px' }}>Tóm Tắt</p>

              {/* Match info */}
              <div style={{ background: '#1a1a1a', borderRadius: '10px', padding: '14px', marginBottom: '12px' }}>
                <span className="gt-badge-league" style={{ fontSize: '9px', padding: '2px 7px', borderRadius: '4px', marginBottom: '8px', display: 'inline-block' }}>
                  {order.league || 'V.LEAGUE 1'}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px' }}>
                  <p style={{ fontWeight: 700, color: '#fff', fontSize: '13px' }}>{order.homeTeam}</p>
                  <span style={{ color: '#555', fontSize: '11px' }}>VS</span>
                  <p style={{ fontWeight: 700, color: '#fff', fontSize: '13px' }}>{order.awayTeam}</p>
                </div>
                <p style={{ fontSize: '11px', color: '#555', marginTop: '6px' }}>
                  {order.matchDate ? new Date(order.matchDate).toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }) : '—'}
                  {' · Sân Mỹ Đình'}
                </p>
              </div>

              {/* Seat info */}
              <div style={{ background: '#1a1a1a', borderRadius: '10px', padding: '14px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                    <p style={{ fontSize: '11px', color: '#666' }}>{seatClass}</p>
                    <p style={{ fontSize: '13px', color: '#ccc', fontWeight: 600 }}>{order.items?.length || 1} ghế · {seatCodes}</p>
                  </div>
                  <p style={{ fontWeight: 700, color: '#39ff14' }}>{formatCurrency(order.totalAmount)} đ/vé</p>
                </div>
              </div>

              {/* Price breakdown */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#888' }}>
                  <span>Tiền vé</span>
                  <span style={{ color: '#ccc' }}>{formatCurrency(order.totalAmount)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#888' }}>
                  <span>Phí xử lý (2%)</span>
                  <span style={{ color: '#ccc' }}>{formatCurrency(processingFee)}</span>
                </div>
                {promoApplied && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#39ff14' }}>
                    <span>Mã GOALVN20 (−20%)</span>
                    <span>−{formatCurrency(discountAmt)}</span>
                  </div>
                )}
              </div>

              <div style={{ borderTop: '1px solid #2a2a2a', paddingTop: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <span style={{ fontWeight: 800, color: '#fff', fontSize: '15px' }}>TỔNG</span>
                <span style={{ fontWeight: 900, color: '#39ff14', fontSize: '20px' }}>{formatCurrency(grandTotal)}</span>
              </div>

              <button
                className="gt-btn-primary"
                style={{ width: '100%', justifyContent: 'center', fontSize: '14px', padding: '14px', borderRadius: '8px' }}
                disabled={paying}
                onClick={handlePayment}
              >
                {paying ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '14px', height: '14px', border: '2px solid rgba(0,0,0,0.3)', borderTopColor: '#000', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
                    Đang xử lý giao dịch...
                  </span>
                ) : (
                  `THANH TOÁN ${formatCurrency(grandTotal)} →`
                )}
              </button>
              <p style={{ textAlign: 'center', fontSize: '11px', color: '#444', marginTop: '10px' }}>
                🔒 Bảo mật SSL 256-bit · PCI DSS
              </p>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .checkout-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

/* ── Confirmation Page with Order Timeline & Ticket Transfer ── */
function ConfirmationPage({ order }) {
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferInfo, setTransferInfo] = useState({ name: '', phone: '', email: '' });
  const [transferredTo, setTransferredTo] = useState(null);

  const seatCodes = order.items?.map(i => i.seatCode).join(', ') || 'A5, A6';
  const seatClass = order.items?.[0]?.seatClass || 'VIP';
  const ticketCode = `GT-${new Date().getFullYear()}-${order.id ? String(order.id).padStart(4, '0') : 'INHX0S'}`;
  const matchDate = order.matchDate ? new Date(order.matchDate) : null;

  function handleTransferSubmit(e) {
    e.preventDefault();
    if (!transferInfo.name.trim() || (!transferInfo.phone.trim() && !transferInfo.email.trim())) {
      toast.error('Vui lòng nhập họ tên và SĐT hoặc Email người nhận');
      return;
    }
    setTransferredTo(transferInfo.name);
    setShowTransferModal(false);
    toast.success(`🎉 Đã chuyển nhượng vé thành công cho ${transferInfo.name}! Mã xác nhận đã gửi đến ${transferInfo.phone || transferInfo.email}.`);
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', textAlign: 'center' }}>
      {/* Check icon */}
      <div className="gt-confirm-check" style={{ marginBottom: '20px' }}>✓</div>

      <p className="gt-section-label" style={{ marginBottom: '8px' }}>// Thanh toán thành công</p>
      <h1 style={{ fontFamily: "'Barlow', sans-serif", fontSize: 'clamp(28px, 5vw, 44px)', fontWeight: 900, color: '#fff', marginBottom: '8px', letterSpacing: '-0.02em' }}>
        VÉ ĐÃ XÁC NHẬN!
      </h1>
      <p style={{ color: '#888', fontSize: '14px', marginBottom: '28px' }}>
        Vé điện tử đã gửi về email. Quý khách xuất trình mã QR tại cổng sân để vào khán đài.
      </p>

      {/* E-Commerce Order Tracking Timeline */}
      <div
        className="gt-card-flat"
        style={{
          maxWidth: '520px',
          width: '100%',
          padding: '16px 20px',
          marginBottom: '24px',
          background: '#141414',
          borderRadius: '12px',
        }}
      >
        <p style={{ fontSize: '11px', color: '#666', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'left', marginBottom: '14px' }}>
          Tiến Trình Đơn Hàng #{ticketCode}
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', textAlign: 'center' }}>
          {[
            { step: '1. Đặt chỗ', status: 'done', icon: '✓' },
            { step: '2. Thanh toán', status: 'done', icon: '✓' },
            { step: '3. Vé QR', status: 'done', icon: '✓' },
            { step: '4. Vào cổng', status: 'pending', icon: '⏳' },
          ].map((t) => (
            <div key={t.step} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: t.status === 'done' ? '#39ff14' : '#222',
                  color: t.status === 'done' ? '#000' : '#888',
                  fontSize: '11px',
                  fontWeight: 900,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {t.icon}
              </div>
              <span style={{ fontSize: '10px', color: t.status === 'done' ? '#fff' : '#666', fontWeight: 600 }}>
                {t.step}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Ticket Card */}
      <div className="gt-card-flat" style={{ maxWidth: '520px', width: '100%', padding: '24px', marginBottom: '24px', textAlign: 'left', background: '#141414', borderRadius: '16px' }}>
        {/* League */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <span className="gt-badge-league" style={{ fontSize: '9px', padding: '2px 8px', borderRadius: '4px' }}>
            {order.league || 'V.LEAGUE 1'} · VÒNG 22
          </span>
          {transferredTo && (
            <span style={{ fontSize: '11px', color: '#ff6b2b', background: 'rgba(255,107,43,0.1)', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(255,107,43,0.3)' }}>
              👤 Đã chuyển cho: {transferredTo}
            </span>
          )}
        </div>

        {/* Teams */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ textAlign: 'center' }}>
            <TeamAvatar name={order.homeTeam || 'HN'} size={52} />
            <p style={{ color: '#fff', fontWeight: 700, fontSize: '13px', marginTop: '8px' }}>{order.homeTeam || 'Hà Nội FC'}</p>
          </div>
          <span style={{ color: '#555', fontSize: '18px', fontWeight: 700 }}>VS</span>
          <div style={{ textAlign: 'center' }}>
            <TeamAvatar name={order.awayTeam || 'HCM'} size={52} />
            <p style={{ color: '#fff', fontWeight: 700, fontSize: '13px', marginTop: '8px' }}>{order.awayTeam || 'TP.HCM FC'}</p>
          </div>
        </div>

        {/* Date / Time / Venue */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '20px' }}>
          {[
            { label: 'Ngày', value: matchDate ? `${matchDate.getDate()}/${matchDate.getMonth() + 1}` : '27/09' },
            { label: 'Giờ', value: matchDate ? matchDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '19:00' },
            { label: 'Sân', value: 'Mỹ Đình' },
          ].map(info => (
            <div key={info.label} style={{ background: '#1c1c1c', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
              <p style={{ fontSize: '10px', color: '#666', marginBottom: '4px', textTransform: 'uppercase' }}>{info.label}</p>
              <p style={{ fontWeight: 700, color: '#fff', fontSize: '14px' }}>{info.value}</p>
            </div>
          ))}
        </div>

        {/* QR Matrix + Code */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: '#1c1c1c', borderRadius: '10px', padding: '16px' }}>
          {/* Stylized QR Box */}
          <div style={{
            width: '72px',
            height: '72px',
            background: '#000',
            border: '2px solid rgba(57,255,20,0.4)',
            borderRadius: '8px',
            padding: '4px',
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gap: '3px',
            flexShrink: 0,
          }}>
            {[...Array(25)].map((_, idx) => (
              <div
                key={idx}
                style={{
                  background: (idx % 2 === 0 || idx < 3 || idx === 12) ? '#39ff14' : '#111',
                  borderRadius: '1px',
                }}
              />
            ))}
          </div>

          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '10px', color: '#666', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Mã đặt chỗ</p>
            <p style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: '16px', color: '#39ff14' }}>{ticketCode}</p>
            <p style={{ fontSize: '12px', color: '#aaa', marginTop: '4px' }}>{seatClass} · {seatCodes}</p>
            <p style={{ fontWeight: 800, color: '#fff', fontSize: '14px', marginTop: '4px' }}>{formatCurrency(order.totalAmount || 500000)}</p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '16px' }}>
        <button
          className="gt-btn-primary"
          style={{ fontSize: '13px', padding: '12px 20px' }}
          onClick={() => toast.success('Đang tạo và tải file PDF vé điện tử độ phân giải cao...')}
        >
          📥 Tải Vé PDF
        </button>

        <button
          className="gt-btn-outline"
          style={{ fontSize: '13px', padding: '12px 20px' }}
          onClick={() => setShowTransferModal(true)}
        >
          🎁 Chuyển Vé Cho Bạn Bè
        </button>

        <button
          className="gt-btn-ghost"
          style={{ fontSize: '13px', padding: '12px 18px', color: '#aaa' }}
          onClick={() => toast.success('Yêu cầu xuất hoá đơn VAT đã được gửi đến kế toán!')}
        >
          🧾 Xuất Hoá Đơn VAT
        </button>
      </div>

      <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
        <Link to="/orders/my" style={{ color: '#39ff14', fontSize: '13px', textDecoration: 'none' }}>
          → Quản lý trong Vé Của Tôi
        </Link>
        <Link to="/" style={{ color: '#888', fontSize: '13px', textDecoration: 'none' }}>
          Về Trang Chủ
        </Link>
      </div>

      {/* Transfer Ticket Modal */}
      {showTransferModal && (
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
          onClick={() => setShowTransferModal(false)}
        >
          <div
            className="gt-card animate-fade-in-up"
            style={{
              background: '#141414',
              border: '1px solid #282828',
              borderRadius: '16px',
              maxWidth: '420px',
              width: '100%',
              padding: '24px',
              textAlign: 'left',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <p className="gt-section-label" style={{ fontSize: '11px' }}>// Chuyển nhượng vé</p>
                <h3 style={{ fontFamily: "'Barlow', sans-serif", fontSize: '18px', fontWeight: 900, color: '#fff' }}>
                  Tặng Vé Cho Người Thân
                </h3>
              </div>
              <button
                onClick={() => setShowTransferModal(false)}
                style={{ background: 'none', border: 'none', color: '#888', fontSize: '20px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: '12px', color: '#888', marginBottom: '16px' }}>
              Người nhận sẽ nhận được mã QR vé điện tử chính thức qua SMS và Email để tự do quét vé vào sân.
            </p>

            <form onSubmit={handleTransferSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '11px', color: '#aaa', display: 'block', marginBottom: '4px' }}>Họ và tên người nhận *</label>
                <input
                  className="gt-input"
                  placeholder="Trần Văn Nam"
                  value={transferInfo.name}
                  onChange={e => setTransferInfo({ ...transferInfo, name: e.target.value })}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', color: '#aaa', display: 'block', marginBottom: '4px' }}>Số điện thoại người nhận *</label>
                <input
                  className="gt-input"
                  placeholder="0912 345 678"
                  value={transferInfo.phone}
                  onChange={e => setTransferInfo({ ...transferInfo, phone: e.target.value })}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', color: '#aaa', display: 'block', marginBottom: '4px' }}>Email người nhận (để nhận QR PDF)</label>
                <input
                  className="gt-input"
                  type="email"
                  placeholder="namtran@example.com"
                  value={transferInfo.email}
                  onChange={e => setTransferInfo({ ...transferInfo, email: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="gt-btn-ghost"
                  style={{ fontSize: '13px' }}
                >
                  Huỷ
                </button>
                <button
                  type="submit"
                  className="gt-btn-primary"
                  style={{ fontSize: '13px', padding: '10px 18px' }}
                >
                  Xác Nhận Chuyển Vé
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
