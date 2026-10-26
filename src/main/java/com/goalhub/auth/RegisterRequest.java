package com.goalhub.auth;

import com.goalhub.user.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Request body for POST /api/auth/register.
 */
public record RegisterRequest(
        @Email(message = "Invalid email format")
        @NotBlank(message = "Email is required")
        String email,

        @NotBlank(message = "Password is required")
        @Size(min = 6, message = "Password must be at least 6 characters")
        String password,

        @NotBlank(message = "Full name is required")
        String fullName,

        /**
         * Optional client-supplied role. Ignored during public registration
         * to prevent privilege escalation; all registered accounts are assigned Role.USER.
         */
        Role role
) {
    public RegisterRequest(String email, String password, String fullName) {
        this(email, password, fullName, null);
    }
}
