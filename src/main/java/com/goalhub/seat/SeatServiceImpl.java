package com.goalhub.seat;

import com.goalhub.exception.ResourceNotFoundException;
import com.goalhub.match.Match;
import com.goalhub.match.MatchRepository;
import com.goalhub.seat.dto.BulkSeatRequest;
import com.goalhub.seat.dto.BulkSeatResponse;
import com.goalhub.seat.dto.SeatRequest;
import com.goalhub.seat.dto.SeatResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * Implementation of {@link SeatService}.
 *
 * <p>Business rules enforced here:
 * <ul>
 *   <li>Match must exist before seats can be listed or created.
 *   <li>seat_code must be unique per match — checked both within the request
 *       (duplicates in same payload) and against existing DB records.
 *   <li>All seats in a bulk request are persisted in a single transaction.
 * </ul>
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SeatServiceImpl implements SeatService {

    private final SeatRepository seatRepository;
    private final MatchRepository matchRepository;

    // ─── Queries ─────────────────────────────────────────────────────────────────

    @Override
    public List<SeatResponse> getSeatsByMatch(Long matchId) {
        verifyMatchExists(matchId);
        List<Seat> seats = seatRepository.findByMatchIdOrderBySeatCodeAsc(matchId);
        log.debug("Found {} seats for matchId={}", seats.size(), matchId);
        return seats.stream().map(SeatResponse::from).toList();
    }

    // ─── Commands ────────────────────────────────────────────────────────────────

    @Override
    @Transactional
    public BulkSeatResponse bulkCreateSeats(Long matchId, BulkSeatRequest request) {
        Match match = findMatchOrThrow(matchId);
        List<SeatRequest> seatRequests = request.seats();

        log.debug("Bulk creating {} seats for matchId={}", seatRequests.size(), matchId);

        // 1. Check for duplicates within the request payload itself
        Set<String> requestCodes = new HashSet<>();
        List<String> duplicatesInRequest = new ArrayList<>();
        for (SeatRequest sr : seatRequests) {
            if (!requestCodes.add(sr.seatCode())) {
                duplicatesInRequest.add(sr.seatCode());
            }
        }
        if (!duplicatesInRequest.isEmpty()) {
            throw new IllegalArgumentException(
                "Duplicate seat codes in request: " + duplicatesInRequest);
        }

        // 2. Check against existing seats in the DB
        List<String> alreadyExists = seatRequests.stream()
                .map(SeatRequest::seatCode)
                .filter(code -> seatRepository.existsByMatchIdAndSeatCode(matchId, code))
                .toList();
        if (!alreadyExists.isEmpty()) {
            throw new IllegalArgumentException(
                "Seat codes already exist for this match: " + alreadyExists);
        }

        // 3. Build and persist all seat entities
        List<Seat> seats = seatRequests.stream()
                .map(sr -> Seat.builder()
                        .match(match)
                        .seatCode(sr.seatCode())
                        .seatClass(sr.seatClass())
                        .price(sr.price())
                        .status(SeatStatus.AVAILABLE)
                        .version(0L)
                        .build())
                .toList();

        List<Seat> saved = seatRepository.saveAll(seats);
        log.info("Created {} seats for matchId={}", saved.size(), matchId);

        List<SeatResponse> responses = saved.stream().map(SeatResponse::from).toList();
        return new BulkSeatResponse(saved.size(), responses);
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────────

    private void verifyMatchExists(Long matchId) {
        if (!matchRepository.existsById(matchId)) {
            throw new ResourceNotFoundException("Match", "id", matchId);
        }
    }

    private Match findMatchOrThrow(Long matchId) {
        return matchRepository.findById(matchId)
                .orElseThrow(() -> new ResourceNotFoundException("Match", "id", matchId));
    }
}
