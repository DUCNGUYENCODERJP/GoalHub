package com.goalhub.seat.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.util.List;

/**
 * Request DTO for bulk-creating seats under a match.
 * Used by POST /api/matches/{matchId}/seats/bulk.
 */
public record BulkSeatRequest(

        @NotEmpty(message = "At least one seat must be provided")
        @Size(max = 500, message = "Cannot create more than 500 seats in a single request")
        @Valid
        List<SeatRequest> seats
) {}
