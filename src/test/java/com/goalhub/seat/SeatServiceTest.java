package com.goalhub.seat;

import com.goalhub.exception.ResourceNotFoundException;
import com.goalhub.match.Match;
import com.goalhub.match.MatchRepository;
import com.goalhub.match.MatchStatus;
import com.goalhub.seat.dto.BulkSeatRequest;
import com.goalhub.seat.dto.BulkSeatResponse;
import com.goalhub.seat.dto.SeatRequest;
import com.goalhub.seat.dto.SeatResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("SeatServiceImpl – Unit Tests")
class SeatServiceTest {

    @Mock
    private SeatRepository seatRepository;

    @Mock
    private MatchRepository matchRepository;

    @InjectMocks
    private SeatServiceImpl seatService;

    private Match sampleMatch;
    private Seat sampleSeat;

    @BeforeEach
    void setUp() {
        sampleMatch = Match.builder()
                .id(1L)
                .homeTeam("Manchester United")
                .awayTeam("Liverpool")
                .matchDate(LocalDateTime.now().plusDays(7))
                .venue("Old Trafford")
                .status(MatchStatus.UPCOMING)
                .totalSeats(75000)
                .availableSeats(75000)
                .ticketPrice(new BigDecimal("150.00"))
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        sampleSeat = Seat.builder()
                .id(1L)
                .match(sampleMatch)
                .seatCode("A1")
                .seatClass(SeatClass.STANDARD)
                .price(new BigDecimal("150.00"))
                .status(SeatStatus.AVAILABLE)
                .version(0L)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
    }

    // ─── getSeatsByMatch ──────────────────────────────────────────────────────────

    @Nested
    @DisplayName("getSeatsByMatch()")
    class GetSeatsByMatch {

        @Test
        @DisplayName("returns list of seats when match exists")
        void returnsSeatListForExistingMatch() {
            when(matchRepository.existsById(1L)).thenReturn(true);
            when(seatRepository.findByMatchIdOrderBySeatCodeAsc(1L))
                    .thenReturn(List.of(sampleSeat));

            List<SeatResponse> result = seatService.getSeatsByMatch(1L);

            assertThat(result).hasSize(1);
            assertThat(result.get(0).seatCode()).isEqualTo("A1");
            assertThat(result.get(0).matchId()).isEqualTo(1L);
            assertThat(result.get(0).status()).isEqualTo(SeatStatus.AVAILABLE);
        }

        @Test
        @DisplayName("returns empty list when match has no seats")
        void returnsEmptyListWhenNoSeats() {
            when(matchRepository.existsById(1L)).thenReturn(true);
            when(seatRepository.findByMatchIdOrderBySeatCodeAsc(1L)).thenReturn(List.of());

            List<SeatResponse> result = seatService.getSeatsByMatch(1L);

            assertThat(result).isEmpty();
        }

        @Test
        @DisplayName("throws ResourceNotFoundException when match does not exist")
        void throwsNotFoundForNonExistentMatch() {
            when(matchRepository.existsById(99L)).thenReturn(false);

            assertThatThrownBy(() -> seatService.getSeatsByMatch(99L))
                    .isInstanceOf(ResourceNotFoundException.class)
                    .hasMessageContaining("Match")
                    .hasMessageContaining("99");

            verify(seatRepository, never()).findByMatchIdOrderBySeatCodeAsc(any());
        }
    }

    // ─── bulkCreateSeats ─────────────────────────────────────────────────────────

    @Nested
    @DisplayName("bulkCreateSeats()")
    class BulkCreateSeats {

        private BulkSeatRequest validBulkRequest;

        @BeforeEach
        void setUpRequest() {
            validBulkRequest = new BulkSeatRequest(List.of(
                    new SeatRequest("A1", SeatClass.STANDARD, new BigDecimal("150.00")),
                    new SeatRequest("VIP-01", SeatClass.VIP, new BigDecimal("500.00"))
            ));
        }

