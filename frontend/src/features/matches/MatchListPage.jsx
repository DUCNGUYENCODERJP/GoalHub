import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getMatches } from '../../api/matchApi';
import { SkeletonCard } from '../../components/LoadingSpinner';
import { formatDate, formatCurrency } from '../../utils/formatCurrency';

const STATUS_OPTIONS = [
  { value: '', label: 'Tất cả', icon: '🏆' },
  { value: 'UPCOMING', label: 'Sắp diễn ra', icon: '📅' },
  { value: 'ONGOING', label: 'Đang diễn ra', icon: '🔴' },
  { value: 'COMPLETED', label: 'Đã kết thúc', icon: '✅' },
  { value: 'CANCELLED', label: 'Đã huỷ', icon: '❌' },
];

const STATUS_CONFIG = {
  UPCOMING:  { label: 'Sắp diễn ra', cls: 'gh-badge-upcoming' },
  ONGOING:   { label: 'Đang diễn ra', cls: 'gh-badge-ongoing' },
  COMPLETED: { label: 'Đã kết thúc',  cls: 'gh-badge-completed' },
  CANCELLED: { label: 'Đã huỷ',       cls: 'gh-badge-cancelled' },
};

const TEAM_COLORS = [
  'from-blue-500 to-blue-700',
  'from-red-500 to-red-700',
  'from-green-500 to-green-700',
  'from-yellow-500 to-orange-600',
  'from-purple-500 to-purple-700',
  'from-cyan-500 to-cyan-700',
  'from-pink-500 to-pink-700',
  'from-indigo-500 to-indigo-700',
];

function getTeamColor(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return TEAM_COLORS[Math.abs(hash) % TEAM_COLORS.length];
}

function TeamAvatar({ name, size = 'md' }) {
  const gradient = getTeamColor(name);
  const sizeClass = size === 'sm'
    ? 'w-10 h-10 text-sm'
    : 'w-12 h-12 text-base';
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div className={`${sizeClass} rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center font-black text-white shadow-lg flex-shrink-0`}>
      {initials}
    </div>
  );
}

