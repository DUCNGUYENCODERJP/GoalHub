package com.goalhub.match;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.goalhub.exception.ResourceNotFoundException;
import com.goalhub.match.dto.MatchRequest;
import com.goalhub.match.dto.MatchResponse;
import com.goalhub.security.JwtAuthFilter;
import com.goalhub.security.JwtUtil;
import jakarta.servlet.FilterChain;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * MockMvc integration tests for {@link MatchController}.
 *
 * <p>Security approach:
 * <ul>
 *   <li>{@link JwtAuthFilter} is mocked and stubbed to pass requests straight through
 *       (calls {@code filterChain.doFilter()}) — JWT parsing is skipped entirely.
 *   <li>{@link JwtUtil} and {@link UserDetailsService} are mocked to satisfy
 *       the Spring context wiring in the web layer.
 *   <li>Role assertions use {@code @WithMockUser} which injects the SecurityContext directly.
 * </ul>
 */
@WebMvcTest(MatchController.class)
@Import(MatchControllerTest.TestSecurityConfig.class)
@DisplayName("MatchController – Integration Tests (MockMvc)")
class MatchControllerTest {

    // ─── Test Security Config ────────────────────────────────────────────────────

    @TestConfiguration
    @EnableWebSecurity
    @EnableMethodSecurity
    static class TestSecurityConfig {

        /**
         * A pass-through JwtAuthFilter: always delegates to the next filter
         * without any JWT parsing.  This replaces the real filter in the web layer
         * while keeping the SecurityFilterChain intact for role enforcement.
         */
        @Bean
        public JwtAuthFilter jwtAuthFilter() throws Exception {
            JwtAuthFilter filter = Mockito.mock(JwtAuthFilter.class);
            Mockito.doAnswer(inv -> {
                HttpServletRequest  req   = inv.getArgument(0);
                HttpServletResponse res   = inv.getArgument(1);
                FilterChain         chain = inv.getArgument(2);
                chain.doFilter(req, res);
                return null;
            }).when(filter).doFilter(any(), any(), any());
            return filter;
        }

        @Bean
        public SecurityFilterChain testFilterChain(
                HttpSecurity http, JwtAuthFilter jwtAuthFilter) throws Exception {
            http
                .csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(s ->
                    s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                    .requestMatchers(HttpMethod.GET, "/api/matches/**").permitAll()
                    .requestMatchers("/api/auth/**").permitAll()
                    .anyRequest().authenticated()
                )
                .addFilterBefore(jwtAuthFilter,
                    org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter.class);
            return http.build();
        }
    }

    // ─── Mocks required by web-layer wiring ──────────────────────────────────────

    @MockBean
    private MatchService matchService;

    @MockBean
    private JwtUtil jwtUtil;

    @MockBean
    private UserDetailsService userDetailsService;

    // ─── Test Fixtures ────────────────────────────────────────────────────────────

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    private MatchResponse sampleResponse;
    private MatchRequest  sampleRequest;

    @BeforeEach
    void setUp() {
        sampleResponse = new MatchResponse(
                1L,
                "Manchester United",
                "Liverpool",
                LocalDateTime.now().plusDays(7),
                "Old Trafford",
                MatchStatus.UPCOMING,
                75000,
                75000,
                new BigDecimal("150"),
                LocalDateTime.now(),
                LocalDateTime.now()
        );

        sampleRequest = new MatchRequest(
                "Manchester United",
                "Liverpool",
                LocalDateTime.now().plusDays(7),
                "Old Trafford",
                MatchStatus.UPCOMING,
                75000,
                new BigDecimal("150")
        );
    }

    // ─── GET /api/matches ─────────────────────────────────────────────────────────

    @Nested
    @DisplayName("GET /api/matches")
    class GetAllMatches {

