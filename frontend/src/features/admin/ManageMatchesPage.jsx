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
  UPCOMING:  { label: 'Sắp diễn ra', bg: 'rgba(57,255,20,0.1)', color: '#39ff14', border: 'rgba(57,255,20,0.25)' },
  ONGOING:   { label: 'Đang diễn ra', bg: 'rgba(255,76,0,0.1)', color: '#ff4c00', border: 'rgba(255,76,0,0.25)' },
  COMPLETED: { label: 'Đã kết thúc', bg: 'rgba(255,255,255,0.05)', color: '#888', border: 'rgba(255,255,255,0.1)' },
  CANCELLED: { label: 'Đã huỷ', bg: 'rgba(229,57,53,0.1)', color: '#e53935', border: 'rgba(229,57,53,0.25)' },
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
    setEditingId(match.id);
    const localIso = match.matchDate ? match.matchDate.slice(0, 16) : '';
    setForm({
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      matchDate: localIso,
      venue: match.venue,
      totalSeats: String(match.totalSeats),
      ticketPrice: String(match.ticketPrice),
      status: match.status,
    });
    setShowForm(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.homeTeam.trim() || !form.awayTeam.trim()) {
      toast.error('Vui lòng nhập tên 2 đội');
      return;
    }
    if (!form.matchDate) {
      toast.error('Vui lòng chọn ngày giờ thi đấu');
      return;
    }
    if (new Date(form.matchDate) <= new Date() && !editingId) {
      toast.error('Thời gian thi đấu phải ở tương lai');
      return;
    }
    if (!form.venue.trim()) {
      toast.error('Vui lòng nhập sân vận động');
      return;
    }
    if (Number(form.totalSeats) <= 0) {
      toast.error('Tổng số ghế phải lớn hơn 0');
      return;
    }
    if (Number(form.ticketPrice) <= 0) {
      toast.error('Giá vé phải lớn hơn 0');
      return;
    }

    setSaving(true);
    const payload = {
      ...form,
      matchDate: new Date(form.matchDate).toISOString(),
      totalSeats: Number(form.totalSeats),
      ticketPrice: Number(form.ticketPrice),
    };

    try {
      if (editingId) {
        await updateMatch(editingId, payload);
        toast.success('Cập nhật trận đấu thành công!');
      } else {
        await createMatch(payload);
        toast.success('Tạo trận đấu thành công! Các ghế đã được tự động tạo.');
      }
      setShowForm(false);
      loadMatches();
    } catch (err) {
      const msg = err.response?.data?.message || 'Có lỗi xảy ra, vui lòng thử lại.';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id, name) {
    if (!window.confirm(`Bạn có chắc muốn huỷ / xoá trận: ${name}?`)) return;
    try {
      await deleteMatch(id);
      toast.success('Đã huỷ trận đấu thành công');
      loadMatches();
    } catch (err) {
      const msg = err.response?.data?.message || 'Không thể huỷ trận này';
      toast.error(msg);
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
    <div style={{ minHeight: '100vh', padding: '32px 0 60px' }}>
      <div className="gt-container">
        {/* Page header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '28px' }}>
          <div>
            <p className="gt-section-label">// Quản trị hệ thống</p>
            <h1 className="gt-section-title" style={{ marginTop: '6px' }}>QUẢN LÝ TRẬN ĐẤU</h1>
            <p style={{ color: '#666', fontSize: '13px', marginTop: '6px' }}>Tạo, chỉnh sửa và quản lý lịch thi đấu GoalTicket</p>
          </div>
          <button
            id="btn-create-match"
            onClick={openCreate}
            className="gt-btn-primary"
            style={{ padding: '12px 22px', fontSize: '14px' }}
          >
            + Tạo Trận Mới
          </button>
        </div>

        {/* Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '24px' }}>
          {[
            { label: 'Tổng trận đấu', value: stats.total, color: '#fff', icon: '⚽' },
            { label: 'Sắp diễn ra', value: stats.upcoming, color: '#39ff14', icon: '📅' },
            { label: 'Đang diễn ra', value: stats.ongoing, color: '#ff4c00', icon: '🔴' },
            { label: 'Đã hoàn thành', value: stats.completed, color: '#888', icon: '✅' },
          ].map(s => (
            <div key={s.label} className="gt-card-flat" style={{ padding: '16px 20px', background: '#121212' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span>{s.icon}</span>
                <span style={{ fontSize: '12px', color: '#666' }}>{s.label}</span>
              </div>
              <p style={{ fontSize: '24px', fontWeight: 900, color: s.color, fontFamily: "'Barlow', sans-serif" }}>
                {s.value}
              </p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <input
            className="gt-input"
            style={{ maxWidth: '300px' }}
            placeholder="🔍 Tìm kiếm đội, sân..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="gt-input"
            style={{ width: 'auto', minWidth: '160px' }}
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="">Tất cả trạng thái</option>
            <option value="UPCOMING">Sắp diễn ra</option>
            <option value="ONGOING">Đang diễn ra</option>
            <option value="COMPLETED">Đã kết thúc</option>
            <option value="CANCELLED">Đã huỷ</option>
          </select>
        </div>

        {/* Table / List */}
        {loading ? (
          <LoadingSpinner message="Đang tải danh sách trận đấu..." />
        ) : filtered.length === 0 ? (
          <div className="gt-card-flat" style={{ textAlign: 'center', padding: '60px 20px', color: '#666' }}>
            <p>Không có trận đấu nào phù hợp</p>
          </div>
        ) : (
          <div className="gt-card-flat" style={{ padding: '0', overflowX: 'auto', background: '#121212' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '700px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #222', color: '#666', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  <th style={{ padding: '14px 18px' }}>Cặp Đấu</th>
                  <th style={{ padding: '14px 18px' }}>Thời Gian</th>
                  <th style={{ padding: '14px 18px' }}>Sân Vận Động</th>
                  <th style={{ padding: '14px 18px' }}>Giá Vé</th>
                  <th style={{ padding: '14px 18px' }}>Ghế Còn</th>
                  <th style={{ padding: '14px 18px' }}>Trạng Thái</th>
                  <th style={{ padding: '14px 18px', textAlign: 'right' }}>Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(m => {
                  const sc = STATUS_CONFIG[m.status] || STATUS_CONFIG.UPCOMING;
                  return (
                    <tr key={m.id} style={{ borderBottom: '1px solid #1a1a1a', transition: 'background 0.15s' }}>
                      <td style={{ padding: '14px 18px' }}>
                        <span style={{ fontWeight: 800, color: '#fff', fontSize: '14px' }}>{m.homeTeam}</span>
                        <span style={{ color: '#555', fontSize: '12px', margin: '0 6px' }}>vs</span>
                        <span style={{ fontWeight: 800, color: '#fff', fontSize: '14px' }}>{m.awayTeam}</span>
                      </td>
                      <td style={{ padding: '14px 18px', fontSize: '13px', color: '#aaa' }}>
                        {formatDate(m.matchDate)}
                      </td>
                      <td style={{ padding: '14px 18px', fontSize: '13px', color: '#aaa' }}>
                        {m.venue}
                      </td>
                      <td style={{ padding: '14px 18px', fontSize: '13px', color: '#39ff14', fontWeight: 700 }}>
                        {formatCurrency(m.ticketPrice)}
                      </td>
                      <td style={{ padding: '14px 18px', fontSize: '13px', color: '#aaa' }}>
                        {m.availableSeats ?? m.totalSeats} / {m.totalSeats}
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        <span style={{
                          background: sc.bg,
                          color: sc.color,
                          border: `1px solid ${sc.border}`,
                          borderRadius: '4px',
                          padding: '3px 8px',
                          fontSize: '11px',
                          fontWeight: 700,
                        }}>
                          {sc.label}
                        </span>
                      </td>
                      <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '8px' }}>
                          <Link
                            to={`/admin/matches/${m.id}/seats`}
                            className="gt-btn-outline"
                            style={{ fontSize: '11px', padding: '5px 10px' }}
                          >
                            Ghế
                          </Link>
                          <button
                            onClick={() => openEdit(m)}
                            className="gt-btn-outline"
                            style={{ fontSize: '11px', padding: '5px 10px' }}
                          >
                            Sửa
                          </button>
                          <button
                            onClick={() => handleDelete(m.id, `${m.homeTeam} vs ${m.awayTeam}`)}
                            style={{
                              background: 'none',
                              border: '1px solid rgba(229,57,53,0.3)',
                              color: '#e53935',
                              padding: '5px 10px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              cursor: 'pointer',
                            }}
                          >
                            Huỷ
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Create / Edit Modal */}
        {showForm && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.85)',
              backdropFilter: 'blur(8px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
              padding: '20px',
            }}
          >
            <div
              className="gt-card animate-fade-in-up"
              style={{
                background: '#141414',
                border: '1px solid #282828',
                borderRadius: '16px',
                maxWidth: '520px',
                width: '100%',
                padding: '24px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ fontFamily: "'Barlow', sans-serif", fontWeight: 800, fontSize: '18px', color: '#fff' }}>
                  {editingId ? 'Cập Nhật Trận Đấu' : 'Tạo Trận Đấu Mới'}
                </h3>
                <button
                  onClick={() => setShowForm(false)}
                  style={{ background: 'none', border: 'none', color: '#888', fontSize: '20px', cursor: 'pointer' }}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '12px', color: '#888', display: 'block', marginBottom: '6px' }}>Đội Nhà</label>
                    <input className="gt-input" value={form.homeTeam} onChange={set('homeTeam')} placeholder="Hà Nội FC" required />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: '#888', display: 'block', marginBottom: '6px' }}>Đội Khách</label>
                    <input className="gt-input" value={form.awayTeam} onChange={set('awayTeam')} placeholder="TP.HCM FC" required />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '12px', color: '#888', display: 'block', marginBottom: '6px' }}>Thời Gian Thi Đấu</label>
                  <input
                    type="datetime-local"
                    className="gt-input"
                    value={form.matchDate}
                    onChange={set('matchDate')}
                    required
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', color: '#888', display: 'block', marginBottom: '6px' }}>Sân Vận Động</label>
                  <input className="gt-input" value={form.venue} onChange={set('venue')} placeholder="Mỹ Đình" required />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '12px', color: '#888', display: 'block', marginBottom: '6px' }}>Tổng Số Ghế</label>
                    <input
                      type="number"
                      className="gt-input"
                      value={form.totalSeats}
                      onChange={set('totalSeats')}
                      placeholder="100"
                      min="1"
                      required
                      disabled={!!editingId}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: '#888', display: 'block', marginBottom: '6px' }}>Giá Vé Cơ Bản (VNĐ)</label>
                    <input
                      type="number"
                      className="gt-input"
                      value={form.ticketPrice}
                      onChange={set('ticketPrice')}
                      placeholder="150000"
                      min="1000"
                      step="5000"
                      required
                    />
                  </div>
                </div>

                {editingId && (
                  <div>
                    <label style={{ fontSize: '12px', color: '#888', display: 'block', marginBottom: '6px' }}>Trạng Thái</label>
                    <select className="gt-input" value={form.status} onChange={set('status')}>
                      <option value="UPCOMING">Sắp diễn ra</option>
                      <option value="ONGOING">Đang diễn ra</option>
                      <option value="COMPLETED">Đã kết thúc</option>
                      <option value="CANCELLED">Đã huỷ</option>
                    </select>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '10px', marginTop: '12px', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="gt-btn-ghost"
                    style={{ fontSize: '13px' }}
                  >
                    Huỷ Bỏ
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="gt-btn-primary"
                    style={{ fontSize: '13px', padding: '10px 20px' }}
                  >
                    {saving ? 'Đang lưu...' : editingId ? 'Lưu Thay Đổi' : 'Tạo Trận Đấu'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
