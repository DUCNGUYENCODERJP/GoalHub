package com.goalhub.auth;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.goalhub.security.JwtAuthFilter;
import com.goalhub.security.JwtUtil;
import com.goalhub.user.Role;
import com.goalhub.user.User;
import com.goalhub.user.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.test.web.servlet.MockMvc;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Tests for {@link AuthController}.
 * Verifies security enforcement on registration (no privilege escalation) and authentication.
 */
@WebMvcTest(AuthController.class)
@Import(AuthControllerTest.TestSecurityConfig.class)
@DisplayName("AuthController – Security and Registration Tests")
class AuthControllerTest {

    @TestConfiguration
    @EnableWebSecurity
    static class TestSecurityConfig {

        @Bean
        public JwtAuthFilter jwtAuthFilter() throws Exception {
            JwtAuthFilter filter = Mockito.mock(JwtAuthFilter.class);
            Mockito.doAnswer(inv -> {
                HttpServletRequest req = inv.getArgument(0);
                HttpServletResponse res = inv.getArgument(1);
                FilterChain chain = inv.getArgument(2);
                chain.doFilter(req, res);
                return null;
            }).when(filter).doFilter(any(), any(), any());
            return filter;
        }

        @Bean
        public SecurityFilterChain testFilterChain(HttpSecurity http, JwtAuthFilter jwtAuthFilter) throws Exception {
            http
                .csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                    .requestMatchers("/api/auth/**").permitAll()
                    .anyRequest().authenticated()
                );
            return http.build();
        }
    }

    @MockBean private AuthenticationManager authenticationManager;
    @MockBean private JwtUtil jwtUtil;
    @MockBean private UserRepository userRepository;
    @MockBean private PasswordEncoder passwordEncoder;
    @MockBean private UserDetailsService userDetailsService;

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        Mockito.reset(userRepository, authenticationManager, jwtUtil, passwordEncoder);
        when(passwordEncoder.encode(any())).thenReturn("hashed-pwd");
        when(jwtUtil.generateToken(any(User.class))).thenReturn("jwt-token-sample");
    }

    @Nested
    @DisplayName("Registration Security (No Privilege Escalation)")
    class RegistrationSecurity {

        @Test
        @DisplayName("Registering with role ADMIN must still assign USER role in database and response")
        void registerWithAdminRole_stillAssignsRoleUser() throws Exception {
            // Given: client explicitly attempts to set role to ADMIN
            when(userRepository.existsByEmail("attacker@goalhub.vn")).thenReturn(false);
            when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

            String requestBody = """
                {
                    "email": "attacker@goalhub.vn",
                    "password": "password123",
                    "fullName": "Attacker Name",
                    "role": "ADMIN"
                }
                """;

            // When & Then
            mockMvc.perform(post("/api/auth/register")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(requestBody))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.email").value("attacker@goalhub.vn"))
                    .andExpect(jsonPath("$.role").value("USER")) // Crucial: returned role must be USER
                    .andExpect(jsonPath("$.token").value("jwt-token-sample"));

            // Verify that the entity persisted into repository is strictly USER
            ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
            verify(userRepository).save(captor.capture());
            User savedUser = captor.getValue();
            assertThat(savedUser.getRole()).isEqualTo(Role.USER);
            assertThat(savedUser.getEmail()).isEqualTo("attacker@goalhub.vn");
            assertThat(savedUser.getFullName()).isEqualTo("Attacker Name");
        }

        @Test
        @DisplayName("Registering without role defaults to USER")
        void registerWithoutRole_defaultsToUser() throws Exception {
            when(userRepository.existsByEmail("user@goalhub.vn")).thenReturn(false);
            when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

            RegisterRequest request = new RegisterRequest("user@goalhub.vn", "password123", "Regular User");

            mockMvc.perform(post("/api/auth/register")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.role").value("USER"));

            ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
            verify(userRepository).save(captor.capture());
            assertThat(captor.getValue().getRole()).isEqualTo(Role.USER);
        }

        @Test
        @DisplayName("Registering with existing email returns 400 Bad Request")
        void registerWithDuplicateEmail_returns400() throws Exception {
            when(userRepository.existsByEmail("existing@goalhub.vn")).thenReturn(true);

            RegisterRequest request = new RegisterRequest("existing@goalhub.vn", "password123", "Duplicate User");

            mockMvc.perform(post("/api/auth/register")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.message").value("Email already in use: existing@goalhub.vn"));
        }
    }

    @Nested
    @DisplayName("Login Endpoint")
    class LoginEndpoint {

        @Test
        @DisplayName("Valid credentials return 200 OK and JWT token")
        void loginWithValidCredentials_returnsToken() throws Exception {
            User mockUser = User.builder()
                    .id(1L)
                    .email("user@goalhub.vn")
                    .role(Role.USER)
                    .fullName("Regular User")
                    .build();

            when(authenticationManager.authenticate(any()))
                    .thenReturn(new UsernamePasswordAuthenticationToken(mockUser, null, mockUser.getAuthorities()));

            LoginRequest request = new LoginRequest("user@goalhub.vn", "password123");

            mockMvc.perform(post("/api/auth/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.token").value("jwt-token-sample"))
                    .andExpect(jsonPath("$.email").value("user@goalhub.vn"))
                    .andExpect(jsonPath("$.role").value("USER"));
        }
    }
}
