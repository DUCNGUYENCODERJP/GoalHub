import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getOrderById } from '../../api/orderApi';
import SeatMap from '../../components/SeatMap';
import LoadingSpinner from '../../components/LoadingSpinner';
import { formatDate, formatCurrency } from '../../utils/formatCurrency';

const STATUS_CONFIG = {
  PENDING:   {
    label: 'Chờ thanh toán',
    cls: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    icon: '⏳',
    bannerCls: 'bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200 text-yellow-800',
    bannerIcon: '⏳',
    bannerMsg: 'Đơn hàng đang chờ xử lý. Ghế đã được tạm giữ cho bạn — vui lòng hoàn tất thanh toán sớm.',
  },
  PAID: {
    label: 'Đã thanh toán',
    cls: 'bg-green-50 text-green-700 border-green-200',
    icon: '✅',
    bannerCls: 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 text-green-800',
    bannerIcon: '🎉',
    bannerMsg: 'Đơn hàng đã được xác nhận! Chúc bạn có buổi xem bóng đá tuyệt vời.',
  },
  CANCELLED: {
    label: 'Đã huỷ',
    cls: 'bg-red-50 text-red-600 border-red-200',
    icon: '❌',
    bannerCls: 'bg-gradient-to-r from-red-50 to-rose-50 border-red-200 text-red-700',
    bannerIcon: '❌',
    bannerMsg: 'Đơn hàng này đã bị huỷ. Ghế đã được giải phóng.',
  },
};

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

