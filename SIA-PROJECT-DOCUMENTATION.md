# SIA Project Documentation

## Project Title

Barangay Molugan Facility Reservation System

## Project Summary

This project manages barangay facility reservations for staff-admin assisted operations. It is now implemented as a PHP web application backed by MySQL, with a parallel Flutter client under development in `mobile_app/`.

The current build is focused on:

- admin and barangay staff operations
- reservation intake and validation
- onsite cash billing
- reports and exports
- approval-based staff signup
- archive and restore workflows

## Objectives

- Replace manual reservation tracking with a searchable system
- Prevent double-booking through automated overlap checks
- Enforce facility operating rules consistently
- Track payment progress for reservations
- Centralize user and facility management
- Keep operational history available through soft archive flows

## Users

### Admin

- full operational access
- approves pending staff signups
- manages users and facilities
- accesses reports and archive center

### Barangay Staff

- creates reservations
- reviews requests
- collects billing payments
- views facilities

### Resident

- not an active login role in the current deployment

## Current Modules

### Authentication

- session-based login
- login throttling
- idle timeout
- forgot-password via email code

### Reservation Management

- create reservation
- validate capacity and schedule
- support single-day or multi-day based on facility rules
- capture add-ons and payment option

### Request Review

- search and inspect reservations
- edit details only before billing action

### Billing

- collect down payment
- collect remaining balance
- mark reservation completed after full payment
- cancel unpaid pending reservation

### Facilities

- create/edit/archive by admin
- operating hours and duration rules
- event type and add-on configuration

### Users

- create admin/staff accounts
- approve pending signups
- archive users with protected admin rules

### Reports

- dashboard-style metrics
- date filtering
- CSV export
- print-to-PDF export

### Archive Center

- web UI restore for users and facilities
- API restore also exists for archived reservations

## Technical Overview

- Language: PHP, JavaScript, SQL, Dart
- Database: MySQL
- Web server: Apache via XAMPP
- Frontend: vanilla JavaScript + PHP-rendered pages
- Mobile: Flutter client targeting the same API

## Current File Layout

- `api/` - backend API and helpers
- `js/` - frontend page scripts
- `css/` - shared styling
- root `*.php` - web pages
- `database.sql` - schema and seed data
- `migrations/` - DB upgrade scripts
- `mobile_app/` - Flutter client work

## Notable Current Constraints

- Resident/client self-service login is disabled.
- Facility management is effectively admin-only.
- The reports page still contains some legacy `billing`-status wording.
- The Flutter project has real feature modules, but `mobile_app/lib/main.dart` is still not launching the real app shell.

## Suggested Next Improvements

- Align reports logic fully with the current status model
- Expose archived reservation restore in the web archive page
- Decide whether to actively use `billing_transactions` as the main payment ledger
- Wire Flutter `main.dart` to `src/app.dart`
- Add automated tests for API business rules

Last updated: 2026-03-15
