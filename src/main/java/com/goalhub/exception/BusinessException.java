package com.goalhub.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * Thrown when a business rule is violated at the service layer.
 * Maps to HTTP 400 Bad Request.
 *
 * <p>Examples:
 * <ul>
 *   <li>Seat does not belong to the requested match
 *   <li>Seat is not AVAILABLE (already RESERVED or SOLD)
 *   <li>Duplicate seat IDs in order request
 * </ul>
 */
@ResponseStatus(HttpStatus.BAD_REQUEST)
public class BusinessException extends RuntimeException {

    public BusinessException(String message) {
        super(message);
    }
}
