package com.goalhub.order;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("OrderExpirationJob – Scheduled Job Tests")
class OrderExpirationJobTest {

    @Mock
    private OrderService orderService;

    @InjectMocks
    private OrderExpirationJob expirationJob;

    @Test
    @DisplayName("runCleanup delegates to orderService.releaseExpiredOrders()")
    void runCleanup_delegatesToService() {
        when(orderService.releaseExpiredOrders()).thenReturn(3);

        expirationJob.runCleanup();

        verify(orderService, times(1)).releaseExpiredOrders();
    }

    @Test
    @DisplayName("runCleanup handles exceptions gracefully without propagating")
    void runCleanup_handlesExceptionGracefully() {
        when(orderService.releaseExpiredOrders()).thenThrow(new RuntimeException("DB down"));

        // Should not throw
        expirationJob.runCleanup();

        verify(orderService, times(1)).releaseExpiredOrders();
    }
}
