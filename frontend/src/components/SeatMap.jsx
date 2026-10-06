/**
 * SeatMap — displays a grid of seats colour-coded by status.
 *
 * Props:
 *  - seats: Array<{ id, seatCode, seatClass, price, status }>
 *  - selectedSeatIds: number[]
 *  - onSeatToggle: (seatId: number) => void
 *  - readonly: boolean  (true = no clicking)
 *  - maxSelect: number  (default 20)
 */
import { formatCurrency } from '../utils/formatCurrency';

export default function SeatMap({
  seats = [],
  selectedSeatIds = [],
  onSeatToggle,
  readonly = false,
  maxSelect = 20,
}) {
  if (!seats.length) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-3">🪑</div>
        <p className="text-slate-400 text-sm">Chưa có ghế nào cho trận này.</p>
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
    if (!isSelected(seat.id) && atMax) {
      return;
    }
    onSeatToggle?.(seat.id);
  }

  function seatCls(seat) {
    if (isSelected(seat.id)) return 'seat-selected';
    if (seat.status === 'AVAILABLE') {
      return seat.seatClass === 'VIP' ? 'seat-available-vip' : 'seat-available-std';
    }
    if (seat.status === 'RESERVED') return 'seat-reserved';
    if (seat.status === 'SOLD') return 'seat-sold';
    return 'bg-slate-100 border-slate-200';
  }

  function seatCursor(seat) {
    if (readonly) return 'cursor-default';
    if (seat.status !== 'AVAILABLE') return 'cursor-not-allowed';
    if (!isSelected(seat.id) && atMax) return 'cursor-not-allowed';
    return 'cursor-pointer';
  }

  const vipCount = seats.filter(s => s.seatClass === 'VIP' && s.status === 'AVAILABLE').length;
  const stdCount = seats.filter(s => s.seatClass === 'STANDARD' && s.status === 'AVAILABLE').length;
  const vipPrice = seats.find(s => s.seatClass === 'VIP')?.price;
  const stdPrice = seats.find(s => s.seatClass === 'STANDARD')?.price;

  return (
    <div className="space-y-5">
      {/* Legend */}
      <div className="flex flex-wrap gap-3">
        {[
          { cls: 'seat-available-std', label: 'Thường — Trống', price: stdPrice, count: stdCount },
          { cls: 'seat-available-vip', label: 'VIP — Trống', price: vipPrice, count: vipCount },
          { cls: 'seat-selected', label: 'Đang chọn' },
          { cls: 'seat-reserved', label: 'Đã giữ' },
          { cls: 'seat-sold', label: 'Đã bán' },
        ].map(({ cls, label, price, count }) => (
          <div key={label} className="flex items-center gap-2 text-xs text-slate-500">
            <div className={`w-5 h-5 rounded-md border-2 ${cls} flex-shrink-0`} />
            <span>
              {label}
              {price != null && ` (${formatCurrency(price)})`}
              {count != null && ` · ${count} còn`}
            </span>
          </div>
        ))}
      </div>

      {/* Seat grid */}
      <div className="overflow-x-auto pb-2">
        <div className="space-y-2 min-w-max">
          {Object.entries(rows).map(([rowKey, rowSeats]) => (
            <div key={rowKey} className="flex items-center gap-2">
              <span className="w-12 text-right text-slate-400 text-xs font-mono font-bold shrink-0">
                {rowKey}
              </span>
              <div className="flex gap-1.5">
                {rowSeats.map((seat) => (
                  <button
                    key={seat.id}
                    title={`${seat.seatCode} | ${seat.seatClass} | ${formatCurrency(seat.price)} | ${seat.status}`}
                    onClick={() => handleClick(seat)}
                    disabled={seat.status !== 'AVAILABLE' || readonly || (!isSelected(seat.id) && atMax)}
                    className={`
                      w-8 h-8 rounded-lg border-2 text-[10px] font-mono font-bold
                      transition-all duration-150 select-none
                      ${seatCls(seat)} ${seatCursor(seat)}
                      ${isSelected(seat.id) ? 'scale-110 shadow-lg' : 'hover:scale-105'}
                    `}
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
        <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg ${
          atMax ? 'bg-orange-50 text-orange-700 border border-orange-100' : 'bg-slate-50 text-slate-500'
        }`}>
          <span>{atMax ? '⚠️' : '💡'}</span>
          <span>
            Đã chọn <strong className="text-slate-700">{selectedSeatIds.length}</strong> / tối đa {maxSelect} ghế
            {atMax && ' — Bạn đã chọn tối đa số ghế cho phép'}
          </span>
        </div>
      )}
    </div>
  );
}
