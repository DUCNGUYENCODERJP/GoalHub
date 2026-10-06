import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getMatchById } from '../../api/matchApi';
import { getSeatsByMatch } from '../../api/seatApi';
import { createOrder } from '../../api/orderApi';
import { useAuth } from '../../context/AuthContext';
import SeatMap from '../../components/SeatMap';
import LoadingSpinner from '../../components/LoadingSpinner';
import { formatDate, formatCurrency } from '../../utils/formatCurrency';

const STATUS_CONFIG = {
  UPCOMING:  { label: 'Sắp diễn ra', cls: 'gh-badge-upcoming' },
  ONGOING:   { label: '🔴 Đang diễn ra', cls: 'gh-badge-ongoing' },
  COMPLETED: { label: 'Đã kết thúc', cls: 'gh-badge-completed' },
  CANCELLED: { label: 'Đã huỷ', cls: 'gh-badge-cancelled' },
};

const TEAM_COLORS = [
  'from-blue-500 to-blue-700', 'from-red-500 to-red-700',
  'from-green-500 to-green-700', 'from-yellow-500 to-orange-600',
  'from-purple-500 to-purple-700', 'from-cyan-500 to-cyan-700',
];
function getTeamColor(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return TEAM_COLORS[Math.abs(hash) % TEAM_COLORS.length];
}
function TeamLogo({ name, size = 'lg' }) {
  const gradient = getTeamColor(name);
  const cls = size === 'lg' ? 'w-20 h-20 text-2xl' : 'w-14 h-14 text-lg';
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div className={`${cls} rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center font-black text-white shadow-xl`}>
      {initials}
    </div>
  );
}

