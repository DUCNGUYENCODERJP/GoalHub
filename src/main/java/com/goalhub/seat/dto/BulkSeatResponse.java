package com.goalhub.seat.dto;

import java.util.List;

/**
 * Response DTO returned after a bulk seat creation.
 */
public record BulkSeatResponse(
        int created,
        List<SeatResponse> seats
) {}
