package com.goalhub.match.dto;

import com.goalhub.match.Match;
import com.goalhub.match.MatchStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Response DTO for a {@link Match}.
 * Returned by all Match API endpoints.
 */
public record MatchResponse(
        Long id,
        String homeTeam,
        String awayTeam,
        LocalDateTime matchDate,
        String venue,
        MatchStatus status,
        Integer totalSeats,
        Integer availableSeats,
        BigDecimal ticketPrice,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
    /**
     * Static factory — maps from {@link Match} entity to this DTO.
     * Keeps entity-to-DTO conversion co-located with the DTO.
     */
    public static MatchResponse from(Match match) {
        return new MatchResponse(
                match.getId(),
                match.getHomeTeam(),
                match.getAwayTeam(),
                match.getMatchDate(),
                match.getVenue(),
                match.getStatus(),
                match.getTotalSeats(),
                match.getAvailableSeats(),
                match.getTicketPrice(),
                match.getCreatedAt(),
                match.getUpdatedAt()
        );
    }
}
