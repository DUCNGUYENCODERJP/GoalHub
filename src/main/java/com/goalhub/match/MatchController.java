package com.goalhub.match;

import com.goalhub.match.dto.MatchRequest;
import com.goalhub.match.dto.MatchResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;

/**
 * REST controller for Match resources.
 *
 * <p>Authorization:
 * <ul>
 *   <li>GET endpoints are PUBLIC (configured in SecurityConfig).
 *   <li>POST / PUT / DELETE require {@code ROLE_ADMIN} (via @PreAuthorize).
 * </ul>
 */
@RestController
@RequestMapping("/api/matches")
@RequiredArgsConstructor
public class MatchController {

    private final MatchService matchService;

    /**
     * GET /api/matches
     * List all matches with optional status filter and pagination.
     *
     * <p>Query params:
     * <ul>
     *   <li>{@code status} – filter by MatchStatus (UPCOMING, ONGOING, etc.)
     *   <li>{@code page}, {@code size}, {@code sort} – standard Spring pagination
     * </ul>
     */
    @GetMapping
    public ResponseEntity<Page<MatchResponse>> getAllMatches(
            @RequestParam(required = false) MatchStatus status,
            @PageableDefault(size = 20, sort = "matchDate") Pageable pageable
    ) {
        return ResponseEntity.ok(matchService.getAllMatches(status, pageable));
    }

    /**
     * GET /api/matches/{id}
     * Get a single match by ID.
     */
    @GetMapping("/{id}")
    public ResponseEntity<MatchResponse> getMatchById(@PathVariable Long id) {
        return ResponseEntity.ok(matchService.getMatchById(id));
    }

    /**
     * POST /api/matches
     * Create a new match. Requires ADMIN role.
     */
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<MatchResponse> createMatch(@Valid @RequestBody MatchRequest request) {
        MatchResponse created = matchService.createMatch(request);

        URI location = ServletUriComponentsBuilder
                .fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(created.id())
                .toUri();

        return ResponseEntity.created(location).body(created);
    }

    /**
     * PUT /api/matches/{id}
     * Update an existing match. Requires ADMIN role.
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<MatchResponse> updateMatch(
            @PathVariable Long id,
            @Valid @RequestBody MatchRequest request
    ) {
        return ResponseEntity.ok(matchService.updateMatch(id, request));
    }

    /**
     * DELETE /api/matches/{id}
     * Delete a match. Requires ADMIN role.
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteMatch(@PathVariable Long id) {
        matchService.deleteMatch(id);
        return ResponseEntity.noContent().build();
    }
}
