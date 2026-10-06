/**
 * mockData.js — Sample data for GoalHub UI demo
 * Replace with real API calls when backend is ready.
 */

export const MOCK_MATCHES = [
  {
    id: 1,
    homeTeam: 'Hà Nội FC',
    awayTeam: 'TP.HCM FC',
    matchDate: '2026-10-15T19:30:00',
    venue: 'Sân Vận Động Mỹ Đình, Hà Nội',
    totalSeats: 200,
    availableSeats: 87,
    ticketPrice: 150000,
    status: 'UPCOMING',
    league: 'V.League 1',
    homeTeamLogo: '🔵',
    awayTeamLogo: '🔴',
  },
  {
    id: 2,
    homeTeam: 'Viettel FC',
    awayTeam: 'Becamex Bình Dương',
    matchDate: '2026-10-18T17:00:00',
    venue: 'Sân Vận Động Mỹ Đình, Hà Nội',
    totalSeats: 180,
    availableSeats: 42,
    ticketPrice: 120000,
    status: 'UPCOMING',
    league: 'V.League 1',
    homeTeamLogo: '🔴',
    awayTeamLogo: '🟡',
  },
  {
    id: 3,
    homeTeam: 'Thanh Hóa FC',
    awayTeam: 'Nam Định FC',
    matchDate: '2026-10-20T19:00:00',
    venue: 'Sân Vận Động Thanh Hóa',
    totalSeats: 160,
    availableSeats: 160,
    ticketPrice: 100000,
    status: 'UPCOMING',
    league: 'V.League 1',
    homeTeamLogo: '🟠',
    awayTeamLogo: '🔴',
  },
  {
    id: 4,
    homeTeam: 'SLNA',
    awayTeam: 'Hải Phòng FC',
    matchDate: '2026-10-22T18:00:00',
    venue: 'Sân Vận Động Vinh',
    totalSeats: 150,
    availableSeats: 0,
    ticketPrice: 80000,
    status: 'UPCOMING',
    league: 'V.League 1',
    homeTeamLogo: '🔴',
    awayTeamLogo: '🔵',
  },
  {
    id: 5,
    homeTeam: 'Hà Nội FC',
    awayTeam: 'Viettel FC',
    matchDate: '2026-10-05T19:30:00',
    venue: 'Sân Vận Động Mỹ Đình, Hà Nội',
    totalSeats: 200,
    availableSeats: 0,
    ticketPrice: 200000,
    status: 'ONGOING',
    league: 'Cúp Quốc Gia',
    homeTeamLogo: '🔵',
    awayTeamLogo: '🔴',
  },
  {
    id: 6,
    homeTeam: 'TP.HCM FC',
    awayTeam: 'HAGL',
    matchDate: '2026-09-28T17:00:00',
    venue: 'Sân Vận Động Thống Nhất, TP.HCM',
    totalSeats: 180,
    availableSeats: 0,
    ticketPrice: 130000,
    status: 'COMPLETED',
    league: 'V.League 1',
    homeTeamLogo: '🔴',
    awayTeamLogo: '🟡',
  },
  {
    id: 7,
    homeTeam: 'Bình Định FC',
    awayTeam: 'Đà Nẵng FC',
    matchDate: '2026-10-25T19:00:00',
    venue: 'Sân Vận Động Quy Nhơn',
    totalSeats: 130,
    availableSeats: 118,
    ticketPrice: 90000,
    status: 'UPCOMING',
    league: 'V.League 1',
    homeTeamLogo: '🟡',
    awayTeamLogo: '🔵',
  },
  {
    id: 8,
    homeTeam: 'HAGL',
    awayTeam: 'Quảng Nam FC',
    matchDate: '2026-10-28T17:00:00',
    venue: 'Sân Vận Động Pleiku',
    totalSeats: 140,
    availableSeats: 95,
    ticketPrice: 100000,
    status: 'UPCOMING',
    league: 'V.League 1',
    homeTeamLogo: '🟡',
    awayTeamLogo: '🔵',
  },
  {
    id: 9,
    homeTeam: 'Hà Nội FC',
    awayTeam: 'SLNA',
    matchDate: '2026-09-15T19:30:00',
    venue: 'Sân Vận Động Mỹ Đình, Hà Nội',
    totalSeats: 200,
    availableSeats: 0,
    ticketPrice: 150000,
    status: 'CANCELLED',
    league: 'V.League 1',
    homeTeamLogo: '🔵',
    awayTeamLogo: '🔴',
  },
];

