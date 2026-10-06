package com.goalhub.seat;

import com.goalhub.seat.dto.BulkSeatRequest;
import com.goalhub.seat.dto.BulkSeatResponse;
import com.goalhub.seat.dto.SeatResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST controller for Seat resources, scoped under a Match.
 *
 * <p>Authorization:
 * <ul>
 *   <li>GET  /api/matches/{matchId}/seats       – PUBLIC
 *   <li>POST /api/matches/{matchId}/seats/bulk  – ADMIN only
 * </ul>
 */
@RestController
@RequestMapping("/api/matches/{matchId}/seats")
@RequiredArgsConstructor
public class SeatController {

    private final SeatService seatService;

    /**
     * GET /api/matches/{matchId}/seats
     * Returns all seats for a given match, ordered by seat_code.
     * Public — no authentication required.
     */
    @GetMapping
    public ResponseEntity<List<SeatResponse>> getSeatsByMatch(
            @PathVariable Long matchId) {
        return ResponseEntity.ok(seatService.getSeatsByMatch(matchId));
    }

    /**
     * POST /api/matches/{matchId}/seats/bulk
     * Bulk-create seats for a match. Requires ADMIN role.
     *
     * <p>Returns 201 with the list of created seats and total count.
     */
    @PostMapping("/bulk")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<BulkSeatResponse> bulkCreateSeats(
            @PathVariable Long matchId,
            @Valid @RequestBody BulkSeatRequest request) {
        BulkSeatResponse response = seatService.bulkCreateSeats(matchId, request);
        return ResponseEntity.status(201).body(response);
    }
}
