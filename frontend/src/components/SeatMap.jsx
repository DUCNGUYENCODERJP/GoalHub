import { formatCurrency } from '../utils/formatCurrency';

/**
 * SeatMap — displays a grid of seats colour-coded by status with GoalTicket theme.
 *
 * Props:
 *  - seats: Array<{ id, seatCode, seatClass, price, status }>
 *  - selectedSeatIds: number[]
 *  - onSeatToggle: (seatId: number) => void
 *  - readonly: boolean
 *  - maxSelect: number
 */
export default function SeatMap({
  seats = [],
  selectedSeatIds = [],
  onSeatToggle,
  readonly = false,
  maxSelect = 20,
}) {
  if (!seats.length) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0', color: '#666' }}>
        <div style={{ fontSize: '36px', marginBottom: '12px' }}>🪑</div>
        <p style={{ fontSize: '13px' }}>Chưa có ghế nào cho trận này.</p>
      </div>
    );
  }

  // Group by row prefix
  const rows = {};
  seats.forEach((seat) => {
    const rowKey = seat.seatCode.replace(/[0-9]+$/, '').replace(/-\d+$/, '') || 'X';
    if (!rows[rowKey]) rows[rowKey] = [];
    rows[rowKey].push(seat);
  });

  const isSelected = (id) => selectedSeatIds.includes(id);
  const atMax = selectedSeatIds.length >= maxSelect;

  function handleClick(seat) {
    if (readonly) return;
    if (seat.status !== 'AVAILABLE') return;
    if (!isSelected(seat.id) && atMax) return;
    onSeatToggle?.(seat.id);
  }

  function getSeatClass(seat) {
    if (isSelected(seat.id)) return 'gt-seat selected';
    if (seat.status === 'AVAILABLE') {
      return seat.seatClass === 'VIP' ? 'gt-seat available vip' : 'gt-seat available';
    }
    if (seat.status === 'RESERVED') return 'gt-seat reserved';
    if (seat.status === 'SOLD') return 'gt-seat sold';
    return 'gt-seat';
  }

  const vipCount = seats.filter(s => s.seatClass === 'VIP' && s.status === 'AVAILABLE').length;
  const stdCount = seats.filter(s => s.seatClass === 'STANDARD' && s.status === 'AVAILABLE').length;
  const vipPrice = seats.find(s => s.seatClass === 'VIP')?.price;
  const stdPrice = seats.find(s => s.seatClass === 'STANDARD')?.price;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
        {[
          { cls: 'gt-seat available', label: 'Thường — Trống', price: stdPrice, count: stdCount },
          { cls: 'gt-seat available vip', label: 'VIP — Trống', price: vipPrice, count: vipCount },
          { cls: 'gt-seat selected', label: 'Đang chọn' },
          { cls: 'gt-seat reserved', label: 'Đã giữ' },
          { cls: 'gt-seat sold', label: 'Đã bán' },
        ].map(({ cls, label, price, count }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#888' }}>
            <div className={cls} style={{ width: '22px', height: '22px', cursor: 'default', transform: 'none', pointerEvents: 'none' }} />
            <span>
              {label}
              {price != null && ` (${formatCurrency(price)})`}
              {count != null && ` · ${count} còn`}
            </span>
          </div>
        ))}
      </div>

      {/* Seat grid */}
      <div style={{ overflowX: 'auto', paddingBottom: '8px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: 'max-content' }}>
          {Object.entries(rows).map(([rowKey, rowSeats]) => (
            <div key={rowKey} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '36px', textAlign: 'right', color: '#666', fontSize: '11px', fontFamily: 'monospace', fontWeight: 700, flexShrink: 0 }}>
                {rowKey}
              </span>
              <div style={{ display: 'flex', gap: '4px' }}>
                {rowSeats.map((seat) => (
                  <button
                    key={seat.id}
                    title={`${seat.seatCode} | ${seat.seatClass} | ${formatCurrency(seat.price)} | ${seat.status}`}
                    onClick={() => handleClick(seat)}
                    disabled={seat.status !== 'AVAILABLE' || readonly || (!isSelected(seat.id) && atMax)}
                    className={getSeatClass(seat)}
                    style={{
                      width: '32px',
                      height: '32px',
                      fontSize: '10px',
                      fontFamily: 'monospace',
                      fontWeight: 700,
                    }}
                  >
                    {seat.seatCode.replace(rowKey, '')}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Selection counter */}
      {!readonly && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '12px',
          padding: '10px 14px',
          borderRadius: '8px',
          background: atMax ? 'rgba(255,76,0,0.1)' : 'rgba(255,255,255,0.03)',
          color: atMax ? '#ff4c00' : '#888',
          border: atMax ? '1px solid rgba(255,76,0,0.3)' : '1px solid #222'
        }}>
          <span>{atMax ? '⚠️' : '💡'}</span>
          <span>
            Đã chọn <strong style={{ color: '#fff' }}>{selectedSeatIds.length}</strong> / tối đa {maxSelect} ghế
            {atMax && ' — Bạn đã chọn tối đa số ghế cho phép'}
          </span>
        </div>
      )}
    </div>
  );
}