        @Test
        @DisplayName("creates all seats and returns count + list")
        void createsSeatsSuccessfully() {
            when(matchRepository.findById(1L)).thenReturn(Optional.of(sampleMatch));
            when(seatRepository.existsByMatchIdAndSeatCode(eq(1L), anyString())).thenReturn(false);

            Seat vipSeat = Seat.builder()
                    .id(2L).match(sampleMatch)
                    .seatCode("VIP-01").seatClass(SeatClass.VIP)
                    .price(new BigDecimal("500.00")).status(SeatStatus.AVAILABLE)
                    .version(0L)
                    .createdAt(LocalDateTime.now()).updatedAt(LocalDateTime.now())
                    .build();

            when(seatRepository.saveAll(anyList())).thenReturn(List.of(sampleSeat, vipSeat));

            BulkSeatResponse response = seatService.bulkCreateSeats(1L, validBulkRequest);

            assertThat(response.created()).isEqualTo(2);
            assertThat(response.seats()).hasSize(2);
            assertThat(response.seats())
                    .extracting(SeatResponse::seatCode)
                    .containsExactlyInAnyOrder("A1", "VIP-01");
        }

        @Test
        @DisplayName("throws ResourceNotFoundException when match does not exist")
        void throwsNotFoundWhenMatchMissing() {
            when(matchRepository.findById(99L)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> seatService.bulkCreateSeats(99L, validBulkRequest))
                    .isInstanceOf(ResourceNotFoundException.class)
                    .hasMessageContaining("Match");

            verify(seatRepository, never()).saveAll(any());
        }

        @Test
        @DisplayName("throws IllegalArgumentException when seat codes duplicate within request")
        void throwsOnDuplicateCodesInRequest() {
            BulkSeatRequest duplicateRequest = new BulkSeatRequest(List.of(
                    new SeatRequest("A1", SeatClass.STANDARD, new BigDecimal("150.00")),
                    new SeatRequest("A1", SeatClass.VIP, new BigDecimal("500.00"))  // duplicate
            ));
            when(matchRepository.findById(1L)).thenReturn(Optional.of(sampleMatch));

            assertThatThrownBy(() -> seatService.bulkCreateSeats(1L, duplicateRequest))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("Duplicate seat codes")
                    .hasMessageContaining("A1");

            verify(seatRepository, never()).saveAll(any());
        }

        @Test
        @DisplayName("throws IllegalArgumentException when seat code already exists in DB")
        void throwsWhenSeatCodeAlreadyExistsInDb() {
            when(matchRepository.findById(1L)).thenReturn(Optional.of(sampleMatch));
            // "A1" already exists in DB
            when(seatRepository.existsByMatchIdAndSeatCode(1L, "A1")).thenReturn(true);
            when(seatRepository.existsByMatchIdAndSeatCode(1L, "VIP-01")).thenReturn(false);

            assertThatThrownBy(() -> seatService.bulkCreateSeats(1L, validBulkRequest))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("already exist")
                    .hasMessageContaining("A1");

            verify(seatRepository, never()).saveAll(any());
        }

        @Test
        @DisplayName("all created seats default to AVAILABLE status and version=0")
        void createdSeatsHaveCorrectDefaults() {
            when(matchRepository.findById(1L)).thenReturn(Optional.of(sampleMatch));
            when(seatRepository.existsByMatchIdAndSeatCode(anyLong(), anyString())).thenReturn(false);
            when(seatRepository.saveAll(anyList())).thenAnswer(inv -> {
                List<Seat> seats = inv.getArgument(0);
                // simulate id assignment and return as-is
                for (int i = 0; i < seats.size(); i++) {
                    seats.get(i).setId((long) (i + 1));
                    seats.get(i).setCreatedAt(LocalDateTime.now());
                    seats.get(i).setUpdatedAt(LocalDateTime.now());
                }
                return seats;
            });

            BulkSeatResponse response = seatService.bulkCreateSeats(1L, validBulkRequest);

            assertThat(response.seats())
                    .allMatch(s -> s.status() == SeatStatus.AVAILABLE)
                    .allMatch(s -> s.version() == 0L);
        }
    }
}
