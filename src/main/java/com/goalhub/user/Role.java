package com.goalhub.user;

/**
 * Application roles for authorization.
 * ADMIN: Full access – create/update/delete matches, manage orders.
 * USER: Read-only for matches; can create/view own orders.
 */
public enum Role {
    ADMIN,
    USER
}
