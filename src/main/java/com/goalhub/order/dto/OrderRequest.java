package com.goalhub.order.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

/**
 * Request body for POST /api/orders.
 */
public record OrderRequest(

        @NotNull(message = "matchId is required")
        Long matchId,

        @NotEmpty(message = "At least one seat must be selected")
        @Size(max = 20, message = "Cannot book more than 20 seats per order")
        List<Long> seatIds
) {}
