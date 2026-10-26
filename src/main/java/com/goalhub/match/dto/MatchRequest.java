package com.goalhub.match.dto;

import com.goalhub.match.MatchStatus;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Request DTO for creating or updating a {@link com.goalhub.match.Match}.
 * Used for both POST (create) and PUT (update) — all fields validated.
 */
public record MatchRequest(

        @NotBlank(message = "Home team is required")
        @Size(max = 100, message = "Home team name must not exceed 100 characters")
        String homeTeam,

        @NotBlank(message = "Away team is required")
        @Size(max = 100, message = "Away team name must not exceed 100 characters")
        String awayTeam,

        @NotNull(message = "Match date is required")
        @Future(message = "Match date must be in the future")
        LocalDateTime matchDate,

        @NotBlank(message = "Venue is required")
        @Size(max = 200, message = "Venue must not exceed 200 characters")
        String venue,

        /** Defaults to UPCOMING if null. */
        MatchStatus status,

        @NotNull(message = "Total seats is required")
        @Min(value = 1, message = "Total seats must be at least 1")
        @Max(value = 200000, message = "Total seats cannot exceed 200,000")
        Integer totalSeats,

        @NotNull(message = "Ticket price is required")
        @DecimalMin(value = "0", message = "Ticket price cannot be negative")
        @Digits(integer = 12, fraction = 0, message = "Ticket price must be a whole number for VND")
        BigDecimal ticketPrice
) {}