export default function OrderDetailPage() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getOrderById(id)
      .then(setOrder)
      .catch((err) => {
        const msg = err.response?.status === 403
          ? 'Bạn không có quyền xem đơn hàng này.'
          : 'Không tìm thấy đơn hàng.';
        toast.error(msg);
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <LoadingSpinner message="Đang tải đơn hàng..." />;
  if (!order) return (
    <div className="text-center py-24">
      <div className="text-5xl mb-4">🎟</div>
      <p className="text-slate-500 mb-4">Không tìm thấy đơn hàng.</p>
      <Link to="/orders/my" className="text-blue-600 hover:underline text-sm">← Về danh sách đơn hàng</Link>
    </div>
  );

  const conf = STATUS_CONFIG[order.status] || STATUS_CONFIG.PENDING;
  const homeGrad = getTeamColor(order.homeTeam);
  const awayGrad = getTeamColor(order.awayTeam);
  const homeInit = order.homeTeam?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const awayInit = order.awayTeam?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  const vipItems = order.items.filter(i => i.seatClass === 'VIP');
  const stdItems = order.items.filter(i => i.seatClass !== 'VIP');

  const seatSnapshots = order.items.map((item) => ({
    id: item.seatId,
    seatCode: item.seatCode,
    seatClass: item.seatClass,
    price: item.priceAtBooking,
    status: item.seatStatus,
  }));

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <Link to="/orders/my" className="hover:text-blue-600 transition-colors flex items-center gap-1">
          ← Đơn hàng của tôi
        </Link>
        <span>/</span>
        <span className="text-slate-600 font-medium">Đơn #{order.id}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800" style={{ fontFamily: "'Outfit', sans-serif" }}>
            Chi tiết đơn hàng
          </h1>
          <p className="text-slate-400 text-sm mt-1">Đặt lúc {formatDate(order.createdAt)}</p>
        </div>
        <span className={`flex items-center gap-1.5 text-sm font-bold px-4 py-2 rounded-full border ${conf.cls}`}>
          {conf.icon} {conf.label}
        </span>
      </div>

      {/* Status banner */}
      <div className={`flex items-start gap-3 border rounded-2xl p-4 text-sm ${conf.bannerCls}`}>
        <span className="text-xl shrink-0">{conf.bannerIcon}</span>
        <p>{conf.bannerMsg}</p>
      </div>

      {/* Match info card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="gh-gradient p-6">
          <p className="text-slate-400 text-xs uppercase tracking-widest font-semibold mb-4">Thông tin trận đấu</p>
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col items-center gap-2 flex-1 text-center">
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${homeGrad} flex items-center justify-center font-black text-white text-lg shadow-xl`}>
                {homeInit}
              </div>
              <p className="text-white font-bold text-sm">{order.homeTeam}</p>
              <p className="text-slate-500 text-xs">Chủ nhà</p>
            </div>
            <div className="text-center">
              <p className="text-white/30 font-black text-3xl">VS</p>
            </div>
            <div className="flex flex-col items-center gap-2 flex-1 text-center">
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${awayGrad} flex items-center justify-center font-black text-white text-lg shadow-xl`}>
                {awayInit}
              </div>
              <p className="text-white font-bold text-sm">{order.awayTeam}</p>
              <p className="text-slate-500 text-xs">Khách</p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-white/10">
            <div className="flex flex-wrap gap-3 justify-center">
              <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-lg px-3 py-2 text-xs text-white/80 flex items-center gap-2">
                <span>📅</span> {formatDate(order.matchDate)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Order items */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-50">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-slate-800">Ghế đã đặt</h2>
            <span className="text-xs bg-blue-50 text-blue-700 border border-blue-100 px-2.5 py-1 rounded-full font-semibold">
              {order.items.length} ghế
            </span>
          </div>
        </div>

        {/* Seat class breakdown */}
        {(vipItems.length > 0 || stdItems.length > 0) && (
          <div className="grid grid-cols-2 gap-px bg-slate-50">
            {vipItems.length > 0 && (
              <div className="bg-white p-4 text-center">
                <div className="text-lg mb-1">🏆</div>
                <p className="text-xl font-black text-yellow-600">{vipItems.length}</p>
                <p className="text-xs text-slate-400">Ghế VIP</p>
                <p className="text-xs font-semibold text-slate-600 mt-0.5">
                  {formatCurrency(vipItems.reduce((s, i) => s + i.priceAtBooking, 0))}
                </p>
              </div>
            )}
            {stdItems.length > 0 && (
              <div className="bg-white p-4 text-center">
                <div className="text-lg mb-1">🪑</div>
                <p className="text-xl font-black text-blue-600">{stdItems.length}</p>
                <p className="text-xs text-slate-400">Ghế Thường</p>
                <p className="text-xs font-semibold text-slate-600 mt-0.5">
                  {formatCurrency(stdItems.reduce((s, i) => s + i.priceAtBooking, 0))}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Seat table */}
        <div className="p-5">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-400 border-b border-slate-50">
                  <th className="pb-3 font-semibold">Mã ghế</th>
                  <th className="pb-3 font-semibold">Hạng</th>
                  <th className="pb-3 font-semibold">Trạng thái</th>
                  <th className="pb-3 font-semibold text-right">Giá</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {order.items.map((item) => (
                  <tr key={item.orderItemId} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-2.5 font-mono font-bold text-slate-700">{item.seatCode}</td>
                    <td className="py-2.5">
                      <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg ${
                        item.seatClass === 'VIP'
                          ? 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                          : 'bg-blue-50 text-blue-700 border border-blue-100'
                      }`}>
                        {item.seatClass === 'VIP' ? '🏆' : '🪑'} {item.seatClass}
                      </span>
                    </td>
                    <td className="py-2.5">
                      <span className="text-xs text-slate-400 bg-slate-50 px-2 py-1 rounded-lg">
                        {item.seatStatus === 'RESERVED' ? '⏳ Đã giữ' : item.seatStatus === 'SOLD' ? '✅ Đã bán' : item.seatStatus}
                      </span>
                    </td>
                    <td className="py-2.5 text-right font-bold text-slate-700">
                      {formatCurrency(item.priceAtBooking)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Seat map readonly */}
          <div className="mt-5 pt-5 border-t border-slate-50">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Sơ đồ ghế đã đặt</p>
            <SeatMap
              seats={seatSnapshots}
              selectedSeatIds={seatSnapshots.map(s => s.id)}
              readonly
            />
          </div>
        </div>
      </div>

      {/* Total */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-5 flex items-center justify-between shadow-xl shadow-blue-600/20">
        <div>
          <p className="text-blue-200 text-sm">Tổng thanh toán</p>
          <p className="text-white font-bold text-sm mt-0.5">{order.items.length} ghế</p>
        </div>
        <p className="text-3xl font-black text-white">{formatCurrency(order.totalAmount)}</p>
      </div>

      {/* Payment CTA (PENDING only) */}
      {order.status === 'PENDING' && (
        <div className="bg-white border border-slate-100 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="font-bold text-slate-800">Hoàn tất thanh toán</p>
            <p className="text-sm text-slate-400 mt-0.5">Tích hợp thanh toán sẽ được thêm trong phiên bản tiếp theo</p>
          </div>
          <button
            disabled
            className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold px-6 py-3 rounded-xl opacity-50 cursor-not-allowed"
          >
            💳 Thanh toán ngay
          </button>
        </div>
      )}

      <Link
        to="/orders/my"
        className="flex items-center justify-center gap-2 text-sm text-slate-400 hover:text-blue-600 transition-colors py-2"
      >
        ← Về danh sách đơn hàng
      </Link>
    </div>
  );
}
