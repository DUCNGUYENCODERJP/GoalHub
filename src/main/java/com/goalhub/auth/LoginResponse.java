package com.goalhub.auth;

/**
 * Response body for POST /api/auth/login.
 */
public record LoginResponse(
        String token,
        String tokenType,
        String email,
        String role
) {
    public LoginResponse(String token, String email, String role) {
        this(token, "Bearer", email, role);
    }
}
