package com.goalhub.seat.dto;

import com.goalhub.seat.SeatClass;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;

/**
 * Request DTO for creating a single seat.
 * Used both individually and as elements of {@link BulkSeatRequest}.
 */
public record SeatRequest(

        @NotBlank(message = "Seat code is required")
        @Size(max = 20, message = "Seat code must not exceed 20 characters")
        @Pattern(regexp = "^[A-Za-z0-9\\-]+$",
                 message = "Seat code may only contain letters, digits and hyphens")
        String seatCode,

        @NotNull(message = "Seat class is required (VIP or STANDARD)")
        SeatClass seatClass,

        @NotNull(message = "Price is required")
        @DecimalMin(value = "0.01", message = "Price must be greater than 0")
        @Digits(integer = 10, fraction = 2, message = "Invalid price format")
        BigDecimal price
) {}
