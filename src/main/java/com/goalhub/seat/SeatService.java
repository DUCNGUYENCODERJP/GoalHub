package com.goalhub.seat;

import com.goalhub.seat.dto.BulkSeatRequest;
import com.goalhub.seat.dto.BulkSeatResponse;
import com.goalhub.seat.dto.SeatResponse;

import java.util.List;

/**
 * Service contract for Seat operations.
 */
public interface SeatService {

    /**
     * Get all seats belonging to a specific match.
     *
     * @param matchId ID of the match
     * @return ordered list of seats (by seat_code)
     * @throws com.goalhub.exception.ResourceNotFoundException if match does not exist
     */
    List<SeatResponse> getSeatsByMatch(Long matchId);

    /**
     * Bulk-create seats for a match.
     *
     * <p>Rules:
     * <ul>
     *   <li>Match must exist.
     *   <li>Each seat_code must be unique within the match.
     *   <li>Duplicate seat_codes within the same request are rejected.
     * </ul>
     *
     * @param matchId ID of the match
     * @param request bulk seat request containing list of seats to create
     * @return summary of created seats
     * @throws com.goalhub.exception.ResourceNotFoundException if match does not exist
     * @throws IllegalArgumentException                        if any seat_code duplicates are detected
     */
    BulkSeatResponse bulkCreateSeats(Long matchId, BulkSeatRequest request);
}
