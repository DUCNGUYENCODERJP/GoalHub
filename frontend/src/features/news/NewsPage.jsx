import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getMatches } from '../../api/matchApi';
import { formatCurrency } from '../../utils/formatCurrency';

/* ── Helpers ── */
const TEAM_COLORS = [
  ['#c0392b','#7f0000'], ['#1565c0','#003c8f'], ['#2e7d32','#005005'],
  ['#f57f17','#7e4700'], ['#6a1b9a','#38006b'], ['#00838f','#005662'],
];
function getTeamColor(name = '') {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return TEAM_COLORS[Math.abs(h) % TEAM_COLORS.length];
}
function TeamAvatar({ name = '', size = 32 }) {
  const [c1, c2] = getTeamColor(name);
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: `linear-gradient(135deg, ${c1}, ${c2})`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.35, fontWeight: 900, color: '#fff', flexShrink: 0,
    }}>{initials}</div>
  );
}

const NEWS_CATEGORIES = ['Tất Cả', 'V.League 1', 'AFF Cup', 'Tin Tức', 'Phân Tích'];

const FEATURED_NEWS = {
  id: 'feat-1',
  tag: 'V.League 1',
  time: '2 giờ trước',
  title: 'NGUYỄN XUÂN SON GHI HATTRICK TRONG 15 PHÚT, HÀ NỘI FC THẮNG ĐẬM',
  desc: 'Tiền đạo nhập tịch tỏa sáng rực rỡ giúp Hà Nội FC giành chiến thắng thuyết phục 5-1 trước đối thủ...',
  img: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=1200&q=80',
  category: 'V.League 1',
};

const NEWS_ARTICLES = [
  {
    id: 1,
    tag: 'AFF Cup',
    category: 'AFF Cup',
    time: '5 giờ trước',
    title: 'AFF CUP 2026: ĐT VIỆT NAM CHỐT DANH SÁCH 23 CẦU THỦ DỰ BÁN KẾT',
    desc: 'HLV trưởng vừa công bố danh sách chính thức chuẩn bị cho trận đại chiến với Thái Lan tại Mỹ Đình...',
    img: 'https://images.unsplash.com/photo-1606925797300-0b35e9d1794e?w=600&q=80',
  },
  {
    id: 2,
    tag: 'Tin Tức',
    category: 'Tin Tức',
    time: '1 ngày trước',
    title: 'SÂN MỸ ĐÌNH CHÁY VÉ TRẬN BÁN KẾT, HƠN 40.000 CHỖ NGỒI ĐÃ BÁN SẠCH',
    desc: 'Chỉ trong vòng 3 giờ sau khi mở bán, toàn bộ vé trận Việt Nam – Thái Lan đã được đặt hết...',
    img: 'https://images.unsplash.com/photo-1540747913346-19212a4b3b41?w=600&q=80',
  },
  {
    id: 3,
    tag: 'V.League 1',
    category: 'V.League 1',
    time: '2 ngày trước',
    title: 'VIETTEL FC CHIÊU MỘ TIỀN ĐẠO BRAZIL, SẴN SÀNG CHO MÙA GIẢI MỚI',
    desc: 'Câu lạc bộ Viettel vừa hoàn tất hợp đồng với tiền đạo người Brazil trong thương vụ có giá trị lên đến 1.2 triệu USD...',
    img: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=600&q=80',
  },
  {
    id: 4,
    tag: 'Phân Tích',
    category: 'Phân Tích',
    time: '3 ngày trước',
    title: 'PHÂN TÍCH CHIẾN THUẬT: TẠI SAO ĐT VIỆT NAM NGUY HIỂM Ở AFF CUP 2026?',
    desc: 'Với bộ đôi tiền vệ mới và hàng thủ kinh nghiệm, đội tuyển Việt Nam đang sở hữu nhiều lợi thế bước vào bán kết...',
    img: 'https://images.unsplash.com/photo-1517466787929-bc90951d0974?w=600&q=80',
  },
  {
    id: 5,
    tag: 'Tin Tức',
    category: 'Tin Tức',
    time: '4 ngày trước',
    title: 'GOALTICKET RA MẮT TÍNH NĂNG CHỌN GHẾ 3D CHO SÂN MỸ ĐÌNH',
    desc: 'Nền tảng đặt vé hàng đầu Việt Nam vừa cập nhật tính năng xem trước góc nhìn 3D từ mỗi ghế ngồi...',
    img: 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=600&q=80',
  },
  {
    id: 6,
    tag: 'V.League 1',
    category: 'V.League 1',
    time: '5 ngày trước',
    title: 'LỊCH THI ĐẤU GIAI ĐOẠN 2 V.LEAGUE 2026 CHÍNH THỨC ĐƯỢC CÔNG BỐ',
    desc: 'Ban tổ chức giải đấu vừa phê duyệt lịch thi đấu giai đoạn lượt về với nhiều trận derby nảy lửa...',
    img: 'https://images.unsplash.com/photo-1489944440615-453fc2b6a9a9?w=600&q=80',
  },
];

