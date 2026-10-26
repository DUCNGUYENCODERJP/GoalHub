import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { createOrder } from '../api/orderApi';
import { formatCurrency } from '../utils/formatCurrency';
import toast from 'react-hot-toast';

export default function CartDrawer() {
  const {
    isOpen,
    closeCart,
    matchData,
    selectedSeats,
    quantity,
    selectedAddons,
    availableAddons,
    promoCode,
    discountPercent,
    discountAmount,
    processingFee,
    ticketSubtotal,
    addonsSubtotal,
    grandTotal,
    totalItemCount,
    timeLeft,
    removeSeat,
    toggleAddon,
    applyPromo,
    removePromo,
    clearCart,
  } = useCart();

  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [promoInput, setPromoInput] = useState('');
  const [checkingOut, setCheckingOut] = useState(false);

  if (!isOpen) return null;

  // Format timer MM:SS
  const mins = String(Math.floor(timeLeft / 60)).padStart(2, '0');
  const secs = String(timeLeft % 60).padStart(2, '0');

  const hasItems = matchData && (selectedSeats.length > 0 || quantity > 0);

  async function handleCheckout() {
    if (!hasItems) return;
    if (!isAuthenticated) {
      closeCart();
      toast('Vui lòng đăng nhập để thanh toán', { icon: '🔐' });
      navigate('/login');
      return;
    }

    setCheckingOut(true);
    try {
      const seatIds = selectedSeats.map(s => s.id);
      const order = await createOrder({
        matchId: matchData.id,
        seatIds: seatIds,
      });
      closeCart();
      toast.success('🎉 Đơn hàng đã được khởi tạo!');
      navigate(`/orders/${order.id}`);
    } catch (err) {
      const msg = err.response?.data?.message || 'Không thể tạo đơn hàng, vui lòng thử lại.';
      toast.error(msg);
    } finally {
      setCheckingOut(false);
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 99999,
        background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        justifyContent: 'flex-end',
        transition: 'all 0.3s ease',
      }}
      onClick={closeCart}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '460px',
          height: '100%',
          background: '#111111',
          borderLeft: '1px solid #222222',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '-10px 0 35px rgba(0,0,0,0.8)',
          animation: 'slideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #1e1e1e', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '18px' }}>🎟️</span>
            <div>
              <h2 style={{ fontFamily: "'Barlow', sans-serif", fontWeight: 900, color: '#fff', fontSize: '18px', letterSpacing: '-0.01em', textTransform: 'uppercase' }}>
                Giỏ Vé Của Bạn
              </h2>
              <span style={{ fontSize: '11px', color: '#666' }}>
                {totalItemCount} sản phẩm đã chọn
              </span>
            </div>
          </div>
          <button
            onClick={closeCart}
            style={{
              background: '#1a1a1a',
              border: '1px solid #2a2a2a',
              color: '#888',
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'color 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.color = '#fff'}
            onMouseLeave={e => e.currentTarget.style.color = '#888'}
          >
            ✕
          </button>
        </div>

        {/* Urgency Countdown Bar */}
        {hasItems && (
          <div style={{
            background: 'linear-gradient(90deg, rgba(255,76,0,0.15), rgba(255,76,0,0.05))',
            borderBottom: '1px solid rgba(255,76,0,0.25)',
            padding: '10px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ animation: 'blink 1s infinite', fontSize: '14px' }}>⏱️</span>
              <span style={{ fontSize: '12px', color: '#ff6b2b', fontWeight: 600 }}>
                Giữ vé tạm thời:
              </span>
            </div>
            <span style={{
              fontFamily: 'monospace',
              fontWeight: 800,
              fontSize: '14px',
              color: '#fff',
              background: '#000',
              padding: '2px 8px',
              borderRadius: '4px',
              border: '1px solid rgba(255,76,0,0.4)',
            }}>
              {mins}:{secs}
            </span>
          </div>
        )}

        {/* Drawer Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {!hasItems ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#666' }}>
              <div style={{ fontSize: '50px', marginBottom: '16px' }}>🏟️</div>
              <p style={{ fontWeight: 700, color: '#fff', fontSize: '16px', marginBottom: '6px' }}>Giỏ vé đang trống</p>
              <p style={{ fontSize: '13px', color: '#555', marginBottom: '24px' }}>Hãy chọn trận đấu và chỗ ngồi yêu thích!</p>
              <button
                onClick={() => { closeCart(); navigate('/lich-dau'); }}
                className="gt-btn-primary"
                style={{ fontSize: '13px', padding: '10px 20px', margin: '0 auto' }}
              >
                Xem Lịch Đấu →
              </button>
            </div>
          ) : (
            <>
              {/* Match and Selected Seats */}
              <div className="gt-card-flat" style={{ padding: '16px', background: '#161616', borderRadius: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <span className="gt-badge-league" style={{ fontSize: '9px', padding: '2px 6px', borderRadius: '4px' }}>
                    {matchData.league || 'V.LEAGUE 1'}
                  </span>
                  <span style={{ fontSize: '11px', color: '#666' }}>
                    Sân {matchData.venue || 'Mỹ Đình'}
                  </span>
                </div>
                <h4 style={{ fontWeight: 800, color: '#fff', fontSize: '15px', marginBottom: '4px' }}>
                  {matchData.homeTeam} vs {matchData.awayTeam}
                </h4>
                <p style={{ fontSize: '12px', color: '#888', marginBottom: '12px' }}>
                  {matchData.matchDate ? new Date(matchData.matchDate).toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' }) : 'Sắp diễn ra'}
                </p>

                {/* Seats List */}
                {selectedSeats.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {selectedSeats.map(seat => (
                      <div
                        key={seat.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          background: '#0e0e0e',
                          padding: '8px 12px',
                          borderRadius: '8px',
                          border: '1px solid #222',
                        }}
                      >
                        <div>
                          <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#39ff14', fontSize: '13px', marginRight: '8px' }}>
                            {seat.seatCode}
                          </span>
                          <span style={{ fontSize: '11px', color: '#666' }}>
                            ({seat.seatClass || 'Ghế'})
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontWeight: 700, color: '#fff', fontSize: '13px' }}>
                            {formatCurrency(seat.price)}
                          </span>
                          <button
                            onClick={() => removeSeat(seat.id)}
                            style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: '14px' }}
                            title="Xóa ghế"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0e0e0e', padding: '8px 12px', borderRadius: '8px' }}>
                    <span style={{ fontSize: '12px', color: '#ccc' }}>Vé phổ thông × {quantity}</span>
                    <span style={{ fontWeight: 700, color: '#fff', fontSize: '13px' }}>
                      {formatCurrency(ticketSubtotal)}
                    </span>
                  </div>
                )}
              </div>

              {/* Cross-sell Merchandise Add-ons (Giai đoạn 2) */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <p style={{ fontWeight: 800, color: '#ff6b2b', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    🔥 Phụ Kiện Cổ Vũ (Ưu đãi đi kèm)
                  </p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {availableAddons.map(addon => {
                    const isAdded = selectedAddons.includes(addon.id);
                    return (
                      <div
                        key={addon.id}
                        onClick={() => toggleAddon(addon.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 14px',
                          background: isAdded ? 'rgba(57,255,20,0.06)' : '#161616',
                          border: `1px solid ${isAdded ? '#39ff14' : '#222'}`,
                          borderRadius: '10px',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '20px' }}>{addon.icon}</span>
                          <div>
                            <p style={{ fontSize: '12px', fontWeight: 700, color: isAdded ? '#fff' : '#ccc' }}>
                              {addon.name}
                            </p>
                            <p style={{ fontSize: '10px', color: '#666' }}>{addon.desc}</p>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '12px', fontWeight: 700, color: isAdded ? '#39ff14' : '#aaa' }}>
                            +{formatCurrency(addon.price)}
                          </span>
                          <span style={{
                            width: '20px',
                            height: '20px',
                            borderRadius: '50%',
                            background: isAdded ? '#39ff14' : '#222',
                            color: isAdded ? '#000' : '#666',
                            fontSize: '11px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                          }}>
                            {isAdded ? '✓' : '+'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Voucher Box */}
              <div>
                <p style={{ fontWeight: 800, color: '#aaa', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
                  Mã Giảm Giá / Voucher
                </p>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                  <input
                    className="gt-input"
                    placeholder="Nhập mã (vd: GOALVN20)"
                    value={promoInput}
                    onChange={e => setPromoInput(e.target.value.toUpperCase())}
                    style={{ fontSize: '12px', padding: '8px 12px' }}
                  />
                  <button
                    onClick={() => {
                      if (applyPromo(promoInput)) setPromoInput('');
                    }}
                    className="gt-btn-primary"
                    style={{ padding: '8px 16px', fontSize: '12px', flexShrink: 0 }}
                  >
                    Áp dụng
                  </button>
                </div>

                {/* Quick Voucher Chips */}
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {[
                    { code: 'GOALVN20', label: '⚡ GOALVN20 (−20%)' },
                    { code: 'FREESHIPFEE', label: '🎟️ FREESHIPFEE (0% phí)' },
                    { code: 'NEWFAN', label: '🎁 NEWFAN (−10%)' },
                  ].map(v => (
                    <button
                      key={v.code}
                      onClick={() => applyPromo(v.code)}
                      style={{
                        background: promoCode === v.code ? 'rgba(57,255,20,0.15)' : '#1a1a1a',
                        border: `1px dashed ${promoCode === v.code ? '#39ff14' : '#333'}`,
                        color: promoCode === v.code ? '#39ff14' : '#888',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        fontSize: '10px',
                        cursor: 'pointer',
                        fontWeight: 600,
                      }}
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
                {promoCode && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                    <span style={{ fontSize: '11px', color: '#39ff14' }}>
                      ✓ Đang dùng: <strong>{promoCode}</strong> (−{formatCurrency(discountAmount)})
                    </span>
                    <button onClick={removePromo} style={{ background: 'none', border: 'none', color: '#e53935', fontSize: '11px', cursor: 'pointer' }}>
                      Gỡ mã
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Drawer Footer / Checkout summary */}
        {hasItems && (
          <div style={{ padding: '20px 24px', borderTop: '1px solid #1e1e1e', background: '#0d0d0d' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '14px', fontSize: '12px', color: '#888' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Tiền vé:</span>
                <span style={{ color: '#fff' }}>{formatCurrency(ticketSubtotal)}</span>
              </div>
              {addonsSubtotal > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Phụ kiện cổ vũ:</span>
                  <span style={{ color: '#fff' }}>+{formatCurrency(addonsSubtotal)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Phí xử lý giao dịch:</span>
                <span style={{ color: processingFee === 0 ? '#39ff14' : '#fff' }}>
                  {processingFee === 0 ? 'Miễn phí' : formatCurrency(processingFee)}
                </span>
              </div>
              {discountAmount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#39ff14' }}>
                  <span>Giảm giá ({promoCode}):</span>
                  <span>−{formatCurrency(discountAmount)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #222', paddingTop: '8px', marginTop: '4px', fontSize: '15px', fontWeight: 800 }}>
                <span style={{ color: '#fff' }}>TỔNG CỘNG:</span>
                <span style={{ color: '#39ff14', fontSize: '18px', fontFamily: "'Barlow', sans-serif" }}>
                  {formatCurrency(grandTotal)}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={clearCart}
                className="gt-btn-ghost"
                style={{ fontSize: '12px', padding: '12px 14px' }}
                title="Xóa giỏ hàng"
              >
                Xóa
              </button>
              <button
                onClick={handleCheckout}
                disabled={checkingOut}
                className="gt-btn-primary"
                style={{ flex: 1, justifyContent: 'center', padding: '14px', fontSize: '14px', borderRadius: '8px' }}
              >
                {checkingOut ? 'Đang tạo đơn...' : 'TIẾN HÀNH ĐẶT VÉ →'}
              </button>
            </div>
            <p style={{ textAlign: 'center', fontSize: '10px', color: '#444', marginTop: '8px' }}>
              🔒 Bảo mật SSL 256-bit • Giữ ghế đảm bảo 100%
            </p>
          </div>
        )}
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
