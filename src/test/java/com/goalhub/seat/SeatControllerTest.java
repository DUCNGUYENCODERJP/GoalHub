package com.goalhub.seat;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.goalhub.exception.ResourceNotFoundException;
import com.goalhub.seat.dto.BulkSeatRequest;
import com.goalhub.seat.dto.BulkSeatResponse;
import com.goalhub.seat.dto.SeatRequest;
import com.goalhub.seat.dto.SeatResponse;
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
 * MockMvc integration tests for {@link SeatController}.
 * Same security test strategy as MatchControllerTest:
 * inner TestSecurityConfig + pass-through JwtAuthFilter mock.
 */
@WebMvcTest(SeatController.class)
@Import(SeatControllerTest.TestSecurityConfig.class)
@DisplayName("SeatController – Integration Tests (MockMvc)")
class SeatControllerTest {

    // ─── Test Security Config ────────────────────────────────────────────────────

    @TestConfiguration
    @EnableWebSecurity
    @EnableMethodSecurity
    static class TestSecurityConfig {

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

    // ─── Mocks ───────────────────────────────────────────────────────────────────

    @MockBean
    private SeatService seatService;

    @MockBean
    private JwtUtil jwtUtil;

    @MockBean
    private UserDetailsService userDetailsService;

    // ─── Fixtures ────────────────────────────────────────────────────────────────

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    private SeatResponse sampleSeatA1;
    private SeatResponse sampleSeatVip;
    private BulkSeatRequest validBulkRequest;

    @BeforeEach
    void setUp() {
        sampleSeatA1 = new SeatResponse(
                1L, 1L, "A1", SeatClass.STANDARD,
                new BigDecimal("150.00"), SeatStatus.AVAILABLE, 0L,
                LocalDateTime.now(), LocalDateTime.now()
        );
        sampleSeatVip = new SeatResponse(
                2L, 1L, "VIP-01", SeatClass.VIP,
                new BigDecimal("500.00"), SeatStatus.AVAILABLE, 0L,
                LocalDateTime.now(), LocalDateTime.now()
        );

        validBulkRequest = new BulkSeatRequest(List.of(
                new SeatRequest("A1", SeatClass.STANDARD, new BigDecimal("150.00")),
                new SeatRequest("VIP-01", SeatClass.VIP, new BigDecimal("500.00"))
        ));
    }

    // ─── GET /api/matches/{matchId}/seats ─────────────────────────────────────────

    @Nested
    @DisplayName("GET /api/matches/{matchId}/seats")
    class GetSeatsByMatch {

