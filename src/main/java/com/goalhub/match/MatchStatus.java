package com.goalhub.match;

/**
 * Lifecycle states of a {@link Match}.
 *
 * <ul>
 *   <li>UPCOMING   – tickets are open for sale
 *   <li>ONGOING    – match is in progress; no new bookings
 *   <li>COMPLETED  – match finished; no new bookings
 *   <li>CANCELLED  – match cancelled; refunds may apply
 * </ul>
 */
public enum MatchStatus {
    UPCOMING,
    ONGOING,
    COMPLETED,
    CANCELLED
}