export default function MatchDetailPage() {
  const { id } = useParams();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [match, setMatch] = useState(null);
  const [seats, setSeats] = useState([]);
  const [selectedSeatIds, setSelectedSeatIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([getMatchById(id), getSeatsByMatch(id)])
      .then(([matchData, seatsData]) => {
        setMatch(matchData);
        setSeats(seatsData);
      })
      .catch(() => toast.error('Không thể tải thông tin trận đấu'))
      .finally(() => setLoading(false));
  }, [id]);

  function handleSeatToggle(seatId) {
    setSelectedSeatIds((prev) =>
      prev.includes(seatId) ? prev.filter((s) => s !== seatId) : [...prev, seatId]
    );
  }

  async function handleBook() {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    if (selectedSeatIds.length === 0) {
      toast.error('Vui lòng chọn ít nhất 1 ghế');
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
    <div className="text-center py-24">
      <div className="text-5xl mb-4">🏟</div>
      <p className="text-slate-500 mb-4">Không tìm thấy trận đấu.</p>
      <Link to="/" className="text-blue-600 hover:underline text-sm">← Quay về trang chủ</Link>
    </div>
  );

  const selectedSeats = seats.filter((s) => selectedSeatIds.includes(s.id));
  const totalPrice = selectedSeats.reduce((sum, s) => sum + Number(s.price), 0);
  const statusConf = STATUS_CONFIG[match.status] || STATUS_CONFIG.UPCOMING;
  const isUpcoming = match.status === 'UPCOMING';
  const availableSeats = seats.filter(s => s.status === 'AVAILABLE').length;
  const soldPct = seats.length > 0 ? Math.round((1 - availableSeats / seats.length) * 100) : 0;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <Link to="/" className="hover:text-blue-600 transition-colors">Trang chủ</Link>
        <span>/</span>
        <span className="text-slate-600 font-medium">{match.homeTeam} vs {match.awayTeam}</span>
      </div>

      {/* ── Match Header ─────────────────────────── */}
      <div className="gh-gradient rounded-2xl overflow-hidden shadow-xl">
        <div className="hero-pattern p-6 md:p-8">
          {/* Status + league */}
          <div className="flex items-center gap-3 mb-6">
            <span className={`text-xs font-bold px-3 py-1.5 rounded-full border ${statusConf.cls}`}>
              {statusConf.label}
            </span>
            {match.league && (
              <span className="text-slate-400 text-xs">• {match.league}</span>
            )}
          </div>

          {/* Teams vs */}
          <div className="flex items-center justify-between gap-4 md:gap-8 mb-6">
            <div className="flex flex-col items-center gap-3 flex-1 text-center">
              <TeamLogo name={match.homeTeam} />
              <div>
                <p className="text-white font-black text-lg md:text-xl leading-tight">{match.homeTeam}</p>
                <p className="text-slate-400 text-xs mt-1">Chủ nhà</p>
              </div>
            </div>

            <div className="flex flex-col items-center gap-2">
              <span
                className="text-4xl md:text-5xl font-black text-white/20"
                style={{ fontFamily: "'Outfit', sans-serif" }}
              >
                VS
              </span>
              <div className="flex items-center gap-1">
                {[1,2,3].map(i => (
                  <div key={i} className="w-1 h-1 rounded-full bg-white/30" />
                ))}
              </div>
            </div>

            <div className="flex flex-col items-center gap-3 flex-1 text-center">
              <TeamLogo name={match.awayTeam} />
              <div>
                <p className="text-white font-black text-lg md:text-xl leading-tight">{match.awayTeam}</p>
                <p className="text-slate-400 text-xs mt-1">Khách</p>
              </div>
            </div>
          </div>

          {/* Match info chips */}
          <div className="flex flex-wrap gap-3 justify-center">
            {[
              { icon: '📅', text: formatDate(match.matchDate) },
              { icon: '📍', text: match.venue },
              { icon: '🎟', text: `${availableSeats} ghế trống / ${seats.length}` },
            ].map(item => (
              <div key={item.text} className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-lg px-3 py-2 flex items-center gap-2 text-xs text-white/80">
                <span>{item.icon}</span>
                <span>{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Availability bar */}
        {isUpcoming && seats.length > 0 && (
          <div className="bg-[#0a0f1e]/80 px-6 py-3 flex items-center gap-3">
            <span className="text-xs text-slate-400 shrink-0">Tình trạng vé</span>
            <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-1000 ${
                  soldPct >= 90 ? 'bg-red-400' : soldPct >= 60 ? 'bg-orange-400' : 'bg-green-400'
                }`}
                style={{ width: `${soldPct}%` }}
              />
            </div>
            <span className={`text-xs font-bold shrink-0 ${
              soldPct >= 90 ? 'text-red-400' : soldPct >= 60 ? 'text-orange-400' : 'text-green-400'
            }`}>
              {soldPct}% đã bán
            </span>
          </div>
        )}
      </div>

      {/* ── Seat Map ─────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {/* Pitch indicator */}
        <div className="pitch-indicator mx-6 mt-6 h-8 flex items-center justify-center">
          <span className="text-white/60 text-xs font-bold tracking-widest uppercase z-10 relative">
            ⚽ Sân cỏ / Pitch ⚽
          </span>
        </div>

        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-800">Sơ đồ ghế ngồi</h2>
            {!isAuthenticated && (
              <span className="text-xs text-orange-600 bg-orange-50 border border-orange-100 px-3 py-1.5 rounded-full">
                🔒 Đăng nhập để chọn ghế
              </span>
            )}
          </div>
          <SeatMap
            seats={seats}
            selectedSeatIds={selectedSeatIds}
            onSeatToggle={handleSeatToggle}
            readonly={!isAuthenticated || !isUpcoming}
          />
        </div>
      </div>

      {/* ── Booking Panel ─────────────────────────── */}
      <div className={`bg-white rounded-2xl border shadow-lg overflow-hidden sticky bottom-4 transition-all ${
        selectedSeatIds.length > 0 ? 'border-blue-200 shadow-blue-600/10' : 'border-slate-100'
      }`}>
        {isAuthenticated ? (
          <div className="p-5">
            {selectedSeatIds.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-4">
                {selectedSeats.map(seat => (
                  <div key={seat.id} className="flex items-center gap-1.5 bg-blue-50 border border-blue-100 text-blue-700 text-xs font-mono font-bold px-2.5 py-1.5 rounded-lg">
                    <span className={`w-2 h-2 rounded-full ${seat.seatClass === 'VIP' ? 'bg-yellow-500' : 'bg-blue-500'}`} />
                    {seat.seatCode}
                    <button
                      onClick={() => handleSeatToggle(seat.id)}
                      className="ml-1 text-blue-400 hover:text-blue-700 leading-none"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                {selectedSeatIds.length === 0 ? (
                  <p className="text-slate-400 text-sm">Chọn ghế ngồi trên sơ đồ để đặt vé</p>
                ) : (
                  <>
                    <p className="text-slate-500 text-sm">
                      {selectedSeatIds.length} ghế đã chọn
                    </p>
                    <p className="text-2xl font-black text-blue-700 mt-0.5">
                      {formatCurrency(totalPrice)}
                    </p>
                  </>
                )}
              </div>

              <button
                id="btn-book-ticket"
                onClick={handleBook}
                disabled={booking || selectedSeatIds.length === 0 || !isUpcoming}
                className={`flex items-center gap-2 font-bold px-8 py-3.5 rounded-xl transition-all ${
                  selectedSeatIds.length > 0 && isUpcoming
                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white shadow-lg shadow-blue-600/30 hover:shadow-xl hover:-translate-y-0.5'
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                }`}
              >
                {booking ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Đang đặt vé...
                  </>
                ) : (
                  '🎟 Đặt vé ngay'
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-50 to-blue-50">
            <div>
              <p className="font-semibold text-slate-700">Sẵn sàng đặt vé?</p>
              <p className="text-slate-400 text-sm mt-0.5">Đăng nhập để chọn ghế và hoàn tất đặt vé</p>
            </div>
            <Link
              to="/login"
              className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-bold px-6 py-3 rounded-xl transition-all shadow-lg shadow-blue-600/25 hover:-translate-y-0.5"
            >
              Đăng nhập để đặt vé →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