        @Test
        @DisplayName("returns 200 with seat list (public, no auth)")
        void returnsSeatListWithoutAuth() throws Exception {
            when(seatService.getSeatsByMatch(1L))
                    .thenReturn(List.of(sampleSeatA1, sampleSeatVip));

            mockMvc.perform(get("/api/matches/1/seats"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.length()").value(2))
                    .andExpect(jsonPath("$[0].seatCode").value("A1"))
                    .andExpect(jsonPath("$[0].matchId").value(1))
                    .andExpect(jsonPath("$[0].seatClass").value("STANDARD"))
                    .andExpect(jsonPath("$[1].seatCode").value("VIP-01"))
                    .andExpect(jsonPath("$[1].seatClass").value("VIP"));
        }

        @Test
        @DisplayName("returns 200 with empty list when match has no seats")
        void returnsEmptyListForMatchWithNoSeats() throws Exception {
            when(seatService.getSeatsByMatch(1L)).thenReturn(List.of());

            mockMvc.perform(get("/api/matches/1/seats"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.length()").value(0));
        }

        @Test
        @DisplayName("returns 404 when match does not exist")
        void returns404WhenMatchNotFound() throws Exception {
            when(seatService.getSeatsByMatch(99L))
                    .thenThrow(new ResourceNotFoundException("Match", "id", 99L));

            mockMvc.perform(get("/api/matches/99/seats"))
                    .andExpect(status().isNotFound())
                    .andExpect(jsonPath("$.status").value(404));
        }
    }

    // ─── POST /api/matches/{matchId}/seats/bulk ───────────────────────────────────

    @Nested
    @DisplayName("POST /api/matches/{matchId}/seats/bulk")
    class BulkCreateSeats {

        @Test
        @DisplayName("returns 201 when ADMIN bulk-creates seats")
        @WithMockUser(roles = "ADMIN")
        void adminCanBulkCreateSeats() throws Exception {
            BulkSeatResponse bulkResponse = new BulkSeatResponse(
                    2, List.of(sampleSeatA1, sampleSeatVip));
            when(seatService.bulkCreateSeats(eq(1L), any())).thenReturn(bulkResponse);

            mockMvc.perform(post("/api/matches/1/seats/bulk")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(validBulkRequest)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.created").value(2))
                    .andExpect(jsonPath("$.seats.length()").value(2))
                    .andExpect(jsonPath("$.seats[0].seatCode").value("A1"))
                    .andExpect(jsonPath("$.seats[1].seatCode").value("VIP-01"));
        }

        @Test
        @DisplayName("returns 403 when USER tries to bulk-create seats")
        @WithMockUser(roles = "USER")
        void userCannotBulkCreateSeats() throws Exception {
            mockMvc.perform(post("/api/matches/1/seats/bulk")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(validBulkRequest)))
                    .andExpect(status().isForbidden());
        }

        @Test
        @DisplayName("returns 403 when unauthenticated user tries to bulk-create seats")
        void anonymousCannotBulkCreateSeats() throws Exception {
            mockMvc.perform(post("/api/matches/1/seats/bulk")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(validBulkRequest)))
                    .andExpect(status().isForbidden());
        }

        @Test
        @DisplayName("returns 404 when match does not exist")
        @WithMockUser(roles = "ADMIN")
        void returns404WhenMatchNotFound() throws Exception {
            when(seatService.bulkCreateSeats(eq(99L), any()))
                    .thenThrow(new ResourceNotFoundException("Match", "id", 99L));

            mockMvc.perform(post("/api/matches/99/seats/bulk")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(validBulkRequest)))
                    .andExpect(status().isNotFound())
                    .andExpect(jsonPath("$.status").value(404));
        }

        @Test
        @DisplayName("returns 400 when request body has empty seats list")
        @WithMockUser(roles = "ADMIN")
        void returns400OnEmptySeatsList() throws Exception {
            BulkSeatRequest emptyRequest = new BulkSeatRequest(List.of());

            mockMvc.perform(post("/api/matches/1/seats/bulk")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(emptyRequest)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.fieldErrors.seats").exists());
        }

        @Test
        @DisplayName("returns 400 when seat code is blank")
        @WithMockUser(roles = "ADMIN")
        void returns400OnBlankSeatCode() throws Exception {
            BulkSeatRequest badRequest = new BulkSeatRequest(List.of(
                    new SeatRequest("", SeatClass.STANDARD, new BigDecimal("100.00"))
            ));

            mockMvc.perform(post("/api/matches/1/seats/bulk")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(badRequest)))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("returns 400 when duplicate seat codes exist in request")
        @WithMockUser(roles = "ADMIN")
        void returns400OnDuplicateCodesInPayload() throws Exception {
            BulkSeatRequest dupRequest = new BulkSeatRequest(List.of(
                    new SeatRequest("A1", SeatClass.STANDARD, new BigDecimal("150.00")),
                    new SeatRequest("A1", SeatClass.VIP, new BigDecimal("500.00"))
            ));
            when(seatService.bulkCreateSeats(eq(1L), any()))
                    .thenThrow(new IllegalArgumentException("Duplicate seat codes in request: [A1]"));

            mockMvc.perform(post("/api/matches/1/seats/bulk")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(dupRequest)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.message").value("Duplicate seat codes in request: [A1]"));
        }

        @Test
        @DisplayName("returns 400 when seat code already exists in DB")
        @WithMockUser(roles = "ADMIN")
        void returns400WhenSeatCodeExistsInDb() throws Exception {
            when(seatService.bulkCreateSeats(eq(1L), any()))
                    .thenThrow(new IllegalArgumentException(
                            "Seat codes already exist for this match: [A1]"));

            mockMvc.perform(post("/api/matches/1/seats/bulk")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(validBulkRequest)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.message").value(
                            "Seat codes already exist for this match: [A1]"));
        }
    }
}
