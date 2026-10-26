package com.goalhub.auth;

import com.goalhub.security.JwtUtil;
import com.goalhub.user.User;
import com.goalhub.user.UserRepository;
import com.goalhub.user.Role;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

/**
 * Authentication controller – provides login and a dev-only register endpoint.
 *
 * <p>Endpoints:
 * <ul>
 *   <li>POST /api/auth/login    – authenticate, returns JWT
 *   <li>POST /api/auth/register – create user (dev/test convenience; restrict in prod)
 * </ul>
 */
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final JwtUtil jwtUtil;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    /** Authenticate and return a JWT token. */
    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.email(), request.password())
        );

        User user = (User) authentication.getPrincipal();
        String token = jwtUtil.generateToken(user);

        return ResponseEntity.ok(new LoginResponse(token, user.getEmail(), user.getRole().name()));
    }

    /**
     * Register a new user.
     * In a real system this would be restricted or require an invitation flow.
     * For now it's open for dev/test convenience.
     */
    @PostMapping("/register")
    public ResponseEntity<LoginResponse> register(@Valid @RequestBody RegisterRequest request) {
        if (userRepository.existsByEmail(request.email())) {
            throw new IllegalArgumentException("Email already in use: " + request.email());
        }

        User user = User.builder()
                .email(request.email())
                .password(passwordEncoder.encode(request.password()))
                .fullName(request.fullName())
                .role(Role.USER) // Strictly Role.USER for all public registrations
                .build();

        userRepository.save(user);
        String token = jwtUtil.generateToken(user);

        return ResponseEntity.status(201)
                .body(new LoginResponse(token, user.getEmail(), user.getRole().name()));
    }

    /**
     * GET /api/auth/me – returns the currently authenticated user's profile.
     * Requires a valid JWT token.
     */
    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser(
            @org.springframework.security.core.annotation.AuthenticationPrincipal User currentUser) {
        if (currentUser == null) {
            return ResponseEntity.status(401).body(java.util.Map.of("error", "Not authenticated"));
        }
        return ResponseEntity.ok(java.util.Map.of(
                "id", currentUser.getId(),
                "email", currentUser.getEmail(),
                "fullName", currentUser.getFullName(),
                "role", currentUser.getRole().name()
        ));
    }
}