const FALLBACK_RELATED_MATCHES = [
  { id: 1, day: 'THỨ BẢY', time: '19:00', home: 'HÀ NỘI FC', away: 'TP.HCM FC', league: 'V.LEAGUE 1', price: 150000 },
  { id: 2, day: 'THỨ BA', time: '20:00', home: 'VIỆT NAM', away: 'THÁI LAN', league: 'AFF CUP 2026', price: 300000 },
  { id: 3, day: 'THỨ TƯ', time: '20:00', home: 'VIỆT NAM', away: 'INDONESIA', league: 'AFF CUP 2026', price: 500000 },
];

export default function NewsPage() {
  const [selectedCat, setSelectedCat] = useState('Tất Cả');
  const [relatedMatches, setRelatedMatches] = useState(FALLBACK_RELATED_MATCHES);

  useEffect(() => {
    getMatches({ page: 0, size: 5 })
      .then(data => {
        if (data.content && data.content.length > 0) {
          const mapped = data.content.slice(0, 3).map((m, idx) => {
            const date = new Date(m.matchDate);
            const days = ['CHỦ NHẬT', 'THỨ HAI', 'THỨ BA', 'THỨ TƯ', 'THỨ NĂM', 'THỨ SÁU', 'THỨ BẢY'];
            return {
              id: m.id,
              day: days[date.getDay()],
              time: date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
              home: m.homeTeam?.toUpperCase(),
              away: m.awayTeam?.toUpperCase(),
              league: m.league || 'V.LEAGUE 1',
              price: m.ticketPrice,
            };
          });
          setRelatedMatches(mapped);
        }
      })
      .catch(() => {});
  }, []);

  const filteredArticles = selectedCat === 'Tất Cả'
    ? NEWS_ARTICLES
    : NEWS_ARTICLES.filter(a => a.category.toLowerCase() === selectedCat.toLowerCase());

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '60px' }}>
      <div className="gt-container" style={{ paddingTop: '32px' }}>
        {/* Header */}
        <p className="gt-section-label">// Tin tức bóng đá</p>
        <h1 className="gt-section-title" style={{ marginTop: '8px', marginBottom: '24px' }}>
          TIN TỨC & PHÂN TÍCH
        </h1>

        {/* Filter categories */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '32px', flexWrap: 'wrap' }}>
          {NEWS_CATEGORIES.map(cat => (
            <button
              key={cat}
              className={`gt-filter-btn ${selectedCat === cat ? 'active' : ''}`}
              onClick={() => setSelectedCat(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Main Hero Featured Article */}
        {(selectedCat === 'Tất Cả' || selectedCat === FEATURED_NEWS.category) && (
          <div
            className="gt-card animate-fade-in-up"
            style={{
              position: 'relative',
              borderRadius: '16px',
              overflow: 'hidden',
              marginBottom: '32px',
              minHeight: '360px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-end',
            }}
          >
            <img
              src={FEATURED_NEWS.img}
              alt={FEATURED_NEWS.title}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                zIndex: 0,
                filter: 'brightness(0.65)',
              }}
            />
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'linear-gradient(to top, rgba(10,10,10,0.95) 10%, rgba(10,10,10,0.4) 60%, transparent 100%)',
                zIndex: 1,
              }}
            />
            <div style={{ position: 'relative', zIndex: 2, padding: 'clamp(20px, 4vw, 36px)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <span
                  style={{
                    background: '#ff4c00',
                    color: '#fff',
                    fontSize: '10px',
                    fontWeight: 800,
                    padding: '3px 8px',
                    borderRadius: '4px',
                    textTransform: 'uppercase',
                  }}
                >
                  {FEATURED_NEWS.tag}
                </span>
                <span style={{ fontSize: '12px', color: '#aaa' }}>{FEATURED_NEWS.time}</span>
              </div>
              <h2
                style={{
                  fontFamily: "'Barlow', sans-serif",
                  fontSize: 'clamp(20px, 3.5vw, 32px)',
                  fontWeight: 900,
                  color: '#fff',
                  lineHeight: 1.2,
                  marginBottom: '10px',
                  letterSpacing: '-0.01em',
                }}
              >
                {FEATURED_NEWS.title}
              </h2>
              <p style={{ color: '#bbb', fontSize: '14px', maxWidth: '750px', lineHeight: 1.5 }}>
                {FEATURED_NEWS.desc}
              </p>
            </div>
          </div>
        )}

        {/* News Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '20px',
            marginBottom: '48px',
          }}
        >
          {filteredArticles.map(article => (
            <div
              key={article.id}
              className="gt-card animate-fade-in-up"
              style={{
                borderRadius: '12px',
                overflow: 'hidden',
                background: '#121212',
                border: '1px solid #1f1f1f',
                display: 'flex',
                flexDirection: 'column',
                transition: 'transform 0.2s, border-color 0.2s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = '#2e2e2e';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = '#1f1f1f';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <div style={{ height: '180px', overflow: 'hidden' }}>
                <img
                  src={article.img}
                  alt={article.title}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    transition: 'transform 0.3s ease',
                  }}
                  onMouseEnter={e => e.target.style.transform = 'scale(1.05)'}
                  onMouseLeave={e => e.target.style.transform = 'scale(1)'}
                />
              </div>
              <div style={{ padding: '18px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                  <span className="gt-badge-league" style={{ fontSize: '9px', padding: '2px 8px', borderRadius: '4px' }}>
                    {article.tag}
                  </span>
                  <span style={{ fontSize: '11px', color: '#666' }}>{article.time}</span>
                </div>
                <h3
                  style={{
                    fontFamily: "'Barlow', sans-serif",
                    fontWeight: 800,
                    fontSize: '16px',
                    color: '#fff',
                    lineHeight: 1.35,
                    marginBottom: '8px',
                  }}
                >
                  {article.title}
                </h3>
                <p style={{ color: '#777', fontSize: '12px', lineHeight: 1.5, marginTop: 'auto' }}>
                  {article.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Related Matches Section */}
        <div style={{ marginTop: '56px', paddingTop: '32px', borderTop: '1px solid #1c1c1c' }}>
          <p style={{ fontWeight: 800, color: '#ff6b2b', fontSize: '14px', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '16px' }}>
            Trận Đấu Liên Quan
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {relatedMatches.map(m => (
              <Link
                key={m.id}
                to={`/matches/${m.id}`}
                className="gt-match-row animate-fade-in-up"
                style={{
                  textDecoration: 'none',
                  background: '#121212',
                  border: '1px solid #1e1e1e',
                  borderRadius: '10px',
                  padding: '12px 18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ minWidth: '85px', flexShrink: 0 }}>
                  <p style={{ fontSize: '11px', color: '#39ff14', fontWeight: 700 }}>{m.day}</p>
                  <p style={{ fontSize: '16px', color: '#fff', fontWeight: 900 }}>{m.time}</p>
                </div>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '12px', paddingLeft: '16px', borderLeft: '1px solid #222' }}>
                  <TeamAvatar name={m.home} size={30} />
                  <span style={{ fontWeight: 700, color: '#fff', fontSize: '13px' }}>{m.home}</span>
                  <span style={{ color: '#555', fontSize: '11px', fontWeight: 600 }}>vs</span>
                  <span style={{ fontWeight: 700, color: '#fff', fontSize: '13px' }}>{m.away}</span>
                  <TeamAvatar name={m.away} size={30} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexShrink: 0 }}>
                  <span className="gt-badge-league" style={{ fontSize: '9px', padding: '3px 8px' }}>
                    {m.league}
                  </span>
                  <span style={{ fontWeight: 800, color: '#39ff14', fontSize: '14px', minWidth: '85px', textAlign: 'right' }}>
                    {formatCurrency(m.price)}
                  </span>
                  <span style={{ color: '#555', fontSize: '16px' }}>›</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
