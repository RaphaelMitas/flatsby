# E2E Test Specifications

This document outlines the comprehensive end-to-end testing strategy for the Flatsby application.

## 🔐 Authentication & Session Setup
Before any functional test runs, the system must ensure a valid session.
- **Authenticated User State**: The tests will utilize a specialized E2E setup that bypasses the manual login UI to create a signed session for a test user.
- **Group Context**: Since both modules require a group, the setup will automatically create a test group and assign the authenticated user as a member, ensuring the app doesn't redirect to a "create group" or "no group" state.

## 🛒 Shopping List Tests
Tests focused on the collaborative management of shopping items.
- [Shopping List Dashboard](docs/e2e-test-specs/shopping-list-dashboard.md)
- [Shopping List Items](docs/e2e-test-specs/shopping-list-items.md)
- [Shopping List Management](docs/e2e-test-specs/shopping-list-management.md)
- [Shopping List Suggestions](docs/e2e-test-specs/shopping-list-suggestions.md)

## 💸 Expense Tracker Tests
Tests focused on tracking spending and settling debts.
- [Expense Creation](docs/e2e-test-specs/expense-creation.md)
- [Expense Management](docs/e2e-test-specs/expense-management.md)
- [Debt & Settlements](docs/e2e-test-specs/debt-settlements.md)

## 👥 Group Management Tests
Tests focused on the full lifecycle of groups, member management, and role-based access control.
- [Group Management](docs/e2e-test-specs/group-management.md)

## 👤 Account Management Tests
Tests focused on account deletion and complete data cleanup.
- [Account Management](docs/e2e-test-specs/account-management.md)
