package com.goalhub.match;

import com.goalhub.exception.ResourceNotFoundException;
import com.goalhub.match.dto.MatchRequest;
import com.goalhub.match.dto.MatchResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("MatchServiceImpl – Unit Tests")
class MatchServiceTest {

    @Mock
    private MatchRepository matchRepository;

    @InjectMocks
    private MatchServiceImpl matchService;

    private Match sampleMatch;
    private MatchRequest sampleRequest;

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

        sampleRequest = new MatchRequest(
                "Manchester United",
                "Liverpool",
                LocalDateTime.now().plusDays(7),
                "Old Trafford",
                MatchStatus.UPCOMING,
                75000,
                new BigDecimal("150.00")
        );
    }

    // ─── getAllMatches ────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("getAllMatches()")
    class GetAllMatches {

        @Test
        @DisplayName("returns paginated list when status is null")
        void returnsAllMatchesWhenNoStatusFilter() {
            PageRequest pageable = PageRequest.of(0, 20);
            when(matchRepository.findAll(pageable))
                    .thenReturn(new PageImpl<>(List.of(sampleMatch)));

            Page<MatchResponse> result = matchService.getAllMatches(null, pageable);

            assertThat(result.getContent()).hasSize(1);
            assertThat(result.getContent().get(0).id()).isEqualTo(1L);
            verify(matchRepository).findAll(pageable);
            verify(matchRepository, never()).findByStatus(any(), any());
        }

        @Test
        @DisplayName("filters by status when provided")
        void filtersMatchesByStatus() {
            PageRequest pageable = PageRequest.of(0, 20);
            when(matchRepository.findByStatus(MatchStatus.UPCOMING, pageable))
                    .thenReturn(new PageImpl<>(List.of(sampleMatch)));

            Page<MatchResponse> result = matchService.getAllMatches(MatchStatus.UPCOMING, pageable);

            assertThat(result.getContent()).hasSize(1);
            assertThat(result.getContent().get(0).status()).isEqualTo(MatchStatus.UPCOMING);
            verify(matchRepository).findByStatus(MatchStatus.UPCOMING, pageable);
        }
    }

    // ─── getMatchById ─────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("getMatchById()")
    class GetMatchById {

        @Test
        @DisplayName("returns match when found")
        void returnsMatchWhenFound() {
            when(matchRepository.findById(1L)).thenReturn(Optional.of(sampleMatch));

            MatchResponse response = matchService.getMatchById(1L);

            assertThat(response.id()).isEqualTo(1L);
            assertThat(response.homeTeam()).isEqualTo("Manchester United");
            assertThat(response.awayTeam()).isEqualTo("Liverpool");
        }

        @Test
        @DisplayName("throws ResourceNotFoundException when not found")
        void throwsNotFoundWhenMatchMissing() {
            when(matchRepository.findById(99L)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> matchService.getMatchById(99L))
                    .isInstanceOf(ResourceNotFoundException.class)
                    .hasMessageContaining("Match")
                    .hasMessageContaining("99");
        }
    }

    // ─── createMatch ─────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("createMatch()")
    class CreateMatch {

        @Test
        @DisplayName("saves match and returns response with generated id")
        void createsMatchSuccessfully() {
            when(matchRepository.save(any(Match.class))).thenReturn(sampleMatch);

            MatchResponse response = matchService.createMatch(sampleRequest);

            assertThat(response.id()).isEqualTo(1L);
            assertThat(response.homeTeam()).isEqualTo("Manchester United");
            assertThat(response.ticketPrice()).isEqualByComparingTo("150.00");
            assertThat(response.availableSeats()).isEqualTo(75000);

            verify(matchRepository).save(any(Match.class));
        }

        @Test
        @DisplayName("defaults status to UPCOMING when request status is null")
        void defaultsStatusToUpcoming() {
            MatchRequest requestWithNullStatus = new MatchRequest(
                    "Team A", "Team B",
                    LocalDateTime.now().plusDays(1),
                    "Stadium X",
                    null,  // <-- null status
                    1000,
                    new BigDecimal("50.00")
            );

            when(matchRepository.save(any(Match.class))).thenAnswer(inv -> {
                Match m = inv.getArgument(0);
                m.setId(2L);
                return m;
            });

            MatchResponse response = matchService.createMatch(requestWithNullStatus);

            // status should default to UPCOMING
            assertThat(response.status()).isEqualTo(MatchStatus.UPCOMING);
        }
    }

    // ─── updateMatch ─────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("updateMatch()")
    class UpdateMatch {

        @Test
        @DisplayName("updates all fields and preserves booking count")
        void updatesMatchAndPreservesBookings() {
            // Simulate 500 seats already booked
            sampleMatch.setAvailableSeats(74500);

            when(matchRepository.findById(1L)).thenReturn(Optional.of(sampleMatch));
            when(matchRepository.save(any(Match.class))).thenAnswer(inv -> inv.getArgument(0));

            MatchRequest updateRequest = new MatchRequest(
                    "Manchester United",
                    "Chelsea",
                    LocalDateTime.now().plusDays(14),
                    "Old Trafford",
                    MatchStatus.UPCOMING,
                    80000,  // increased capacity
                    new BigDecimal("200.00")
            );

            MatchResponse response = matchService.updateMatch(1L, updateRequest);

            assertThat(response.awayTeam()).isEqualTo("Chelsea");
            assertThat(response.totalSeats()).isEqualTo(80000);
            // 80000 total - 500 already booked = 79500 available
            assertThat(response.availableSeats()).isEqualTo(79500);
            assertThat(response.ticketPrice()).isEqualByComparingTo("200.00");
        }

        @Test
        @DisplayName("throws ResourceNotFoundException when match not found")
        void throwsNotFoundOnUpdate() {
            when(matchRepository.findById(99L)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> matchService.updateMatch(99L, sampleRequest))
                    .isInstanceOf(ResourceNotFoundException.class);
        }
    }

    // ─── deleteMatch ─────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("deleteMatch()")
    class DeleteMatch {

        @Test
        @DisplayName("deletes match when found")
        void deletesMatchSuccessfully() {
            when(matchRepository.findById(1L)).thenReturn(Optional.of(sampleMatch));

            assertThatNoException().isThrownBy(() -> matchService.deleteMatch(1L));

            verify(matchRepository).delete(sampleMatch);
        }

        @Test
        @DisplayName("throws ResourceNotFoundException when not found")
        void throwsNotFoundOnDelete() {
            when(matchRepository.findById(99L)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> matchService.deleteMatch(99L))
                    .isInstanceOf(ResourceNotFoundException.class);

            verify(matchRepository, never()).delete(any());
        }
    }
}
