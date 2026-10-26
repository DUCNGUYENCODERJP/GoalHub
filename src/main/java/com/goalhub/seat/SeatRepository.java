package com.goalhub.seat;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SeatRepository extends JpaRepository<Seat, Long> {

    /** All seats for a given match, ordered by seat code. */
    List<Seat> findByMatchIdOrderBySeatCodeAsc(Long matchId);

    /** Filter seats by match and status. */
    List<Seat> findByMatchIdAndStatusOrderBySeatCodeAsc(Long matchId, SeatStatus status);

    /** Check if a seat_code already exists for a given match (for uniqueness validation). */
    boolean existsByMatchIdAndSeatCode(Long matchId, String seatCode);

    /** Count seats by match and status. */
    long countByMatchIdAndStatus(Long matchId, SeatStatus status);

    /**
     * Load all seats for a match with the match eagerly fetched
     * (avoids N+1 if callers need match details).
     */
    @Query("SELECT s FROM Seat s JOIN FETCH s.match WHERE s.match.id = :matchId ORDER BY s.seatCode")
    List<Seat> findByMatchIdWithMatch(@Param("matchId") Long matchId);

    /** Find a specific seat by match + seat_code. */
    Optional<Seat> findByMatchIdAndSeatCode(Long matchId, String seatCode);

    /**
     * Atomic SQL update for seat reservation.
     * Executes: UPDATE seats SET status = :targetStatus WHERE id IN (:seatIds) AND status = :expectedStatus
     *
     * @return The number of rows successfully updated by the SQL engine.
     */
    @org.springframework.data.jpa.repository.Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE Seat s SET s.status = :targetStatus, s.updatedAt = CURRENT_TIMESTAMP WHERE s.id IN :seatIds AND s.status = :expectedStatus")
    int updateStatusIfStatusIs(@Param("seatIds") List<Long> seatIds,
                               @Param("expectedStatus") SeatStatus expectedStatus,
                               @Param("targetStatus") SeatStatus targetStatus);
}
