package com.goalhub.order;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Background job that regularly scans for expired PENDING orders
 * and automatically releases held seats.
 * Runs every 30 seconds (configurable via app.order.cleanup-interval-ms).
 * Designed to be idempotent.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class OrderExpirationJob {

    private final OrderService orderService;

    @Scheduled(fixedDelayString = "${app.order.cleanup-interval-ms:30000}")
    public void runCleanup() {
        try {
            int released = orderService.releaseExpiredOrders();
            if (released > 0) {
                log.info("OrderExpirationJob: successfully cancelled and released {} expired order(s)", released);
            }
        } catch (Exception ex) {
            log.error("OrderExpirationJob encountered an unexpected error during cleanup", ex);
        }
    }
}
