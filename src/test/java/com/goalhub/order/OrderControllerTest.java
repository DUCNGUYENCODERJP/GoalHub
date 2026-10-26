package com.goalhub.order;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.goalhub.exception.BusinessException;
import com.goalhub.exception.ResourceNotFoundException;
import com.goalhub.order.dto.OrderRequest;
import com.goalhub.order.dto.OrderResponse;
import com.goalhub.security.JwtAuthFilter;
import com.goalhub.security.JwtUtil;
import com.goalhub.user.Role;
import com.goalhub.user.User;
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
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * MockMvc integration tests for {@link OrderController}.
 *
 * <p>Security strategy:
 * Uses {@code SecurityMockMvcRequestPostProcessors.user(UserDetails)} per request
 * to inject our custom {@link User} as the {@code @AuthenticationPrincipal}.
 * This avoids SecurityContext global state leakage between tests.
 */
@WebMvcTest(OrderController.class)
@Import(OrderControllerTest.TestSecurityConfig.class)
@DisplayName("OrderController – Integration Tests (MockMvc)")
class OrderControllerTest {

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

    @MockBean private OrderService       orderService;
    @MockBean private JwtUtil            jwtUtil;
    @MockBean private UserDetailsService userDetailsService;

    @Autowired private MockMvc      mockMvc;
    @Autowired private ObjectMapper objectMapper;

    // ─── Fixtures ────────────────────────────────────────────────────────────────

    private User regularUser;
    private User adminUser;
    private User otherUser;
    private OrderResponse sampleOrderResponse;
    private OrderRequest  validRequest;

    @BeforeEach
    void setUp() {
        // Explicitly reset mock before each test to prevent stub leakage
        // between @Nested classes (Spring may split contexts per nested class).
        Mockito.reset(orderService);
        regularUser = User.builder()
                .id(1L).email("user@test.com").fullName("Regular User")
                .role(Role.USER).password("hash")
                .createdAt(LocalDateTime.now()).updatedAt(LocalDateTime.now())
                .build();

        adminUser = User.builder()
                .id(99L).email("admin@test.com").fullName("Admin User")
                .role(Role.ADMIN).password("hash")
                .createdAt(LocalDateTime.now()).updatedAt(LocalDateTime.now())
                .build();

        otherUser = User.builder()
                .id(2L).email("other@test.com").fullName("Other User")
                .role(Role.USER).password("hash")
                .createdAt(LocalDateTime.now()).updatedAt(LocalDateTime.now())
                .build();

        sampleOrderResponse = new OrderResponse(
                1L, 1L, 1L,
                "Man Utd", "Liverpool",
                LocalDateTime.now().plusDays(7),
                new BigDecimal("200.00"),
                OrderStatus.PENDING,
                List.of(),
                LocalDateTime.now(), LocalDateTime.now()
        );

        validRequest = new OrderRequest(1L, List.of(10L, 11L));
    }

    // ─── POST /api/orders ────────────────────────────────────────────────────────

    @Nested
    @DisplayName("POST /api/orders")
    class CreateOrder {

        @Test
        @DisplayName("returns 201 when authenticated user creates order successfully")
        void authenticatedUserCanCreateOrder() throws Exception {
            when(orderService.createOrder(any(), any())).thenReturn(sampleOrderResponse);

            mockMvc.perform(post("/api/orders")
                            .with(user(regularUser))                // inject our User as principal
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(validRequest)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.id").value(1))
                    .andExpect(jsonPath("$.status").value("PENDING"))
                    .andExpect(jsonPath("$.totalAmount").value(200.00));
        }

        @Test
        @DisplayName("returns 403 when unauthenticated (no token)")
        void anonymousCannotCreateOrder() throws Exception {
            mockMvc.perform(post("/api/orders")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(validRequest)))
                    .andExpect(status().isForbidden());
        }

