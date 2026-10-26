package com.goalhub.config;

import com.goalhub.match.Match;
import com.goalhub.match.MatchRepository;
import com.goalhub.match.MatchStatus;
import com.goalhub.seat.Seat;
import com.goalhub.seat.SeatClass;
import com.goalhub.seat.SeatRepository;
import com.goalhub.seat.SeatStatus;
import com.goalhub.user.Role;
import com.goalhub.user.User;
import com.goalhub.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;

/**
 * Seeds the database with demo data on application startup.
 * Only runs in dev profile when the users table is empty (first-time setup).
 */
@Component
@Profile("dev")
@RequiredArgsConstructor
@Slf4j
public class DataSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final MatchRepository matchRepository;
    private final SeatRepository seatRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void run(String... args) {
        if (userRepository.count() > 0) {
            log.info("Database already has data — skipping seed.");
            return;
        }

        log.info("═══ Seeding GoalHub demo data ═══");

        // ─── Users ────────────────────────────────────────────────
        User user = userRepository.save(User.builder()
                .email("user@goalhub.vn")
                .password(passwordEncoder.encode("password"))
                .fullName("Nguyễn Văn An")
                .role(Role.USER)
                .build());

        User admin = userRepository.save(User.builder()
                .email("admin@goalhub.vn")
                .password(passwordEncoder.encode("admin123"))
                .fullName("Admin GoalHub")
                .role(Role.ADMIN)
                .build());

        log.info("✓ Created 2 users (user@goalhub.vn / admin@goalhub.vn)");

        // ─── Matches ──────────────────────────────────────────────
        Object[][] matchData = {
            {"Hà Nội FC", "TP.HCM FC", 15, "Sân Vận Động Mỹ Đình, Hà Nội", "UPCOMING", 160, 150000},
            {"Viettel FC", "Becamex Bình Dương", 18, "Sân Hàng Đẫy, Hà Nội", "UPCOMING", 120, 120000},
            {"Hà Nội FC", "Viettel FC", -1, "Sân Vận Động Mỹ Đình, Hà Nội", "ONGOING", 160, 200000},
            {"HAGL", "SHB Đà Nẵng", 22, "Sân Pleiku, Gia Lai", "UPCOMING", 140, 100000},
            {"Nam Định FC", "Hải Phòng FC", 25, "Sân Thiên Trường, Nam Định", "UPCOMING", 180, 80000},
            {"Sài Gòn FC", "SLNA", 28, "Sân Thống Nhất, TP.HCM", "UPCOMING", 100, 90000},
            {"Thanh Hoá FC", "Quảng Nam FC", -10, "Sân Thanh Hoá", "COMPLETED", 120, 70000},
            {"Bình Định FC", "Khánh Hoà FC", -5, "Sân Quy Nhơn", "COMPLETED", 100, 85000},
            {"HAGL", "Hà Nội FC", 30, "Sân Pleiku, Gia Lai", "UPCOMING", 140, 180000},
        };

        List<Match> matches = new ArrayList<>();
        for (Object[] md : matchData) {
            MatchStatus status = MatchStatus.valueOf((String) md[4]);
            Match match = matchRepository.save(Match.builder()
                    .homeTeam((String) md[0])
                    .awayTeam((String) md[1])
                    .matchDate(LocalDateTime.now().plusDays((int) md[2]).withHour(19).withMinute(30).withSecond(0).withNano(0))
                    .venue((String) md[3])
                    .status(status)
                    .totalSeats((int) md[5])
                    .availableSeats((int) md[5])
                    .ticketPrice(BigDecimal.valueOf((int) md[6]))
                    .build());
            matches.add(match);
        }

        log.info("✓ Created {} matches", matches.size());

        // ─── Seats for each match ──────────────────────────────────
        Random rng = new Random(42); // deterministic for consistency
        String[] vipRows = {"VIP-A", "VIP-B", "VIP-C"};
        String[] stdRows = {"D", "E", "F", "G", "H"};
        int seatsPerRow = 20;

        for (Match match : matches) {
            List<Seat> seats = new ArrayList<>();
            BigDecimal basePrice = match.getTicketPrice();
            BigDecimal vipPrice = basePrice.multiply(BigDecimal.valueOf(2));

            // VIP seats (3 rows × 20)
            for (String row : vipRows) {
                for (int col = 1; col <= seatsPerRow; col++) {
                    SeatStatus st = randomSeatStatus(rng, match.getStatus());
                    seats.add(Seat.builder()
                            .match(match)
                            .seatCode(row + col)
                            .seatClass(SeatClass.VIP)
                            .price(vipPrice)
                            .status(st)
                            .build());
                }
            }

            // Standard seats (5 rows × 20)
            for (String row : stdRows) {
                for (int col = 1; col <= seatsPerRow; col++) {
                    SeatStatus st = randomSeatStatus(rng, match.getStatus());
                    seats.add(Seat.builder()
                            .match(match)
                            .seatCode(row + col)
                            .seatClass(SeatClass.STANDARD)
                            .price(basePrice)
                            .status(st)
                            .build());
                }
            }

            seatRepository.saveAll(seats);

            // Update available count
            long available = seats.stream().filter(s -> s.getStatus() == SeatStatus.AVAILABLE).count();
            match.setTotalSeats(seats.size());
            match.setAvailableSeats((int) available);
            matchRepository.save(match);
        }

        log.info("✓ Created {} seats per match ({} rows × {} seats)", seatsPerRow * 8, 8, seatsPerRow);
        log.info("═══ Seed complete ═══");
    }

    private SeatStatus randomSeatStatus(Random rng, MatchStatus matchStatus) {
        if (matchStatus == MatchStatus.COMPLETED) {
            // Completed matches — mostly sold
            int r = rng.nextInt(100);
            if (r < 85) return SeatStatus.SOLD;
            if (r < 95) return SeatStatus.RESERVED;
            return SeatStatus.AVAILABLE;
        }
        // Upcoming/Ongoing — mix of statuses
        int r = rng.nextInt(100);
        if (r < 45) return SeatStatus.AVAILABLE;
        if (r < 70) return SeatStatus.SOLD;
        if (r < 85) return SeatStatus.RESERVED;
        return SeatStatus.AVAILABLE;
    }
}
