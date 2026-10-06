import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getMatchById } from '../../api/matchApi';
import { getSeatsByMatch, bulkCreateSeats } from '../../api/seatApi';
import SeatMap from '../../components/SeatMap';
import LoadingSpinner from '../../components/LoadingSpinner';
import { formatCurrency } from '../../utils/formatCurrency';

/**
 * Auto-generate seat codes: prefix + index
 * e.g. prefix="A", count=5 → ["A1","A2","A3","A4","A5"]
 */
function generateSeats(prefix, start, count, seatClass, price) {
  return Array.from({ length: count }, (_, i) => ({
    seatCode: `${prefix.toUpperCase()}${start + i}`,
    seatClass,
    price: Number(price),
  }));
}

export default function ManageSeatsPage() {
  const { id: matchId } = useParams();
  const [match, setMatch] = useState(null);
  const [seats, setSeats] = useState([]);
  const [loadingSeats, setLoadingSeats] = useState(true);

  const [gen, setGen] = useState({ prefix: 'A', start: 1, count: 10, seatClass: 'STANDARD', price: 150000 });
  const [preview, setPreview] = useState([]);
  const [creating, setCreating] = useState(false);

  function setG(field) {
    return (e) => setGen((f) => ({ ...f, [field]: e.target.value }));
  }

  function loadSeats() {
    setLoadingSeats(true);
    getSeatsByMatch(matchId)
      .then(setSeats)
      .catch(() => toast.error('Không thể tải ghế'))
      .finally(() => setLoadingSeats(false));
  }

  useEffect(() => {
    getMatchById(matchId).then(setMatch).catch(console.error);
    loadSeats();
  }, [matchId]);

  function handlePreview() {
    const generated = generateSeats(gen.prefix, Number(gen.start), Number(gen.count), gen.seatClass, gen.price);
    setPreview(generated);
    toast.success(`Xem trước ${generated.length} ghế`);
  }

  async function handleCreate() {
    if (preview.length === 0) {
      toast.error('Nhấn "Xem trước" trước khi tạo ghế');
      return;
    }
    setCreating(true);
    try {
      const result = await bulkCreateSeats(matchId, { seats: preview });
      toast.success(`✅ Đã tạo ${result.created} ghế thành công`);
      setPreview([]);
      loadSeats();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Tạo ghế thất bại');
    } finally {
      setCreating(false);
    }
  }

  const totalSeats = seats.length;
  const available = seats.filter(s => s.status === 'AVAILABLE').length;
  const reserved  = seats.filter(s => s.status === 'RESERVED').length;
  const sold      = seats.filter(s => s.status === 'SOLD').length;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Breadcrumb + header */}
      <div>
        <div className="flex items-center gap-2 text-sm text-slate-400 mb-2">
          <Link to="/admin/matches" className="hover:text-blue-600 transition-colors">← Quản lý trận đấu</Link>
          <span>/</span>
          <span className="text-slate-600 font-medium">Quản lý ghế</span>
        </div>
        <h1 className="text-2xl font-black text-slate-800" style={{ fontFamily: "'Outfit', sans-serif" }}>
          🪑 {match ? `${match.homeTeam} vs ${match.awayTeam}` : `Trận #${matchId}`}
        </h1>
        <p className="text-slate-400 text-sm mt-1">Tạo và quản lý ghế ngồi cho trận đấu</p>
      </div>

      {/* Seat stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Tổng ghế', value: totalSeats, cls: 'text-slate-800', bg: 'bg-slate-50 border-slate-200' },
          { label: '🟢 Trống', value: available, cls: 'text-green-700', bg: 'bg-green-50 border-green-100' },
          { label: '⏳ Đã giữ', value: reserved, cls: 'text-yellow-700', bg: 'bg-yellow-50 border-yellow-100' },
          { label: '🔴 Đã bán', value: sold, cls: 'text-red-600', bg: 'bg-red-50 border-red-100' },
        ].map(s => (
          <div key={s.label} className={`rounded-2xl border p-4 ${s.bg}`}>
            <p className="text-xs text-slate-400 font-medium mb-1">{s.label}</p>
            <p className={`text-2xl font-black ${s.cls}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Batch generator */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-50">
          <h2 className="font-bold text-slate-800">⚡ Tạo ghế hàng loạt</h2>
          <p className="text-xs text-slate-400 mt-0.5">Tự động sinh mã ghế theo hàng và loại</p>
        </div>

        <div className="p-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
            {[
              { label: 'Prefix hàng (A, B, VIP...)', field: 'prefix', type: 'text', placeholder: 'A' },
              { label: 'Số bắt đầu', field: 'start', type: 'number', min: 1, placeholder: '1' },
              { label: 'Số lượng ghế', field: 'count', type: 'number', min: 1, max: 500, placeholder: '10' },
              { label: 'Giá vé (VNĐ)', field: 'price', type: 'number', min: 0, placeholder: '150000' },
            ].map(({ label, field, ...rest }) => (
              <div key={field}>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">{label}</label>
                <input
                  {...rest}
                  value={gen[field]}
                  onChange={setG(field)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                />
              </div>
            ))}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Hạng ghế</label>
              <select
                value={gen.seatClass}
                onChange={setG('seatClass')}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all bg-white"
              >
                <option value="STANDARD">🪑 Thường (STANDARD)</option>
                <option value="VIP">🏆 VIP</option>
              </select>
            </div>
          </div>

          {/* Preview info */}
          {gen.count && gen.price && (
            <div className="bg-slate-50 rounded-xl p-3 mb-4 text-xs text-slate-600">
              <span className="font-semibold">Tổng tiền ước tính: </span>
              <span className="text-blue-700 font-bold">{formatCurrency(Number(gen.count) * Number(gen.price))}</span>
              <span className="text-slate-400"> cho {gen.count} ghế {gen.seatClass === 'VIP' ? '🏆 VIP' : '🪑 Thường'}</span>
            </div>
          )}

          <div className="flex gap-3">
            <button
              id="btn-preview-seats"
              onClick={handlePreview}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl transition-colors"
            >
              👁 Xem trước ({Number(gen.count)} ghế)
            </button>
            <button
              id="btn-create-seats"
              onClick={handleCreate}
              disabled={creating || preview.length === 0}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 disabled:from-blue-300 disabled:to-blue-300 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-blue-600/25"
            >
              {creating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Đang tạo...
                </>
              ) : (
                `✅ Tạo ${preview.length > 0 ? preview.length : ''} ghế`
              )}
            </button>
          </div>

          {/* Preview badge list */}
          {preview.length > 0 && (
            <div className="mt-4 border border-blue-100 rounded-xl bg-blue-50 p-4">
              <p className="text-xs font-semibold text-blue-700 mb-2">
                Xem trước — {preview.length} ghế · {gen.seatClass} · {formatCurrency(gen.price)}/ghế
              </p>
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                {preview.map((s) => (
                  <span
                    key={s.seatCode}
                    className="bg-blue-200/80 text-blue-800 text-xs px-2 py-1 rounded-lg font-mono font-bold"
                  >
                    {s.seatCode}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Current seat map */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-50 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-slate-800">Sơ đồ ghế hiện tại</h2>
            <p className="text-xs text-slate-400 mt-0.5">{totalSeats} ghế · {available} trống</p>
          </div>
          {totalSeats > 0 && (
            <div className="text-xs text-slate-400">
              {Math.round((1 - available / totalSeats) * 100)}% đã bán/giữ
            </div>
          )}
        </div>

        <div className="p-5">
          {/* Pitch */}
          <div className="pitch-indicator mx-auto max-w-xl h-7 flex items-center justify-center mb-5">
            <span className="text-white/60 text-xs font-bold tracking-widest uppercase z-10 relative">⚽ Sân cỏ / Pitch ⚽</span>
          </div>

          {loadingSeats ? (
            <LoadingSpinner message="Đang tải sơ đồ ghế..." />
          ) : (
            <SeatMap seats={seats} selectedSeatIds={[]} readonly />
          )}
        </div>
      </div>
    </div>
  );
}