// Generate seats for a match
function generateMatchSeats(matchId) {
  const seats = [];
  let id = (matchId - 1) * 200 + 1;

  // VIP rows A-C
  for (let row = 0; row < 3; row++) {
    const rowLetter = String.fromCharCode(65 + row); // A, B, C
    for (let num = 1; num <= 20; num++) {
      const statuses = ['AVAILABLE', 'AVAILABLE', 'AVAILABLE', 'SOLD', 'RESERVED'];
      const rand = matchId === 4 ? 'SOLD' : statuses[Math.floor(Math.random() * statuses.length)];
      seats.push({
        id: id++,
        seatCode: `VIP-${rowLetter}${num}`,
        seatClass: 'VIP',
        price: 300000,
        status: rand,
      });
    }
  }

  // Standard rows D-H
  for (let row = 3; row < 8; row++) {
    const rowLetter = String.fromCharCode(65 + row); // D, E, F, G, H
    for (let num = 1; num <= 20; num++) {
      const statuses = ['AVAILABLE', 'AVAILABLE', 'SOLD', 'RESERVED'];
      const rand = matchId === 4 ? 'SOLD' : statuses[Math.floor(Math.random() * statuses.length)];
      seats.push({
        id: id++,
        seatCode: `${rowLetter}${num}`,
        seatClass: 'STANDARD',
        price: 150000,
        status: rand,
      });
    }
  }

  return seats;
}

export const MOCK_SEATS = {};
for (let i = 1; i <= 9; i++) {
  MOCK_SEATS[i] = generateMatchSeats(i);
}

export const MOCK_ORDERS = [
  {
    id: 1001,
    homeTeam: 'Hà Nội FC',
    awayTeam: 'TP.HCM FC',
    matchDate: '2026-10-15T19:30:00',
    venue: 'Sân Vận Động Mỹ Đình',
    createdAt: '2026-10-01T10:30:00',
    status: 'PAID',
    totalAmount: 450000,
    items: [
      { orderItemId: 1, seatId: 101, seatCode: 'VIP-A1', seatClass: 'VIP', priceAtBooking: 300000, seatStatus: 'RESERVED' },
      { orderItemId: 2, seatId: 102, seatCode: 'VIP-A2', seatClass: 'VIP', priceAtBooking: 150000, seatStatus: 'RESERVED' },
    ],
  },
  {
    id: 1002,
    homeTeam: 'Viettel FC',
    awayTeam: 'Becamex Bình Dương',
    matchDate: '2026-10-18T17:00:00',
    venue: 'Sân Vận Động Mỹ Đình',
    createdAt: '2026-10-02T14:15:00',
    status: 'PENDING',
    totalAmount: 300000,
    items: [
      { orderItemId: 3, seatId: 201, seatCode: 'D5', seatClass: 'STANDARD', priceAtBooking: 150000, seatStatus: 'RESERVED' },
      { orderItemId: 4, seatId: 202, seatCode: 'D6', seatClass: 'STANDARD', priceAtBooking: 150000, seatStatus: 'RESERVED' },
    ],
  },
  {
    id: 1003,
    homeTeam: 'Hà Nội FC',
    awayTeam: 'Viettel FC',
    matchDate: '2026-10-05T19:30:00',
    venue: 'Sân Vận Động Mỹ Đình',
    createdAt: '2026-10-03T09:00:00',
    status: 'CANCELLED',
    totalAmount: 300000,
    items: [
      { orderItemId: 5, seatId: 301, seatCode: 'VIP-B3', seatClass: 'VIP', priceAtBooking: 300000, seatStatus: 'AVAILABLE' },
    ],
  },
];

export const MOCK_USER = {
  id: 1,
  fullName: 'Nguyễn Văn An',
  email: 'an.nguyen@example.com',
  role: 'USER',
};

export const MOCK_ADMIN = {
  id: 2,
  fullName: 'Trần Thị Bích',
  email: 'admin@goalhub.vn',
  role: 'ADMIN',
};
