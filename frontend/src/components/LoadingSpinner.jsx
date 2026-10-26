export default function LoadingSpinner({ message = 'Đang tải...' }) {
  return (
    <div style={{
      minHeight: '50vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '16px',
    }}>
      <div style={{
        width: '40px',
        height: '40px',
        borderRadius: '50%',
        border: '3px solid #1e1e1e',
        borderTopColor: '#39ff14',
        animation: 'spin 0.7s linear infinite',
      }} />
      <p style={{ fontSize: '13px', color: '#555' }}>{message}</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div style={{ background: '#141414', border: '1px solid #2a2a2a', borderRadius: '12px', padding: '20px' }}>
      <div className="skeleton" style={{ height: '14px', width: '60%', marginBottom: '12px' }} />
      <div className="skeleton" style={{ height: '48px', width: '100%', marginBottom: '16px' }} />
      <div className="skeleton" style={{ height: '12px', width: '80%', marginBottom: '8px' }} />
      <div className="skeleton" style={{ height: '12px', width: '50%', marginBottom: '16px' }} />
      <div className="skeleton" style={{ height: '36px', width: '100%', borderRadius: '8px' }} />
    </div>
  );
}
