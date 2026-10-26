package com.goalhub.match;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface MatchRepository extends JpaRepository<Match, Long> {

    /** Paginated list filtered by status. */
    Page<Match> findByStatus(MatchStatus status, Pageable pageable);

    /** All upcoming matches from a given date onwards, ordered by match date. */
    List<Match> findByStatusAndMatchDateAfterOrderByMatchDateAsc(
            MatchStatus status, LocalDateTime after);

    /** Search by team name (home or away, case-insensitive). */
    @Query("""
            SELECT m FROM Match m
            WHERE LOWER(m.homeTeam) LIKE LOWER(CONCAT('%', :team, '%'))
               OR LOWER(m.awayTeam) LIKE LOWER(CONCAT('%', :team, '%'))
            """)
    Page<Match> findByTeamName(@Param("team") String team, Pageable pageable);

    /** Count available matches (UPCOMING with seats remaining). */
    @Query("""
            SELECT COUNT(m) FROM Match m
            WHERE m.status = 'UPCOMING' AND m.availableSeats > 0
            """)
    long countAvailable();

    /**
     * Atomically decrement available seats directly at SQL engine level.
     * Prevents lost updates and eliminates deadlocks caused by reading then writing back.
     *
     * @return 1 if successfully decremented, 0 if not enough available seats
     */
    @org.springframework.data.jpa.repository.Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE Match m SET m.availableSeats = m.availableSeats - :count WHERE m.id = :matchId AND m.availableSeats >= :count")
    int decrementAvailableSeats(@Param("matchId") Long matchId, @Param("count") int count);

    /**
     * Atomically increment available seats (e.g. order cancelled or expired).
     */
    @org.springframework.data.jpa.repository.Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE Match m SET m.availableSeats = m.availableSeats + :count WHERE m.id = :matchId")
    int incrementAvailableSeats(@Param("matchId") Long matchId, @Param("count") int count);
}