        @Test
        @DisplayName("returns 200 without authentication (public endpoint)")
        void returnsMatchListWithoutAuth() throws Exception {
            Page<MatchResponse> page = new PageImpl<>(List.of(sampleResponse));
            when(matchService.getAllMatches(isNull(), any())).thenReturn(page);

            mockMvc.perform(get("/api/matches"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content[0].id").value(1))
                    .andExpect(jsonPath("$.content[0].homeTeam").value("Manchester United"))
                    .andExpect(jsonPath("$.content[0].awayTeam").value("Liverpool"));
        }

        @Test
        @DisplayName("filters by status when ?status=UPCOMING")
        void filtersMatchesByStatus() throws Exception {
            Page<MatchResponse> page = new PageImpl<>(List.of(sampleResponse));
            when(matchService.getAllMatches(eq(MatchStatus.UPCOMING), any())).thenReturn(page);

            mockMvc.perform(get("/api/matches").param("status", "UPCOMING"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content[0].status").value("UPCOMING"));
        }
    }

    // ─── GET /api/matches/{id} ────────────────────────────────────────────────────

    @Nested
    @DisplayName("GET /api/matches/{id}")
    class GetMatchById {

        @Test
        @DisplayName("returns 200 with match details")
        void returnsMatchById() throws Exception {
            when(matchService.getMatchById(1L)).thenReturn(sampleResponse);

            mockMvc.perform(get("/api/matches/1"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id").value(1))
                    .andExpect(jsonPath("$.venue").value("Old Trafford"));
        }

        @Test
        @DisplayName("returns 404 when match not found")
        void returns404WhenNotFound() throws Exception {
            when(matchService.getMatchById(99L))
                    .thenThrow(new ResourceNotFoundException("Match", "id", 99L));

            mockMvc.perform(get("/api/matches/99"))
                    .andExpect(status().isNotFound())
                    .andExpect(jsonPath("$.status").value(404));
        }
    }

    // ─── POST /api/matches ────────────────────────────────────────────────────────

    @Nested
    @DisplayName("POST /api/matches")
    class CreateMatch {

        @Test
        @DisplayName("returns 201 when ADMIN creates a match")
        @WithMockUser(roles = "ADMIN")
        void adminCanCreateMatch() throws Exception {
            when(matchService.createMatch(any())).thenReturn(sampleResponse);

            mockMvc.perform(post("/api/matches")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(sampleRequest)))
                    .andExpect(status().isCreated())
                    .andExpect(header().exists("Location"))
                    .andExpect(jsonPath("$.id").value(1))
                    .andExpect(jsonPath("$.homeTeam").value("Manchester United"));
        }

        @Test
        @DisplayName("returns 403 when USER tries to create a match")
        @WithMockUser(roles = "USER")
        void userCannotCreateMatch() throws Exception {
            mockMvc.perform(post("/api/matches")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(sampleRequest)))
                    .andExpect(status().isForbidden());

            verify(matchService, never()).createMatch(any());
        }

        @Test
        @DisplayName("returns 403 when unauthenticated user tries to create a match")
        void anonymousCannotCreateMatch() throws Exception {
            mockMvc.perform(post("/api/matches")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(sampleRequest)))
                    .andExpect(status().isForbidden());
        }

        @Test
        @DisplayName("returns 400 when request body has blank homeTeam")
        @WithMockUser(roles = "ADMIN")
        void returns400OnInvalidRequest() throws Exception {
            MatchRequest invalid = new MatchRequest(
                    "",            // blank – fails @NotBlank
                    "Liverpool",
                    LocalDateTime.now().plusDays(7),
                    "Old Trafford",
                    MatchStatus.UPCOMING,
                    75000,
                    new BigDecimal("150")
            );

            mockMvc.perform(post("/api/matches")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(invalid)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.fieldErrors.homeTeam").exists());
        }
    }

    // ─── PUT /api/matches/{id} ────────────────────────────────────────────────────

    @Nested
    @DisplayName("PUT /api/matches/{id}")
    class UpdateMatch {

        @Test
        @DisplayName("returns 200 when ADMIN updates a match")
        @WithMockUser(roles = "ADMIN")
        void adminCanUpdateMatch() throws Exception {
            when(matchService.updateMatch(eq(1L), any())).thenReturn(sampleResponse);

            mockMvc.perform(put("/api/matches/1")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(sampleRequest)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id").value(1));
        }

        @Test
        @DisplayName("returns 403 when USER tries to update a match")
        @WithMockUser(roles = "USER")
        void userCannotUpdateMatch() throws Exception {
            mockMvc.perform(put("/api/matches/1")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(sampleRequest)))
                    .andExpect(status().isForbidden());
        }
    }

    // ─── DELETE /api/matches/{id} ─────────────────────────────────────────────────

    @Nested
    @DisplayName("DELETE /api/matches/{id}")
    class DeleteMatch {

        @Test
        @DisplayName("returns 204 when ADMIN deletes a match")
        @WithMockUser(roles = "ADMIN")
        void adminCanDeleteMatch() throws Exception {
            doNothing().when(matchService).deleteMatch(1L);

            mockMvc.perform(delete("/api/matches/1"))
                    .andExpect(status().isNoContent());

            verify(matchService).deleteMatch(1L);
        }

        @Test
        @DisplayName("returns 403 when USER tries to delete a match")
        @WithMockUser(roles = "USER")
        void userCannotDeleteMatch() throws Exception {
            mockMvc.perform(delete("/api/matches/1"))
                    .andExpect(status().isForbidden());

            verify(matchService, never()).deleteMatch(any());
        }

        @Test
        @DisplayName("returns 404 when deleting non-existent match")
        @WithMockUser(roles = "ADMIN")
        void returns404OnDeleteNotFound() throws Exception {
            doThrow(new ResourceNotFoundException("Match", "id", 99L))
                    .when(matchService).deleteMatch(99L);

            mockMvc.perform(delete("/api/matches/99"))
                    .andExpect(status().isNotFound());
        }
    }
}
