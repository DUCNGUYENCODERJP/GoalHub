package com.goalhub.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * Thrown when a concurrent booking conflict occurs (e.g., OptimisticLockingFailureException
 * or another user reserved the seat first). Maps to HTTP 409 Conflict.
 */
@ResponseStatus(HttpStatus.CONFLICT)
public class SeatConflictException extends RuntimeException {

    public SeatConflictException(String message) {
        super(message);
    }

    public SeatConflictException(String message, Throwable cause) {
        super(message, cause);
    }
}
