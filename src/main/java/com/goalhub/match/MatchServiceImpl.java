package com.goalhub.match;

import com.goalhub.exception.ResourceNotFoundException;
import com.goalhub.match.dto.MatchRequest;
import com.goalhub.match.dto.MatchResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Implementation of {@link MatchService}.
 *
 * <p>Business rules:
 * <ul>
 *   <li>availableSeats defaults to totalSeats on creation (handled in entity @PrePersist).
 *   <li>When updating, if totalSeats changes, availableSeats is adjusted proportionally
 *       only if it hasn't been touched by bookings — handled explicitly here.
 * </ul>
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MatchServiceImpl implements MatchService {

    private final MatchRepository matchRepository;

    // ─── Queries ─────────────────────────────────────────────────────────────────

    @Override
    public Page<MatchResponse> getAllMatches(MatchStatus status, Pageable pageable) {
        Page<Match> matches = (status != null)
                ? matchRepository.findByStatus(status, pageable)
                : matchRepository.findAll(pageable);

        return matches.map(MatchResponse::from);
    }

    @Override
    public MatchResponse getMatchById(Long id) {
        Match match = findOrThrow(id);
        return MatchResponse.from(match);
    }

    // ─── Commands ────────────────────────────────────────────────────────────────

    @Override
    @Transactional
    public MatchResponse createMatch(MatchRequest request) {
        log.debug("Creating match: {} vs {}", request.homeTeam(), request.awayTeam());

        Match match = Match.builder()
                .homeTeam(request.homeTeam())
                .awayTeam(request.awayTeam())
                .matchDate(request.matchDate())
                .venue(request.venue())
                .status(request.status() != null ? request.status() : MatchStatus.UPCOMING)
                .totalSeats(request.totalSeats())
                .availableSeats(request.totalSeats())  // explicitly set on create
                .ticketPrice(request.ticketPrice())
                .build();

        Match saved = matchRepository.save(match);
        log.info("Match created with id={}", saved.getId());
        return MatchResponse.from(saved);
    }

    @Override
    @Transactional
    public MatchResponse updateMatch(Long id, MatchRequest request) {
        log.debug("Updating match id={}", id);

        Match match = findOrThrow(id);

        int seatsBooked = match.getTotalSeats() - match.getAvailableSeats();

        match.setHomeTeam(request.homeTeam());
        match.setAwayTeam(request.awayTeam());
        match.setMatchDate(request.matchDate());
        match.setVenue(request.venue());
        match.setTicketPrice(request.ticketPrice());
        match.setTotalSeats(request.totalSeats());

        if (request.status() != null) {
            match.setStatus(request.status());
        }

        // Recalculate available seats: new total minus already booked
        int newAvailable = request.totalSeats() - seatsBooked;
        match.setAvailableSeats(Math.max(0, newAvailable));

        Match updated = matchRepository.save(match);
        log.info("Match id={} updated", id);
        return MatchResponse.from(updated);
    }

    @Override
    @Transactional
    public void deleteMatch(Long id) {
        log.debug("Deleting match id={}", id);
        Match match = findOrThrow(id);
        matchRepository.delete(match);
        log.info("Match id={} deleted", id);
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────────

    private Match findOrThrow(Long id) {
        return matchRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Match", "id", id));
    }
}
