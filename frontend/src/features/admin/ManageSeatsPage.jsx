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
    <div style={{ minHeight: '100vh', padding: '32px 0 60px' }}>
      <div className="gt-container">
        {/* Breadcrumb + header */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#666', marginBottom: '8px' }}>
            <Link to="/admin/matches" style={{ color: '#888', textDecoration: 'none' }}>← Quản lý trận đấu</Link>
            <span>/</span>
            <span style={{ color: '#39ff14' }}>Quản lý ghế</span>
          </div>
          <h1 className="gt-section-title">
            {match ? `${match.homeTeam} vs ${match.awayTeam}` : `Trận #${matchId}`}
          </h1>
          <p style={{ color: '#666', fontSize: '13px', marginTop: '6px' }}>Tạo và cấu hình sơ đồ ghế ngồi cho trận đấu</p>
        </div>

        {/* Seat stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '24px' }}>
          {[
            { label: 'Tổng số ghế', value: totalSeats, color: '#fff' },
            { label: 'Ghế trống', value: available, color: '#39ff14' },
            { label: 'Đang giữ', value: reserved, color: '#f5b700' },
            { label: 'Đã bán', value: sold, color: '#e53935' },
          ].map(s => (
            <div key={s.label} className="gt-card-flat" style={{ padding: '16px 20px', background: '#121212' }}>
              <p style={{ fontSize: '11px', color: '#666', marginBottom: '4px', textTransform: 'uppercase' }}>{s.label}</p>
              <p style={{ fontSize: '24px', fontWeight: 900, color: s.color, fontFamily: "'Barlow', sans-serif" }}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Batch generator */}
        <div className="gt-card-flat" style={{ padding: '24px', background: '#121212', marginBottom: '28px' }}>
          <p style={{ fontWeight: 800, color: '#39ff14', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>
            ⚡ Tạo Ghế Hàng Loạt
          </p>
          <p style={{ color: '#666', fontSize: '12px', marginBottom: '18px' }}>
            Tự động sinh mã ghế theo hàng và loại cho khán đài
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '14px', marginBottom: '16px' }}>
            <div>
              <label style={{ fontSize: '12px', color: '#888', display: 'block', marginBottom: '6px' }}>Prefix hàng (A, B, VIP...)</label>
              <input className="gt-input" value={gen.prefix} onChange={setG('prefix')} placeholder="A" />
            </div>
            <div>
              <label style={{ fontSize: '12px', color: '#888', display: 'block', marginBottom: '6px' }}>Số bắt đầu</label>
              <input type="number" className="gt-input" min={1} value={gen.start} onChange={setG('start')} />
            </div>
            <div>
              <label style={{ fontSize: '12px', color: '#888', display: 'block', marginBottom: '6px' }}>Số lượng ghế</label>
              <input type="number" className="gt-input" min={1} max={500} value={gen.count} onChange={setG('count')} />
            </div>
            <div>
              <label style={{ fontSize: '12px', color: '#888', display: 'block', marginBottom: '6px' }}>Giá vé (VNĐ)</label>
              <input type="number" className="gt-input" min={0} step={5000} value={gen.price} onChange={setG('price')} />
            </div>
            <div>
              <label style={{ fontSize: '12px', color: '#888', display: 'block', marginBottom: '6px' }}>Hạng ghế</label>
              <select className="gt-input" value={gen.seatClass} onChange={setG('seatClass')}>
                <option value="STANDARD">Khán Đài (STANDARD)</option>
                <option value="VIP">VIP</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <button onClick={handlePreview} className="gt-btn-outline" style={{ fontSize: '13px' }}>
              👁 Xem Trước ({gen.count} ghế)
            </button>
            <button
              onClick={handleCreate}
              disabled={creating || preview.length === 0}
              className="gt-btn-primary"
              style={{ fontSize: '13px' }}
            >
              {creating ? 'Đang tạo...' : `+ Thêm ${preview.length > 0 ? preview.length : ''} Ghế`}
            </button>
          </div>

          {/* Preview list */}
          {preview.length > 0 && (
            <div style={{ marginTop: '16px', background: '#181818', borderRadius: '10px', padding: '12px 16px' }}>
              <p style={{ fontSize: '11px', color: '#888', marginBottom: '8px' }}>Danh sách ghế sẽ tạo:</p>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {preview.map(p => (
                  <span key={p.seatCode} style={{ background: '#222', border: '1px solid #333', color: '#39ff14', fontSize: '11px', padding: '2px 8px', borderRadius: '4px', fontFamily: 'monospace' }}>
                    {p.seatCode} ({p.seatClass})
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Current seat map */}
        <div className="gt-card-flat" style={{ padding: '24px', background: '#121212' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <p style={{ fontWeight: 800, color: '#fff', fontSize: '14px' }}>Sơ Đồ Ghế Hiện Tại ({seats.length} ghế)</p>
            <button onClick={loadSeats} className="gt-btn-outline" style={{ fontSize: '11px', padding: '5px 12px' }}>
              🔄 Tải lại
            </button>
          </div>

          {loadingSeats ? (
            <LoadingSpinner message="Đang tải sơ đồ ghế..." />
          ) : seats.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#666', padding: '40px 0' }}>Chưa có ghế nào được tạo cho trận này.</p>
          ) : (
            <SeatMap seats={seats} selectedIds={[]} onSeatSelect={() => {}} />
          )}
        </div>
      </div>
    </div>
  );
}