export default function MatchListPage() {
  const [matches, setMatches] = useState([]);
  const [status, setStatus] = useState('UPCOMING');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, upcoming: 0, ongoing: 0 });

  // Load stats once
  useEffect(() => {
    getMatches({ page: 0, size: 100 }).then(data => {
      const all = data.content;
      setStats({
        total: data.totalElements,
        upcoming: all.filter(m => m.status === 'UPCOMING').length,
        ongoing: all.filter(m => m.status === 'ONGOING').length,
      });
    }).catch(console.error);
  }, []);

  useEffect(() => {
    setLoading(true);
    getMatches({ status: status || undefined, page, size: 9 })
      .then((data) => {
        setMatches(data.content ?? []);
        setTotalPages(data.totalPages ?? 0);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [status, page]);

  function handleStatusChange(s) {
    setStatus(s);
    setPage(0);
  }

  return (
    <div className="min-h-screen">
      {/* ── Hero Banner ───────────────────────── */}
      <div className="gh-gradient hero-pattern relative overflow-hidden">
        {/* Decorative balls */}
        <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-blue-600/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-48 h-48 rounded-full bg-green-500/10 blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 md:py-16">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-green-400/10 border border-green-400/20 text-green-400 text-xs font-semibold px-3 py-1.5 rounded-full mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              Nền tảng đặt vé bóng đá #1 Việt Nam
            </div>

            <h1
              className="text-3xl md:text-5xl font-black text-white mb-4 leading-tight"
              style={{ fontFamily: "'Outfit', sans-serif" }}
            >
              Đặt vé bóng đá{' '}
              <span className="gh-gradient-text">nhanh chóng</span>{' '}
              & an toàn
            </h1>
            <p className="text-slate-400 text-base md:text-lg mb-8">
              Hàng trăm trận đấu hàng tuần. Chọn chỗ ngồi yêu thích, đặt vé trong vòng 60 giây.
            </p>

            {/* Stats */}
            <div className="flex flex-wrap gap-4">
              {[
                { label: 'Trận đấu', value: stats.total, icon: '⚽' },
                { label: 'Sắp diễn ra', value: stats.upcoming, icon: '📅' },
                { label: 'Đang diễn ra', value: stats.ongoing, icon: '🔴' },
              ].map(s => (
                <div key={s.label} className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl px-4 py-3 flex items-center gap-3">
                  <span className="text-2xl">{s.icon}</span>
                  <div>
                    <p className="text-white font-bold text-xl leading-none">{s.value}</p>
                    <p className="text-slate-300 text-xs mt-0.5">{s.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Content ──────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Filter bar */}
        <div className="flex gap-2 mb-8 flex-wrap">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              id={`filter-${opt.value || 'all'}`}
              onClick={() => handleStatusChange(opt.value)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all border ${
                status === opt.value
                  ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-600/25'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-600 hover:shadow-sm'
              }`}
            >
              <span>{opt.icon}</span>
              {opt.label}
            </button>
          ))}
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : matches.length === 0 ? (
          <div className="text-center py-24">
            <div className="text-6xl mb-4">🏟</div>
            <h3 className="text-xl font-bold text-slate-700 mb-2">Không có trận đấu nào</h3>
            <p className="text-slate-400">Thử chọn bộ lọc khác hoặc quay lại sau.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {matches.map((match, i) => (
                <MatchCard key={match.id} match={match} index={i} />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-3 mt-10">
                <button
                  disabled={page === 0}
                  onClick={() => setPage(page - 1)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  ← Trước
                </button>
                <div className="flex items-center gap-1.5">
                  {Array.from({ length: totalPages }).map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setPage(i)}
                      className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                        page === i
                          ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
                <button
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage(page + 1)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Sau →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function MatchCard({ match, index }) {
  const statusConf = STATUS_CONFIG[match.status] || STATUS_CONFIG.UPCOMING;
  const isUpcoming = match.status === 'UPCOMING';
  const canBook = isUpcoming && match.availableSeats > 0;
  const isSoldOut = isUpcoming && match.availableSeats === 0;
  const soldPct = match.totalSeats > 0
    ? Math.round((1 - match.availableSeats / match.totalSeats) * 100)
    : 100;

  return (
    <div
      className="gh-card flex flex-col overflow-hidden animate-fade-in-up"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {/* Top accent strip */}
      <div
        className={`h-1 w-full ${
          match.status === 'ONGOING'
            ? 'bg-gradient-to-r from-green-400 to-emerald-500 animate-pulse'
            : match.status === 'UPCOMING'
            ? 'bg-gradient-to-r from-blue-500 to-cyan-400'
            : 'bg-slate-200'
        }`}
      />

      <div className="p-5 flex flex-col gap-4 flex-1">
        {/* Header row */}
        <div className="flex items-center justify-between">
          <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${statusConf.cls}`}>
            {match.status === 'ONGOING' && '🔴 '}{statusConf.label}
          </span>
          {match.league && (
            <span className="text-[11px] text-slate-400 font-medium">{match.league}</span>
          )}
        </div>

        {/* Teams */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col items-center gap-1.5 flex-1 text-center">
            <TeamAvatar name={match.homeTeam} />
            <span className="text-sm font-bold text-slate-800 leading-tight">{match.homeTeam}</span>
            <span className="text-[10px] text-slate-400">Chủ nhà</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="text-2xl font-black text-slate-300">VS</span>
            <span className="text-[10px] text-slate-400 font-medium">{new Date(match.matchDate).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}</span>
          </div>
          <div className="flex flex-col items-center gap-1.5 flex-1 text-center">
            <TeamAvatar name={match.awayTeam} />
            <span className="text-sm font-bold text-slate-800 leading-tight">{match.awayTeam}</span>
            <span className="text-[10px] text-slate-400">Khách</span>
          </div>
        </div>

        {/* Meta info */}
        <div className="border-t border-slate-50 pt-3 space-y-1.5">
          <div className="flex items-center gap-2 text-slate-500 text-xs">
            <span>📅</span>
            <span>{formatDate(match.matchDate)}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-500 text-xs">
            <span>📍</span>
            <span className="truncate">{match.venue}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-500 text-xs">
            <span>🎟</span>
            <span>Từ {formatCurrency(match.ticketPrice)}</span>
          </div>
        </div>

        {/* Seat availability bar */}
        {isUpcoming && match.totalSeats > 0 && (
          <div>
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-slate-500">
                {isSoldOut ? '😔 Hết vé' : `${match.availableSeats} ghế trống`}
              </span>
              <span className={`font-semibold ${soldPct >= 90 ? 'text-red-500' : soldPct >= 60 ? 'text-orange-500' : 'text-green-600'}`}>
                {soldPct}% đã bán
              </span>
            </div>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  soldPct >= 90 ? 'bg-red-400' : soldPct >= 60 ? 'bg-orange-400' : 'bg-green-400'
                }`}
                style={{ width: `${soldPct}%` }}
              />
            </div>
          </div>
        )}

        {/* CTA Button */}
        <Link
          to={`/matches/${match.id}`}
          id={`match-${match.id}-cta`}
          className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all mt-auto ${
            canBook
              ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white shadow-lg shadow-blue-600/25 hover:shadow-xl hover:shadow-blue-600/30 hover:-translate-y-0.5'
              : isSoldOut
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed pointer-events-none'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          {canBook ? (
            <>🎟 Đặt vé ngay <span>→</span></>
          ) : isSoldOut ? (
            'Hết vé'
          ) : (
            'Xem chi tiết →'
          )}
        </Link>
      </div>
    </div>
  );
}
