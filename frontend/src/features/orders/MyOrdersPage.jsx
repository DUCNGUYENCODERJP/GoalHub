import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getMyOrders } from '../../api/orderApi';
import LoadingSpinner from '../../components/LoadingSpinner';
import { formatDate, formatCurrency } from '../../utils/formatCurrency';

const STATUS_CONFIG = {
  PENDING:   { label: 'Chờ thanh toán', cls: 'bg-yellow-50 text-yellow-700 border-yellow-200', dot: 'bg-yellow-400', icon: '⏳' },
  PAID:      { label: 'Đã thanh toán',  cls: 'bg-green-50 text-green-700 border-green-200',   dot: 'bg-green-400',  icon: '✅' },
  CANCELLED: { label: 'Đã huỷ',         cls: 'bg-red-50 text-red-600 border-red-200',         dot: 'bg-red-400',    icon: '❌' },
};

const SUMMARY_CARDS = [
  { status: 'PAID',      label: 'Đã hoàn thành', icon: '✅', color: 'from-green-500 to-emerald-600' },
  { status: 'PENDING',   label: 'Chờ thanh toán', icon: '⏳', color: 'from-yellow-500 to-orange-500' },
  { status: 'CANCELLED', label: 'Đã huỷ',          icon: '❌', color: 'from-red-500 to-rose-600' },
];

const TEAM_COLORS = [
  'from-blue-500 to-blue-700', 'from-red-500 to-red-700',
  'from-green-500 to-green-700', 'from-yellow-500 to-orange-600',
  'from-purple-500 to-purple-700', 'from-cyan-500 to-cyan-700',
];
function getTeamColor(name = '') {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return TEAM_COLORS[Math.abs(hash) % TEAM_COLORS.length];
}

export default function MyOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getMyOrders({ page, size: 10 })
      .then((data) => {
        setOrders(data.content ?? []);
        setTotalPages(data.totalPages ?? 0);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page]);

  const paidCount     = orders.filter(o => o.status === 'PAID').length;
  const pendingCount  = orders.filter(o => o.status === 'PENDING').length;
  const cancelledCount = orders.filter(o => o.status === 'CANCELLED').length;
  const totalSpent    = orders.filter(o => o.status === 'PAID').reduce((s, o) => s + o.totalAmount, 0);

  const counts = { PAID: paidCount, PENDING: pendingCount, CANCELLED: cancelledCount };

  if (loading) return <LoadingSpinner message="Đang tải đơn hàng..." />;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-black text-slate-800" style={{ fontFamily: "'Outfit', sans-serif" }}>
          Đơn hàng của tôi
        </h1>
        <p className="text-slate-400 text-sm mt-1">Theo dõi và quản lý tất cả vé bóng đá của bạn</p>
      </div>

      {/* Summary stats */}
      {orders.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 col-span-2 sm:col-span-1">
            <p className="text-xs text-slate-400 font-medium mb-1">Tổng chi tiêu</p>
            <p className="text-xl font-black text-blue-700">{formatCurrency(totalSpent)}</p>
          </div>
          {SUMMARY_CARDS.map(({ status, label, icon, color }) => (
            <div key={status} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
              <div className={`inline-flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br ${color} text-sm mb-2`}>
                {icon}
              </div>
              <p className="text-xl font-black text-slate-800">{counts[status]}</p>
              <p className="text-xs text-slate-400 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      )}

      {orders.length === 0 ? (
        <div className="text-center py-24">
          <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center text-4xl mx-auto mb-4">🎟</div>
          <h3 className="text-xl font-bold text-slate-700 mb-2">Chưa có đơn hàng nào</h3>
          <p className="text-slate-400 mb-6">Đặt vé trận đấu yêu thích để bắt đầu!</p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-bold px-6 py-3 rounded-xl transition-all shadow-lg shadow-blue-600/25"
          >
            ⚽ Xem trận đấu ngay
          </Link>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {orders.map((order, i) => {
              const conf = STATUS_CONFIG[order.status] || STATUS_CONFIG.PENDING;
              const homeGrad = getTeamColor(order.homeTeam);
              const awayGrad = getTeamColor(order.awayTeam);
              const homeInit = order.homeTeam?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'HN';
              const awayInit = order.awayTeam?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'KH';

              return (
                <Link
                  key={order.id}
                  to={`/orders/${order.id}`}
                  id={`order-${order.id}`}
                  className="gh-card flex items-center gap-4 p-4 sm:p-5 !rounded-2xl animate-fade-in-up"
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  {/* Team mini display */}
                  <div className="hidden sm:flex items-center gap-2 w-28 shrink-0">
                    <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${homeGrad} flex items-center justify-center font-black text-white text-[10px] shadow`}>
                      {homeInit}
                    </div>
                    <span className="text-slate-300 text-xs font-bold">vs</span>
                    <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${awayGrad} flex items-center justify-center font-black text-white text-[10px] shadow`}>
                      {awayInit}
                    </div>
                  </div>

                  {/* Main info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-800 text-sm leading-tight truncate">
                      {order.homeTeam} <span className="text-slate-400 font-normal">vs</span> {order.awayTeam}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">📅 {formatDate(order.matchDate)}</p>
                    <p className="text-xs text-slate-300 mt-0.5">Đơn #{order.id} · {formatDate(order.createdAt)}</p>
                  </div>

                  {/* Status + price */}
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full border flex items-center gap-1 ${conf.cls}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${conf.dot}`} />
                      {conf.label}
                    </span>
                    <p className="text-sm font-black text-blue-700">{formatCurrency(order.totalAmount)}</p>
                    <p className="text-xs text-slate-300">→</p>
                  </div>
                </Link>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-3 mt-8">
              <button
                disabled={page === 0}
                onClick={() => setPage(page - 1)}
                className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                ← Trước
              </button>
              <span className="text-sm text-slate-500">Trang {page + 1} / {totalPages}</span>
              <button
                disabled={page >= totalPages - 1}
                onClick={() => setPage(page + 1)}
                className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Sau →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
