import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { getMatches } from '../../api/matchApi';
import { formatCurrency } from '../../utils/formatCurrency';

/* ── Helpers ─────────────────────────────────── */
const TEAM_COLORS = [
  ['#c0392b','#7f0000'], ['#1565c0','#003c8f'], ['#2e7d32','#005005'],
  ['#f57f17','#7e4700'], ['#6a1b9a','#38006b'], ['#00838f','#005662'],
];
function getTeamColor(name = '') {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return TEAM_COLORS[Math.abs(h) % TEAM_COLORS.length];
}
function TeamAvatar({ name, size = 36 }) {
  const [c1, c2] = getTeamColor(name);
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: `linear-gradient(135deg, ${c1}, ${c2})`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.34, fontWeight: 900, color: '#fff', flexShrink: 0,
    }}>{initials}</div>
  );
}

function formatMatchDay(dateStr) {
  const d = new Date(dateStr);
  const days = ['Chủ Nhật','Thứ Hai','Thứ Ba','Thứ Tư','Thứ Năm','Thứ Sáu','Thứ Bảy'];
  return days[d.getDay()];
}
function formatMatchTime(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

const FILTERS = ['Tất Cả', 'V.League 1', 'AFF Cup 2026'];

/* ── Homepage ─────────────────────────────────── */
export default function MatchListPage() {
  const location = useLocation();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('Tất Cả');
  const [search, setSearch] = useState('');
  const [venueFilter, setVenueFilter] = useState('');
  const [priceRange, setPriceRange] = useState('');
  const [sortBy, setSortBy] = useState('hot');
  const [viewMode, setViewMode] = useState(location.pathname === '/lich-dau' ? 'list' : 'home');

  useEffect(() => {
    if (location.pathname === '/lich-dau') {
      setViewMode('list');
    } else if (location.pathname === '/') {
      setViewMode('home');
    }
  }, [location.pathname]);

  useEffect(() => {
    setLoading(true);
    getMatches({ page: 0, size: 20 })
      .then(data => setMatches(data.content ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const upcoming = matches.filter(m => m.status === 'UPCOMING' || m.status === 'ONGOING');
  const featured = upcoming[0];
  const secondaryFeatured = upcoming.slice(1, 3);
  const regularMatches = upcoming.slice(3, 7);

  // Filter for list view with e-commerce multi-facets
  const filtered = matches.filter(m => {
    const q = search.toLowerCase();
    const matchQ = !q || m.homeTeam?.toLowerCase().includes(q) || m.awayTeam?.toLowerCase().includes(q) || m.venue?.toLowerCase().includes(q);
    const matchF = filter === 'Tất Cả' || (m.league && m.league.includes(filter.replace('V.League 1','V.League').replace('AFF Cup 2026','AFF')));
    const matchV = !venueFilter || (m.venue && m.venue.toLowerCase().includes(venueFilter.toLowerCase()));
    const price = Number(m.ticketPrice || 0);
    const matchP = !priceRange
      || (priceRange === 'under150' && price < 150000)
      || (priceRange === '150to300' && price >= 150000 && price <= 300000)
      || (priceRange === 'above300' && price > 300000);
    return matchQ && matchF && matchV && matchP;
  }).sort((a, b) => {
    if (sortBy === 'priceAsc') return Number(a.ticketPrice || 0) - Number(b.ticketPrice || 0);
    if (sortBy === 'priceDesc') return Number(b.ticketPrice || 0) - Number(a.ticketPrice || 0);
    if (sortBy === 'dateAsc') return new Date(a.matchDate) - new Date(b.matchDate);
    return 0;
  });

  // Countdown to featured match
  const [countdown, setCountdown] = useState({ days: '01', hours: '21', mins: '27', secs: '51' });
  useEffect(() => {
    if (!featured?.matchDate) return;
    const interval = setInterval(() => {
      const diff = new Date(featured.matchDate) - new Date();
      if (diff <= 0) { clearInterval(interval); return; }
      const days = Math.floor(diff / 86400000);
      const hours = Math.floor((diff % 86400000) / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setCountdown({
        days: String(days).padStart(2, '0'),
        hours: String(hours).padStart(2, '0'),
        mins: String(mins).padStart(2, '0'),
        secs: String(secs).padStart(2, '0'),
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [featured]);

  const soldPct = featured
    ? Math.round((1 - (featured.availableSeats ?? 0) / (featured.totalSeats || 1)) * 100)
    : 99;

  return (
    <div style={{ minHeight: '100vh' }}>
      {/* ── Hero ──────────────────────────── */}
      <section className="gt-hero">
        <div className="gt-hero-bg" />
        <div className="gt-hero-overlay" />
        <div className="gt-container" style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '40px', width: '100%', flexWrap: 'wrap' }}>
          {/* Left */}
          <div style={{ flex: 1, minWidth: '280px' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              background: 'rgba(57,255,20,0.1)', border: '1px solid rgba(57,255,20,0.25)',
              borderRadius: '20px', padding: '4px 12px', marginBottom: '20px',
            }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#39ff14', animation: 'blink 1s infinite' }} />
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#39ff14', letterSpacing: '0.04em' }}>Nền tảng đặt vé #1 Việt Nam</span>
            </div>

            <h1 style={{ fontFamily: "'Barlow', sans-serif", fontSize: 'clamp(32px,5vw,56px)', fontWeight: 900, color: '#fff', lineHeight: 1.05, letterSpacing: '-0.02em', marginBottom: '16px' }}>
              VÉ BÓNG ĐÁ<br />
              <span style={{ color: '#39ff14' }}>CHÍNH HÃNG</span><br />
              GIÁ TỐT NHẤT
            </h1>
            <p style={{ color: '#888', fontSize: '14px', marginBottom: '28px', maxWidth: '400px' }}>
              V.League, AFF Cup, Cúp Quốc Gia – đặt vé trực tuyến 24/7, nhận QR tức thì, vào cổng chỉ 5 giây.
            </p>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button onClick={() => setViewMode('list')} className="gt-btn-primary" style={{ fontSize: '14px', padding: '12px 24px' }}>
                Xem Lịch Đấu →
              </button>
              {featured && (
                <Link to={`/matches/${featured.id}`} className="gt-btn-outline" style={{ fontSize: '14px', padding: '12px 24px' }}>
                  🏆 Trận Chung Kết
                </Link>
              )}
            </div>
          </div>

          {/* Right: Featured Match Card */}
          {featured && (
            <div className="gt-featured-card" style={{ width: '280px', padding: '20px', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#888' }}>
                  🏆 {featured.league || 'CHUNG KẾT AFF CUP'}
                </span>
                <span className="gt-badge gt-badge-hot">HOT</span>
              </div>

              {/* Teams */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div style={{ textAlign: 'center' }}>
                  <TeamAvatar name={featured.homeTeam} size={48} />
                  <p style={{ color: '#ccc', fontSize: '11px', marginTop: '6px', fontWeight: 600 }}>
                    {featured.homeTeam?.split(' ').slice(-2).join(' ')}
                  </p>
                </div>
                <span style={{ color: '#555', fontSize: '16px', fontWeight: 700 }}>VS</span>
                <div style={{ textAlign: 'center' }}>
                  <TeamAvatar name={featured.awayTeam} size={48} />
                  <p style={{ color: '#ccc', fontSize: '11px', marginTop: '6px', fontWeight: 600 }}>
                    {featured.awayTeam?.split(' ').slice(-2).join(' ')}
                  </p>
                </div>
              </div>

              {/* Countdown */}
              <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', marginBottom: '14px' }}>
                {[['Ngày', countdown.days], ['Giờ', countdown.hours], ['Phút', countdown.mins], ['Giây', countdown.secs]].map(([label, val]) => (
                  <div key={label} className="gt-countdown-box" style={{ padding: '8px 10px', minWidth: '44px' }}>
                    <span className="gt-countdown-num" style={{ fontSize: '18px' }}>{val}</span>
                    <span className="gt-countdown-label">{label}</span>
                  </div>
                ))}
              </div>

              {/* Progress */}
              <div style={{ marginBottom: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#666', marginBottom: '4px' }}>
                  <span>Còn lại</span>
                  <span style={{ color: '#39ff14' }}>{soldPct}% đã bán</span>
                </div>
                <div className="gt-progress-bar">
                  <div className={`gt-progress-fill ${soldPct > 90 ? 'danger' : soldPct > 70 ? 'warn' : ''}`} style={{ width: `${soldPct}%` }} />
                </div>
              </div>

              <Link
                to={`/matches/${featured.id}`}
                className="gt-btn-primary"
                style={{ width: '100%', justifyContent: 'center', fontSize: '13px', padding: '11px' }}
              >
                ĐẶT VÉ NGAY – {formatCurrency(featured.ticketPrice)}
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* ── Nội dung chính ──────────────────── */}
      {viewMode === 'home' ? (
        <HomeContent
          upcoming={upcoming}
          featured={featured}
          secondaryFeatured={secondaryFeatured}
          regularMatches={regularMatches}
          matches={matches}
          setViewMode={setViewMode}
          loading={loading}
        />
      ) : (
        <ListContent
          matches={matches}
          filtered={filtered}
          filter={filter}
          setFilter={setFilter}
          search={search}
          setSearch={setSearch}
          venueFilter={venueFilter}
          setVenueFilter={setVenueFilter}
          priceRange={priceRange}
          setPriceRange={setPriceRange}
          sortBy={sortBy}
          setSortBy={setSortBy}
          loading={loading}
        />
      )}
    </div>
  );
}

/* ── Home View ──────────────────────────────────── */
function HomeContent({ upcoming, featured, secondaryFeatured, regularMatches, matches, setViewMode, loading }) {
  return (
    <div>
      {/* Featured Matches Section */}
      <section style={{ padding: '60px 0' }}>
        <div className="gt-container">
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '28px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <p className="gt-section-label">// Sắp diễn ra</p>
              <h2 className="gt-section-title" style={{ marginTop: '6px' }}>TRẬN ĐẤU NỔI BẬT</h2>
            </div>
            <button onClick={() => setViewMode('list')} style={{ fontSize: '13px', color: '#888', background: 'none', border: 'none', cursor: 'pointer', transition: 'color 0.2s' }}
              onMouseEnter={e => e.target.style.color = '#fff'} onMouseLeave={e => e.target.style.color = '#888'}>
              Xem Tất Cả →
            </button>
          </div>

          {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {[...Array(3)].map((_, i) => <div key={i} className="skeleton" style={{ height: '200px', borderRadius: '12px' }} />)}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
              {/* Main featured */}
              {featured && <FeaturedMatchBig match={featured} />}
              {/* Secondary */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {secondaryFeatured.map(m => <FeaturedMatchSmall key={m.id} match={m} />)}
              </div>
            </div>
          )}

          {/* Regular match rows */}
          {!loading && regularMatches.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginTop: '16px' }}>
              {regularMatches.map(m => <MatchRow key={m.id} match={m} />)}
              {upcoming.length > 4 && (
                <Link to={`/matches/${upcoming[4]?.id}`} style={{ textDecoration: 'none' }}>
                  <MatchRow match={upcoming[4]} />
                </Link>
              )}
            </div>
          )}
        </div>
      </section>

      {/* How it works */}
      <HowItWorks />

      {/* News section */}
      <NewsSection />

      {/* Promo Banner */}
      <section style={{ padding: '0 0 60px' }}>
        <div className="gt-container">
          <PromoBanner />
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}

/* ── Featured Match Big Card ── */
function FeaturedMatchBig({ match }) {
  const sold = match.totalSeats > 0
    ? Math.round((1 - match.availableSeats / match.totalSeats) * 100)
    : 85;
  return (
    <Link to={`/matches/${match.id}`} style={{ textDecoration: 'none', display: 'block', position: 'relative', borderRadius: '12px', overflow: 'hidden', minHeight: '260px', background: '#111' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'url(https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=800) center/cover', opacity: 0.3 }} />
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(0deg, rgba(0,0,0,0.95) 30%, transparent)' }} />
      <span className="gt-badge gt-badge-hot" style={{ position: 'absolute', top: '14px', right: '14px' }}>HOT</span>
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '20px' }}>
        <p style={{ fontSize: '11px', color: '#39ff14', fontWeight: 700, marginBottom: '8px' }}>
          {match.league || 'AFF CUP 2026'} · CHUNG KẾT
        </p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <TeamAvatar name={match.homeTeam} size={32} />
            <span style={{ color: '#fff', fontWeight: 700, fontSize: '15px' }}>{match.homeTeam}</span>
          </div>
          <span style={{ color: '#555', fontWeight: 700 }}>VS</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ color: '#fff', fontWeight: 700, fontSize: '15px' }}>{match.awayTeam}</span>
            <TeamAvatar name={match.awayTeam} size={32} />
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '12px', color: '#888' }}>
            {formatMatchTime(match.matchDate)} · {match.venue}
          </span>
          <div style={{ textAlign: 'right' }}>
            <p style={{ color: '#fff', fontWeight: 700, fontSize: '14px' }}>{formatCurrency(match.ticketPrice)}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
              <div style={{ flex: 1, height: '2px', background: '#2a2a2a', borderRadius: '99px', overflow: 'hidden', minWidth: '80px' }}>
                <div style={{ height: '100%', background: sold > 90 ? '#e53935' : '#39ff14', width: `${sold}%` }} />
              </div>
              <span style={{ fontSize: '10px', color: '#666' }}>{sold}% đã bán</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

/* ── Featured Match Small Card ── */
function FeaturedMatchSmall({ match }) {
  return (
    <Link to={`/matches/${match.id}`} style={{ textDecoration: 'none', display: 'block', position: 'relative', borderRadius: '12px', overflow: 'hidden', flex: 1, minHeight: '120px', background: '#111' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'url(https://images.unsplash.com/photo-1540747913346-19212a4b3b41?w=600) center/cover', opacity: 0.25 }} />
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(0deg, rgba(0,0,0,0.95) 40%, transparent)' }} />
      <span className="gt-badge gt-badge-hot" style={{ position: 'absolute', top: '10px', right: '10px' }}>HOT</span>
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '14px' }}>
        <p style={{ fontSize: '10px', color: '#39ff14', fontWeight: 700, marginBottom: '6px' }}>
          {match.league || 'V.LEAGUE 1'} · VÒNG 22
        </p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TeamAvatar name={match.homeTeam} size={24} />
            <span style={{ color: '#ccc', fontWeight: 700, fontSize: '12px' }}>{match.homeTeam}</span>
          </div>
          <span style={{ color: '#f0f0f0', fontWeight: 700, fontSize: '13px' }}>{formatCurrency(match.ticketPrice)}</span>
        </div>
      </div>
    </Link>
  );
}

/* ── Match Row (compact) ── */
function MatchRow({ match }) {
  return (
    <Link to={`/matches/${match.id}`} style={{ textDecoration: 'none' }}>
      <div className="gt-card" style={{ padding: '14px 16px' }}>
        <p style={{ fontSize: '10px', color: '#39ff14', fontWeight: 700, marginBottom: '8px' }}>
          {match.league || 'V.LEAGUE 1'}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
          <TeamAvatar name={match.homeTeam} size={28} />
          <span style={{ fontSize: '12px', color: '#ccc', fontWeight: 600 }}>{match.homeTeam}</span>
          <span style={{ fontSize: '10px', color: '#555', margin: '0 2px' }}>vs</span>
          <span style={{ fontSize: '12px', color: '#ccc', fontWeight: 600 }}>{match.awayTeam}</span>
          <TeamAvatar name={match.awayTeam} size={28} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '11px', color: '#666' }}>{formatMatchDay(match.matchDate)} · {formatMatchTime(match.matchDate)}</span>
          <span style={{ fontSize: '12px', color: '#39ff14', fontWeight: 700 }}>{formatCurrency(match.ticketPrice)}</span>
        </div>
      </div>
    </Link>
  );
}

/* ── How It Works ── */
function HowItWorks() {
  const steps = [
    { num: '01', title: 'CHỌN TRẬN ĐẤU', desc: 'Duyệt lịch thi đấu, lọc theo giải và ngày, chọn trận yêu thích.' },
    { num: '02', title: 'CHỌN KHU VỰC & GHẾ', desc: 'Xem sơ đồ sân trực quan, chọn khu vực và ghế phù hợp ngân sách.' },
    { num: '03', title: 'NHẬN VÉ QR TỨC THÌ', desc: 'Thanh toán an toàn qua VNPay / Momo, nhận vé điện tử ngay.' },
  ];
  return (
    <section style={{ padding: '60px 0', background: '#0d0d0d', borderTop: '1px solid #1e1e1e', borderBottom: '1px solid #1e1e1e' }}>
      <div className="gt-container" style={{ display: 'flex', gap: '60px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ flex: 1, minWidth: '280px' }}>
          <p className="gt-section-label">// Cách hoạt động</p>
          <h2 className="gt-section-title" style={{ marginTop: '8px', marginBottom: '32px' }}>ĐẶT VÉ<br />CHỈ 3 BƯỚC</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {steps.map(s => (
              <div key={s.num} style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                <div style={{
                  width: '40px', height: '40px', borderRadius: '10px', background: '#1a1a1a',
                  border: '1px solid #2a2a2a', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '11px', fontWeight: 800, color: '#39ff14', flexShrink: 0
                }}>
                  {s.num}
                </div>
                <div>
                  <p style={{ fontWeight: 700, fontSize: '13px', color: '#fff', marginBottom: '4px' }}>{s.title}</p>
                  <p style={{ fontSize: '13px', color: '#666', lineHeight: 1.5 }}>{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        {/* Mock phone */}
        <div style={{ flex: 1, minWidth: '240px', display: 'flex', justifyContent: 'center' }}>
          <div style={{
            background: '#111', border: '1px solid #2a2a2a', borderRadius: '20px',
            padding: '24px 20px', width: '240px',
          }}>
            <div style={{ background: '#1a1a1a', borderRadius: '12px', padding: '16px', marginBottom: '14px' }}>
              <p style={{ fontSize: '11px', color: '#666', marginBottom: '4px' }}>Vé của bạn</p>
              <p style={{ fontSize: '15px', fontWeight: 800, color: '#fff' }}>VN VS TL</p>
              <p style={{ fontSize: '11px', color: '#39ff14', marginTop: '2px', fontFamily: 'monospace' }}>GT-2026-M29Z7Q</p>
              <div style={{ marginTop: '12px', padding: '8px 0', borderTop: '1px solid #2a2a2a' }}>
                <p style={{ fontSize: '10px', color: '#666', marginBottom: '4px' }}>Trận tiếp theo</p>
                <p style={{ fontSize: '12px', color: '#ccc', fontWeight: 600 }}>HN FC vs HCM FC</p>
                <p style={{ fontSize: '12px', color: '#39ff14', fontWeight: 700 }}>27/09 · 19:00</p>
                <div className="gt-progress-bar" style={{ marginTop: '6px' }}>
                  <div className="gt-progress-fill" style={{ width: '68%' }} />
                </div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {['VNPay', 'MoMo', 'StrPe', 'Momo!'].map(p => (
                <div key={p} style={{ background: '#1a1a1a', borderRadius: '8px', padding: '8px', textAlign: 'center', fontSize: '11px', color: '#666' }}>{p}</div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── News Section ── */
const NEWS_DATA = [
  { tag: 'V.League 1', time: '2 giờ trước', title: 'Nguyễn Xuân Sơn ghi hattrick trong 15 phút, Hà Nội FC thắng đậm', desc: 'Tiền đạo nhập tịch toả sáng rực rỡ giúp Hà Nội FC giành chiến thắng thuyết phục 5-1 trước đối thủ...', img: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=400&q=80' },
  { tag: 'AFF Cup', time: '5 giờ trước', title: 'AFF Cup 2026: ĐT Việt Nam chốt danh sách 23 cầu thủ dự bán kết', desc: 'HLV trưởng vừa công bố danh sách chính thức chuẩn bị cho trận đại chiến với Thái Lan tại Mỹ Đình...', img: 'https://images.unsplash.com/photo-1606925797300-0b35e9d1794e?w=400&q=80' },
  { tag: 'Tin tức', time: '1 ngày trước', title: 'Sân Mỹ Đình cháy vé trận bán kết, hơn 40.000 chỗ ngồi đã bán sạch', desc: 'Chỉ trong vòng 3 giờ sau khi mở bán, toàn bộ vé trận Việt Nam – Thái Lan đã được đặt hết...', img: 'https://images.unsplash.com/photo-1540747913346-19212a4b3b41?w=400&q=80' },
];

function NewsSection() {
  return (
    <section style={{ padding: '60px 0' }}>
      <div className="gt-container">
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '28px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <p className="gt-section-label">// Tin tức</p>
            <h2 className="gt-section-title" style={{ marginTop: '6px' }}>TIN BÓNG ĐÁ MỚI NHẤT</h2>
          </div>
          <button style={{ fontSize: '13px', color: '#888', background: 'none', border: 'none', cursor: 'pointer' }}>Xem Tất Cả →</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '16px' }}>
          {NEWS_DATA.map(n => (
            <div key={n.title} className="gt-news-card">
              <div style={{ height: '180px', overflow: 'hidden' }}>
                <img src={n.img} alt={n.title} style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s' }}
                  onMouseEnter={e => e.target.style.transform = 'scale(1.05)'}
                  onMouseLeave={e => e.target.style.transform = 'scale(1)'}
                />
              </div>
              <div style={{ padding: '16px' }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                  <span className="gt-badge-league" style={{ fontSize: '9px', padding: '2px 7px', borderRadius: '4px' }}>{n.tag}</span>
                  <span style={{ fontSize: '11px', color: '#666' }}>{n.time}</span>
                </div>
                <p style={{ fontWeight: 700, fontSize: '13px', color: '#fff', lineHeight: 1.4, marginBottom: '6px' }}>{n.title}</p>
                <p style={{ fontSize: '12px', color: '#666', lineHeight: 1.5 }}>{n.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Promo Banner ── */
function PromoBanner() {
  return (
    <div className="gt-promo-banner">
      <div className="gt-promo-banner-bg" />
      <div className="gt-promo-banner-overlay" />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <p style={{ fontSize: '11px', fontWeight: 700, color: '#ff6b2b', letterSpacing: '0.06em', marginBottom: '10px' }}>⚡ ƯU ĐÃI CÓ HẠN</p>
        <h2 style={{ fontFamily: "'Barlow', sans-serif", fontSize: 'clamp(24px,4vw,40px)', fontWeight: 900, color: '#fff', marginBottom: '10px', letterSpacing: '-0.01em' }}>
          NHẬP MÃ{' '}
          <span style={{ background: '#1a1a1a', color: '#39ff14', border: '1px solid #2a2a2a', borderRadius: '6px', padding: '2px 12px' }}>GOALVN20</span>
        </h2>
        <p style={{ color: '#888', fontSize: '14px', marginBottom: '20px' }}>
          Giảm ngay 20% cho mỗi đơn đặt vé — áp dụng đến 31/10/2026.
        </p>
        <button className="gt-btn-primary" style={{ fontSize: '14px', padding: '12px 28px', background: '#ff4c00' }}
          onMouseEnter={e => e.target.style.background = '#ff6a2a'}
          onMouseLeave={e => e.target.style.background = '#ff4c00'}>
          ĐẶT VÉ NGAY
        </button>
      </div>
    </div>
  );
}

/* ── List View with E-Commerce Discovery Filters ── */
function ListContent({
  matches,
  filtered,
  filter,
  setFilter,
  search,
  setSearch,
  venueFilter,
  setVenueFilter,
  priceRange,
  setPriceRange,
  sortBy,
  setSortBy,
  loading,
}) {
  const isFiltered = search || filter !== 'Tất Cả' || venueFilter || priceRange || sortBy !== 'hot';

  function resetFilters() {
    setSearch('');
    setFilter('Tất Cả');
    setVenueFilter('');
    setPriceRange('');
    setSortBy('hot');
  }

  return (
    <div>
      <section style={{ padding: '40px 0 60px' }}>
        <div className="gt-container">
          <p className="gt-section-label">// Lịch thi đấu & Đặt vé</p>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '12px', marginBottom: '24px' }}>
            <h1 className="gt-section-title" style={{ marginTop: '8px' }}>TẤT CẢ TRẬN ĐẤU</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#888' }}>
              <span>Hiển thị <strong style={{ color: '#39ff14' }}>{filtered.length}</strong> trận đấu</span>
              {isFiltered && (
                <button
                  onClick={resetFilters}
                  style={{ background: 'none', border: 'none', color: '#ff6b2b', cursor: 'pointer', fontSize: '12px', textDecoration: 'underline' }}
                >
                  Đặt lại lọc
                </button>
              )}
            </div>
          </div>

          {/* E-Commerce Multi-Filter Toolbar */}
          <div
            className="gt-card-flat"
            style={{
              padding: '16px',
              background: '#141414',
              borderRadius: '12px',
              marginBottom: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            {/* Top row: Search + League Buttons */}
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
                <input
                  className="gt-input"
                  style={{ paddingLeft: '34px', fontSize: '13px' }}
                  placeholder="Tìm theo tên đội, cầu thủ, sân..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#666', fontSize: '14px' }}>
                  🔍
                </span>
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* League chips */}
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {FILTERS.map(f => (
                  <button
                    key={f}
                    className={`gt-filter-btn ${filter === f ? 'active' : ''}`}
                    onClick={() => setFilter(f)}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {/* Bottom row: Facets (Venue, Price, Sort) */}
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', borderTop: '1px solid #1f1f1f', paddingTop: '12px' }}>
              {/* Venue filter */}
              <select
                className="gt-input"
                style={{ width: 'auto', minWidth: '150px', fontSize: '12px', padding: '8px 12px' }}
                value={venueFilter}
                onChange={e => setVenueFilter(e.target.value)}
              >
                <option value="">🏟️ Tất cả sân vận động</option>
                <option value="Mỹ Đình">Sân Mỹ Đình (Hà Nội)</option>
                <option value="Hàng Đẫy">Sân Hàng Đẫy (Hà Nội)</option>
                <option value="Thống Nhất">Sân Thống Nhất (TP.HCM)</option>
                <option value="Hòa Xuân">Sân Hòa Xuân (Đà Nẵng)</option>
                <option value="Pleiku">Sân Pleiku (Gia Lai)</option>
              </select>

              {/* Price range */}
              <select
                className="gt-input"
                style={{ width: 'auto', minWidth: '140px', fontSize: '12px', padding: '8px 12px' }}
                value={priceRange}
                onChange={e => setPriceRange(e.target.value)}
              >
                <option value="">💵 Mọi mức giá vé</option>
                <option value="under150">Dưới 150.000 đ</option>
                <option value="150to300">150.000 đ – 300.000 đ</option>
                <option value="above300">Trên 300.000 đ</option>
              </select>

              {/* Sort By */}
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12px', color: '#666', whiteSpace: 'nowrap' }}>Sắp xếp:</span>
                <select
                  className="gt-input"
                  style={{ width: 'auto', minWidth: '150px', fontSize: '12px', padding: '8px 12px' }}
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value)}
                >
                  <option value="hot">🔥 Trận Hot Nhất</option>
                  <option value="priceAsc">Giá: Thấp đến Cao</option>
                  <option value="priceDesc">Giá: Cao đến Thấp</option>
                  <option value="dateAsc">Thời gian: Sớm nhất</option>
                </select>
              </div>
            </div>
          </div>

          {/* Match list */}
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[...Array(5)].map((_, i) => <div key={i} className="skeleton" style={{ height: '64px', borderRadius: '10px' }} />)}
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '80px 0', color: '#555' }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>🏟</div>
              <p style={{ fontWeight: 600, color: '#888' }}>Không tìm thấy trận đấu nào phù hợp với bộ lọc</p>
              <button
                onClick={resetFilters}
                className="gt-btn-outline"
                style={{ fontSize: '13px', marginTop: '16px' }}
              >
                Đặt lại bộ lọc
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {filtered.map((m, i) => {
                const soldPct = m.availableSeats && m.totalSeats
                  ? Math.round((1 - m.availableSeats / m.totalSeats) * 100)
                  : 80;
                const isUrgent = soldPct >= 80;

                return (
                  <Link key={m.id} to={`/matches/${m.id}`} className="gt-match-row animate-fade-in-up" style={{ animationDelay: `${i * 30}ms` }}>
                    {/* Day/Time */}
                    <div style={{ minWidth: '80px', flexShrink: 0 }}>
                      <p style={{ fontSize: '11px', color: '#39ff14', fontWeight: 700 }}>{formatMatchDay(m.matchDate).toUpperCase()}</p>
                      <p style={{ fontSize: '15px', color: '#fff', fontWeight: 800 }}>{formatMatchTime(m.matchDate)}</p>
                    </div>

                    {/* Teams */}
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '12px', paddingLeft: '12px', borderLeft: '1px solid #2a2a2a', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <TeamAvatar name={m.homeTeam} size={32} />
                        <span style={{ fontWeight: 700, color: '#fff', fontSize: '14px' }}>{m.homeTeam}</span>
                        <span style={{ color: '#555', fontSize: '12px', fontWeight: 600, margin: '0 4px' }}>vs</span>
                        <span style={{ fontWeight: 700, color: '#fff', fontSize: '14px' }}>{m.awayTeam}</span>
                        <TeamAvatar name={m.awayTeam} size={32} />
                      </div>
                      <span style={{ fontSize: '11px', color: '#666', marginLeft: '8px' }}>
                        📍 Sân {m.venue}
                      </span>
                    </div>

                    {/* Urgency Badge + League + Price + CTA */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexShrink: 0 }}>
                      {isUrgent && (
                        <span style={{
                          fontSize: '10px',
                          color: '#ff4c00',
                          background: 'rgba(255,76,0,0.1)',
                          border: '1px solid rgba(255,76,0,0.3)',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontWeight: 700,
                        }}>
                          ⚡ {soldPct}% đã bán
                        </span>
                      )}
                      <span className="gt-badge-league" style={{ fontSize: '9px', padding: '3px 8px' }}>{m.league || 'V.LEAGUE 1'}</span>
                      <div style={{ textAlign: 'right', minWidth: '95px' }}>
                        <span style={{ fontWeight: 800, color: '#fff', fontSize: '15px' }}>
                          {formatCurrency(m.ticketPrice)}
                        </span>
                      </div>
                      <span className="gt-btn-primary" style={{ padding: '6px 14px', fontSize: '12px', borderRadius: '6px' }}>
                        Đặt Vé
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>
      <Footer />
    </div>
  );
}

/* ── Footer ── */
function Footer() {
  return (
    <footer className="gt-footer">
      <div className="gt-container" style={{ padding: '40px 20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '40px', flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <div style={{ width: '28px', height: '28px', background: '#39ff14', borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>⚽</div>
              <span style={{ fontFamily: "'Barlow', sans-serif", fontWeight: 900, color: '#fff', fontSize: '16px' }}>GOAL<span style={{ color: '#39ff14' }}>TICKET</span>.VN</span>
            </div>
            <p style={{ fontSize: '12px', color: '#555', marginBottom: '16px', lineHeight: 1.6 }}>Nền tảng đặt vé bóng đá trực tuyến hàng đầu Việt Nam, được cấp phép bởi VFF.</p>
            <div style={{ display: 'flex', gap: '8px' }}>
              {['FB','IG','YT','TL'].map(s => (
                <div key={s} style={{ width: '32px', height: '32px', background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#666', cursor: 'pointer', transition: 'border-color 0.2s' }}>{s}</div>
              ))}
            </div>
          </div>
          {[
            { title: 'Giải Đấu', items: ['V.League 1', 'V.League 2', 'AFF Cup 2026', 'Cúp Quốc Gia'] },
            { title: 'Hỗ Trợ', items: ['FAQ', 'Liên hệ', 'Hoàn vé', 'Điều khoản'] },
            { title: 'Sân Vận Động', items: ['Mỹ Đình', 'Chi Lăng', 'Thống Nhất', 'Hàng Đẫy'] },
          ].map(col => (
            <div key={col.title}>
              <p style={{ fontWeight: 700, color: '#fff', fontSize: '13px', marginBottom: '14px' }}>{col.title}</p>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {col.items.map(item => (
                  <li key={item} style={{ fontSize: '13px', color: '#555', cursor: 'pointer', transition: 'color 0.2s' }}
                    onMouseEnter={e => e.target.style.color = '#ccc'}
                    onMouseLeave={e => e.target.style.color = '#555'}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div style={{ borderTop: '1px solid #1e1e1e', marginTop: '36px', paddingTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <p style={{ fontSize: '12px', color: '#444' }}>© 2026 GoalTicket.vn – All rights reserved</p>
          <p style={{ fontSize: '12px', color: '#444' }}>Được cấp phép bởi VFF · SSL 256-bit</p>
        </div>
      </div>
    </footer>
  );
}
