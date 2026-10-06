package com.goalhub.exception;

import java.time.LocalDateTime;
import java.util.Map;

/**
 * Standard error response body returned for all API errors.
 */
public record ErrorResponse(
        int status,
        String error,
        String message,
        String path,
        LocalDateTime timestamp,
        Map<String, String> fieldErrors   // populated for validation errors
) {
    /** Convenience constructor without fieldErrors. */
    public ErrorResponse(int status, String error, String message, String path) {
        this(status, error, message, path, LocalDateTime.now(), null);
    }
}