        @Test
        @DisplayName("returns 400 when matchId is null")
        void returns400WhenMatchIdNull() throws Exception {
            OrderRequest badRequest = new OrderRequest(null, List.of(10L));

            mockMvc.perform(post("/api/orders")
                            .with(user(regularUser))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(badRequest)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.fieldErrors.matchId").exists());
        }

        @Test
        @DisplayName("returns 400 when seatIds is empty")
        void returns400WhenSeatsEmpty() throws Exception {
            OrderRequest badRequest = new OrderRequest(1L, List.of());

            mockMvc.perform(post("/api/orders")
                            .with(user(regularUser))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(badRequest)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.fieldErrors.seatIds").exists());
        }

        @Test
        @DisplayName("returns 400 when seat does not belong to the match")
        void returns400WhenSeatNotBelongToMatch() throws Exception {
            when(orderService.createOrder(any(), any()))
                    .thenThrow(new BusinessException("Seat(s) do not belong to match 1: [20]"));

            mockMvc.perform(post("/api/orders")
                            .with(user(regularUser))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(validRequest)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.message").value("Seat(s) do not belong to match 1: [20]"));
        }

        @Test
        @DisplayName("returns 400 when seat is not AVAILABLE")
        void returns400WhenSeatNotAvailable() throws Exception {
            when(orderService.createOrder(any(), any()))
                    .thenThrow(new BusinessException("Seat(s) not available: [10]"));

            mockMvc.perform(post("/api/orders")
                            .with(user(regularUser))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(validRequest)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.message").value("Seat(s) not available: [10]"));
        }

        @Test
        @DisplayName("returns 404 when match not found")
        void returns404WhenMatchNotFound() throws Exception {
            when(orderService.createOrder(any(), any()))
                    .thenThrow(new ResourceNotFoundException("Match", "id", 99L));

            mockMvc.perform(post("/api/orders")
                            .with(user(regularUser))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(
                                    new OrderRequest(99L, List.of(10L)))))
                    .andExpect(status().isNotFound());
        }
    }

    // ─── GET /api/orders/my ──────────────────────────────────────────────────────

    @Nested
    @DisplayName("GET /api/orders/my")
    class GetMyOrders {

        @Test
        @DisplayName("returns 200 with paginated orders for current user")
        void returnsMyOrders() throws Exception {
            Page<OrderResponse> page = new PageImpl<>(List.of(sampleOrderResponse));
            when(orderService.getMyOrders(any(), any())).thenReturn(page);

            mockMvc.perform(get("/api/orders/my")
                            .with(user(regularUser)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content[0].id").value(1))
                    .andExpect(jsonPath("$.content[0].status").value("PENDING"));
        }

        @Test
        @DisplayName("returns 403 when unauthenticated")
        void anonymousCannotGetMyOrders() throws Exception {
            mockMvc.perform(get("/api/orders/my"))
                    .andExpect(status().isForbidden());
        }
    }

    // ─── GET /api/orders/{id} ────────────────────────────────────────────────────

    @Nested
    @DisplayName("GET /api/orders/{id}")
    class GetOrderById {

        @Test
        @DisplayName("returns 200 with order detail for owner")
        void ownerCanGetOrderDetail() throws Exception {
            when(orderService.getOrderById(eq(1L), any())).thenReturn(sampleOrderResponse);

            mockMvc.perform(get("/api/orders/1")
                            .with(user(regularUser)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id").value(1))
                    .andExpect(jsonPath("$.totalAmount").value(200.00));
        }

        @Test
        @DisplayName("returns 200 with order detail for ADMIN")
        void adminCanGetAnyOrderDetail() throws Exception {
            when(orderService.getOrderById(eq(1L), any())).thenReturn(sampleOrderResponse);

            mockMvc.perform(get("/api/orders/1")
                            .with(user(adminUser)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id").value(1));
        }

        @Test
        @DisplayName("returns 403 when unauthenticated")
        void anonymousCannotGetOrderDetail() throws Exception {
            mockMvc.perform(get("/api/orders/1"))
                    .andExpect(status().isForbidden());
        }

        @Test
        @DisplayName("returns 403 when non-owner USER tries to view order")
        void nonOwnerGetsForbidden() throws Exception {
            when(orderService.getOrderById(eq(1L), any()))
                    .thenThrow(new AccessDeniedException(
                            "You do not have permission to view this order"));

            mockMvc.perform(get("/api/orders/1")
                            .with(user(otherUser)))
                    .andExpect(status().isForbidden());
        }

        @Test
        @DisplayName("returns 404 when order not found")
        void returns404WhenOrderNotFound() throws Exception {
            when(orderService.getOrderById(eq(99L), any()))
                    .thenThrow(new ResourceNotFoundException("Order", "id", 99L));

            mockMvc.perform(get("/api/orders/99")
                            .with(user(regularUser)))
                    .andExpect(status().isNotFound())
                    .andExpect(jsonPath("$.status").value(404));
        }
    }

    // ─── POST /api/orders/{id}/pay ───────────────────────────────────────────────

    @Nested
    @DisplayName("POST /api/orders/{id}/pay")
    class PayOrder {

        @Test
        @DisplayName("authenticated user can pay for order -> returns 200 and PAID order")
        void authenticatedUserCanPayOrder() throws Exception {
            OrderResponse paidResponse = new OrderResponse(
                    1L, 1L, 1L, "Man Utd", "Liverpool",
                    LocalDateTime.now().plusDays(7), new BigDecimal("200.00"),
                    OrderStatus.PAID, List.of(), LocalDateTime.now().plusMinutes(10),
                    LocalDateTime.now(), LocalDateTime.now()
            );

            when(orderService.payOrder(eq(1L), any())).thenReturn(paidResponse);

            mockMvc.perform(post("/api/orders/1/pay")
                            .with(user(regularUser)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id").value(1))
                    .andExpect(jsonPath("$.status").value("PAID"));
        }

        @Test
        @DisplayName("returns 400 when order has expired")
        void expiredOrderReturns400() throws Exception {
            when(orderService.payOrder(eq(1L), any()))
                    .thenThrow(new BusinessException("Order has expired at 2026-10-17T09:00:00"));

            mockMvc.perform(post("/api/orders/1/pay")
                            .with(user(regularUser)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.message").value("Order has expired at 2026-10-17T09:00:00"));
        }

        @Test
        @DisplayName("returns 403 when user tries to pay someone else's order")
        void nonOwnerPayReturns403() throws Exception {
            when(orderService.payOrder(eq(1L), any()))
                    .thenThrow(new AccessDeniedException("You do not have permission to pay for this order"));

            mockMvc.perform(post("/api/orders/1/pay")
                            .with(user(otherUser)))
                    .andExpect(status().isForbidden());
        }

        @Test
        @DisplayName("unauthenticated user cannot pay order -> returns 403")
        void unauthenticatedPayReturns403() throws Exception {
            mockMvc.perform(post("/api/orders/1/pay"))
                    .andExpect(status().isForbidden());
        }

        @Test
        @DisplayName("returns 404 when order does not exist")
        void nonExistentOrderPayReturns404() throws Exception {
            when(orderService.payOrder(eq(99L), any()))
                    .thenThrow(new ResourceNotFoundException("Order", "id", 99L));

            mockMvc.perform(post("/api/orders/99/pay")
                            .with(user(regularUser)))
                    .andExpect(status().isNotFound());
        }
    }

    // ─── POST /api/orders/{id}/cancel ────────────────────────────────────────────

    @Nested
    @DisplayName("POST /api/orders/{id}/cancel")
    class CancelOrder {

        @Test
        @DisplayName("owner can cancel order -> returns 200 and CANCELLED order")
        void ownerCanCancelOrder() throws Exception {
            OrderResponse cancelledResponse = new OrderResponse(
                    1L, 1L, 1L, "Man Utd", "Liverpool",
                    LocalDateTime.now().plusDays(7), new BigDecimal("200.00"),
                    OrderStatus.CANCELLED, List.of(), LocalDateTime.now().plusMinutes(10),
                    LocalDateTime.now(), LocalDateTime.now()
            );

            when(orderService.cancelOrder(eq(1L), any())).thenReturn(cancelledResponse);

            mockMvc.perform(post("/api/orders/1/cancel")
                            .with(user(regularUser)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id").value(1))
                    .andExpect(jsonPath("$.status").value("CANCELLED"));
        }

        @Test
        @DisplayName("returns 403 when user tries to cancel someone else's order")
        void nonOwnerCancelReturns403() throws Exception {
            when(orderService.cancelOrder(eq(1L), any()))
                    .thenThrow(new AccessDeniedException("You do not have permission to cancel this order"));

            mockMvc.perform(post("/api/orders/1/cancel")
                            .with(user(otherUser)))
                    .andExpect(status().isForbidden());
        }

        @Test
        @DisplayName("returns 400 when order cannot be cancelled (e.g. already PAID)")
        void alreadyPaidOrderCancelReturns400() throws Exception {
            when(orderService.cancelOrder(eq(1L), any()))
                    .thenThrow(new BusinessException("Cannot cancel order in status: PAID"));

            mockMvc.perform(post("/api/orders/1/cancel")
                            .with(user(regularUser)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.message").value("Cannot cancel order in status: PAID"));
        }

        @Test
        @DisplayName("unauthenticated user cannot cancel order -> returns 403")
        void unauthenticatedCancelReturns403() throws Exception {
            mockMvc.perform(post("/api/orders/1/cancel"))
                    .andExpect(status().isForbidden());
        }
    }
}
