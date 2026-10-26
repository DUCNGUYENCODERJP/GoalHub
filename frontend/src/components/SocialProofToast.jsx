import { useState, useEffect } from 'react';

const SOCIAL_ACTIVITIES = [
  { name: 'Anh Hoàng', city: 'Hà Nội', action: 'vừa đặt 2 vé VIP', match: 'Việt Nam vs Thái Lan', time: '1 phút trước', icon: '🎟️' },
  { name: 'Chị Mai', city: 'TP.HCM', action: 'áp dụng thành công mã GOALVN20', match: 'giảm 20% đơn vé', time: 'vừa xong', icon: '⚡' },
  { name: 'Anh Tuấn', city: 'Đà Nẵng', action: 'vừa đặt 4 vé Khán Đài A', match: 'Hà Nội FC vs TP.HCM FC', time: '3 phút trước', icon: '⚽' },
  { name: 'Anh Minh', city: 'Hải Phòng', action: 'vừa đặt 2 vé Chung Kết', match: 'Việt Nam vs Indonesia', time: '5 phút trước', icon: '🔥' },
  { name: 'Bạn Đức', city: 'Cần Thơ', action: 'nhận vé QR điện tử vào cổng', match: 'SLNA vs Hải Phòng', time: '2 phút trước', icon: '📲' },
];

export default function SocialProofToast() {
  const [current, setCurrent] = useState(null);
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (dismissed) return;

    // Trigger first toast after 4s
    const firstTimer = setTimeout(() => {
      triggerRandomToast();
    }, 4000);

    // Periodic toast every 22s
    const interval = setInterval(() => {
      triggerRandomToast();
    }, 22000);

    return () => {
      clearTimeout(firstTimer);
      clearInterval(interval);
    };
  }, [dismissed]);

  function triggerRandomToast() {
    const randomItem = SOCIAL_ACTIVITIES[Math.floor(Math.random() * SOCIAL_ACTIVITIES.length)];
    setCurrent(randomItem);
    setVisible(true);

    // Auto-hide after 5.5s
    setTimeout(() => {
      setVisible(false);
    }, 5500);
  }

  if (!visible || !current || dismissed) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        left: '24px',
        zIndex: 9000,
        background: 'rgba(18, 18, 18, 0.95)',
        border: '1px solid #282828',
        borderRadius: '12px',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        maxWidth: '360px',
        boxShadow: '0 8px 30px rgba(0,0,0,0.6)',
        backdropFilter: 'blur(8px)',
        animation: 'slideInLeft 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <div
        style={{
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          background: 'rgba(57,255,20,0.1)',
          border: '1px solid rgba(57,255,20,0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '18px',
          flexShrink: 0,
        }}
      >
        {current.icon}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: '12px', color: '#fff', fontWeight: 600, lineHeight: 1.3 }}>
          <strong style={{ color: '#39ff14' }}>{current.name}</strong> ({current.city}) {current.action}
        </p>
        <p style={{ fontSize: '11px', color: '#888', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {current.match} · <span style={{ color: '#666' }}>{current.time}</span>
        </p>
      </div>

      <button
        onClick={() => { setVisible(false); setDismissed(true); }}
        style={{
          background: 'none',
          border: 'none',
          color: '#555',
          cursor: 'pointer',
          padding: '4px',
          fontSize: '14px',
          lineHeight: 1,
        }}
        title="Đóng thông báo"
      >
        ✕
      </button>

      <style>{`
        @keyframes slideInLeft {
          from { transform: translateX(-100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
