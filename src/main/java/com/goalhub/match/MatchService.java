package com.goalhub.match;

import com.goalhub.match.dto.MatchRequest;
import com.goalhub.match.dto.MatchResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

/**
 * Service interface for Match business logic.
 * Implementations are responsible for persistence and business rules.
 */
public interface MatchService {

    /**
     * List all matches, optionally filtered by status.
     *
     * @param status   optional filter (null = no filter)
     * @param pageable pagination and sorting
     * @return paginated list of matches
     */
    Page<MatchResponse> getAllMatches(MatchStatus status, Pageable pageable);

    /**
     * Get a single match by ID.
     *
     * @param id match ID
     * @return match details
     * @throws com.goalhub.exception.ResourceNotFoundException if not found
     */
    MatchResponse getMatchById(Long id);

    /**
     * Create a new match.
     * <p>Requires ADMIN role (enforced via {@code @PreAuthorize} in controller).
     *
     * @param request match data
     * @return created match details
     */
    MatchResponse createMatch(MatchRequest request);

    /**
     * Update an existing match.
     * <p>Requires ADMIN role.
     *
     * @param id      match ID to update
     * @param request updated match data
     * @return updated match details
     * @throws com.goalhub.exception.ResourceNotFoundException if not found
     */
    MatchResponse updateMatch(Long id, MatchRequest request);

    /**
     * Delete a match by ID.
     * <p>Requires ADMIN role.
     *
     * @param id match ID
     * @throws com.goalhub.exception.ResourceNotFoundException if not found
     */
    void deleteMatch(Long id);
}
