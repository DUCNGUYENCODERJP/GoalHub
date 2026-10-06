import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getMatches, createMatch, updateMatch, deleteMatch } from '../../api/matchApi';
import LoadingSpinner from '../../components/LoadingSpinner';
import { formatDate, formatCurrency } from '../../utils/formatCurrency';

const EMPTY_FORM = {
  homeTeam: '', awayTeam: '', matchDate: '', venue: '',
  totalSeats: '', ticketPrice: '', status: 'UPCOMING',
};

const STATUS_CONFIG = {
  UPCOMING:  { label: 'Sắp diễn ra', cls: 'bg-blue-50 text-blue-700 border-blue-100' },
  ONGOING:   { label: 'Đang diễn ra', cls: 'bg-green-50 text-green-700 border-green-100' },
  COMPLETED: { label: 'Đã kết thúc', cls: 'bg-slate-100 text-slate-600 border-slate-200' },
  CANCELLED: { label: 'Đã huỷ', cls: 'bg-red-50 text-red-600 border-red-100' },
};

export default function ManageMatchesPage() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  function loadMatches() {
    setLoading(true);
    getMatches({ page: 0, size: 50 })
      .then((d) => setMatches(d.content ?? []))
      .catch(() => toast.error('Không thể tải danh sách trận đấu'))
      .finally(() => setLoading(false));
  }

  useEffect(loadMatches, []);

  function set(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  function openCreate() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowForm(true);
  }

  function openEdit(match) {
    setForm({
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      matchDate: match.matchDate?.slice(0, 16) ?? '',
      venue: match.venue,
      totalSeats: match.totalSeats,
      ticketPrice: match.ticketPrice,
      status: match.status,
    });
    setEditingId(match.id);
    setShowForm(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        totalSeats: Number(form.totalSeats),
        ticketPrice: Number(form.ticketPrice),
      };
      if (editingId) {
        await updateMatch(editingId, payload);
        toast.success('✅ Đã cập nhật trận đấu');
      } else {
        await createMatch(payload);
        toast.success('✅ Đã tạo trận đấu mới');
      }
      setShowForm(false);
      loadMatches();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Thao tác thất bại');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id, name) {
    if (!window.confirm(`Xoá trận "${name}"?`)) return;
    try {
      await deleteMatch(id);
      toast.success('Đã xoá trận đấu');
      loadMatches();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Xoá thất bại');
    }
  }

  const filtered = matches.filter(m => {
    const q = search.toLowerCase();
    const matchesSearch = !q || m.homeTeam.toLowerCase().includes(q) || m.awayTeam.toLowerCase().includes(q) || m.venue?.toLowerCase().includes(q);
    const matchesStatus = !filterStatus || m.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: matches.length,
    upcoming: matches.filter(m => m.status === 'UPCOMING').length,
    ongoing: matches.filter(m => m.status === 'ONGOING').length,
    completed: matches.filter(m => m.status === 'COMPLETED').length,
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-400 mb-1">
            <Link to="/" className="hover:text-blue-600 transition-colors">Trang chủ</Link>
            <span>/</span>
            <span className="text-slate-600">Quản lý trận đấu</span>
          </div>
          <h1 className="text-2xl font-black text-slate-800" style={{ fontFamily: "'Outfit', sans-serif" }}>
            🛠 Quản lý trận đấu
          </h1>
          <p className="text-slate-400 text-sm mt-1">Tạo, chỉnh sửa và quản lý toàn bộ lịch thi đấu</p>
        </div>
        <button
          id="btn-create-match"
          onClick={openCreate}
          className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-bold px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-blue-600/25 hover:shadow-xl hover:-translate-y-0.5 shrink-0"
        >
          + Tạo trận mới
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Tổng trận', value: stats.total, icon: '⚽', color: 'text-slate-700' },
          { label: 'Sắp diễn ra', value: stats.upcoming, icon: '📅', color: 'text-blue-700' },
          { label: 'Đang diễn ra', value: stats.ongoing, icon: '🔴', color: 'text-green-700' },
          { label: 'Đã kết thúc', value: stats.completed, icon: '✅', color: 'text-slate-500' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <div className="flex items-center gap-2 mb-1">
              <span>{s.icon}</span>
              <span className="text-xs text-slate-400 font-medium">{s.label}</span>
            </div>
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <input
          type="text"
          placeholder="🔍 Tìm kiếm đội, sân vận động..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-400 focus:ring-3 focus:ring-blue-100 transition-all"
        />
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-400 focus:ring-3 focus:ring-blue-100 transition-all bg-white text-slate-700"
        >
          <option value="">Tất cả trạng thái</option>
          {Object.entries(STATUS_CONFIG).map(([val, conf]) => (
            <option key={val} value={val}>{conf.label}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <LoadingSpinner message="Đang tải danh sách trận..." />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {['ID', 'Trận đấu', 'Thời gian', 'Sân vận động', 'Ghế trống', 'Giá vé', 'Trạng thái', 'Thao tác'].map(h => (
                    <th key={h} className="px-4 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-slate-400">
                      <div className="text-3xl mb-2">🏟</div>
                      <p>Không tìm thấy trận đấu nào</p>
                    </td>
                  </tr>
                ) : filtered.map((m) => {
                  const conf = STATUS_CONFIG[m.status] || STATUS_CONFIG.UPCOMING;
                  return (
                    <tr key={m.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-4 py-3.5 text-slate-400 text-xs font-mono">#{m.id}</td>
                      <td className="px-4 py-3.5">
                        <p className="font-bold text-slate-800">
                          {m.homeTeam} <span className="text-slate-300 font-normal">vs</span> {m.awayTeam}
                        </p>
                        {m.league && <p className="text-xs text-slate-400 mt-0.5">{m.league}</p>}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-500 whitespace-nowrap">
                        {formatDate(m.matchDate)}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-500 max-w-32 truncate">
                        {m.venue}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`text-xs font-bold ${m.availableSeats === 0 ? 'text-red-500' : 'text-green-600'}`}>
                          {m.availableSeats}
                        </span>
                        <span className="text-slate-300 text-xs"> / {m.totalSeats}</span>
                      </td>
                      <td className="px-4 py-3.5 text-xs font-semibold text-slate-700 whitespace-nowrap">
                        {formatCurrency(m.ticketPrice)}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${conf.cls}`}>
                          {conf.label}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Link
                            to={`/admin/matches/${m.id}/seats`}
                            className="text-xs text-purple-600 hover:text-purple-700 bg-purple-50 hover:bg-purple-100 px-2.5 py-1.5 rounded-lg font-medium transition-colors"
                          >
                            🪑 Ghế
                          </Link>
                          <button
                            onClick={() => openEdit(m)}
                            className="text-xs text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg font-medium transition-colors"
                          >
                            ✏️ Sửa
                          </button>
                          <button
                            onClick={() => handleDelete(m.id, `${m.homeTeam} vs ${m.awayTeam}`)}
                            className="text-xs text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 px-2.5 py-1.5 rounded-lg font-medium transition-colors"
                          >
                            🗑
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Create/Edit Modal ───────────── */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-fade-in-up"
          >
            {/* Modal header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h2 className="font-black text-lg text-slate-800" style={{ fontFamily: "'Outfit', sans-serif" }}>
                {editingId ? '✏️ Chỉnh sửa trận đấu' : '+ Tạo trận đấu mới'}
              </h2>
              <button
                onClick={() => setShowForm(false)}
                className="text-slate-400 hover:text-slate-700 w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center transition-colors text-lg"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Đội nhà', field: 'homeTeam', type: 'text', placeholder: 'Hà Nội FC' },
                  { label: 'Đội khách', field: 'awayTeam', type: 'text', placeholder: 'Viettel FC' },
                ].map(({ label, field, ...rest }) => (
                  <div key={field}>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">{label}</label>
                    <input
                      {...rest} required
                      value={form[field]} onChange={set(field)}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                    />
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Thời gian thi đấu</label>
                <input
                  type="datetime-local" required
                  value={form.matchDate} onChange={set('matchDate')}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Sân vận động</label>
                <input
                  type="text" required
                  value={form.venue} onChange={set('venue')}
                  placeholder="Sân Vận Động Mỹ Đình"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Tổng số ghế</label>
                  <input
                    type="number" min={1} required
                    value={form.totalSeats} onChange={set('totalSeats')}
                    placeholder="200"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Giá vé (VNĐ)</label>
                  <input
                    type="number" min={0} required
                    value={form.ticketPrice} onChange={set('ticketPrice')}
                    placeholder="150000"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Trạng thái</label>
                <select
                  value={form.status} onChange={set('status')}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all bg-white"
                >
                  {Object.entries(STATUS_CONFIG).map(([val, conf]) => (
                    <option key={val} value={val}>{conf.label}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 disabled:from-blue-300 disabled:to-blue-300 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-blue-600/25"
                >
                  {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Đang lưu...
                    </>
                  ) : (
                    editingId ? '✅ Cập nhật' : '+ Tạo trận đấu'
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold py-3 rounded-xl transition-colors"
                >
                  Huỷ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
