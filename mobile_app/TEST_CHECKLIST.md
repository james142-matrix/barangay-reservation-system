# Flutter QA Checklist

Use this after the Flutter app entrypoint is wired to the real shell in `lib/src/app.dart`.

## 1. Launch

- [ ] `flutter pub get` succeeds
- [ ] `flutter analyze` succeeds
- [ ] `flutter test` succeeds
- [ ] app launches in browser/device
- [ ] app points to the correct backend

## 2. Authentication

- [ ] admin login works
- [ ] staff login works
- [ ] logout works
- [ ] session restore works after refresh
- [ ] pending signup cannot log in

## 3. Dashboard

- [ ] stats load without API errors
- [ ] pending requests section loads
- [ ] upcoming events section loads
- [ ] notifications summary looks correct

## 4. Reservations

- [ ] reservation list loads
- [ ] search works
- [ ] filters work
- [ ] review modal/detail view opens
- [ ] edit rules match current backend restrictions

## 5. Create Reservation

- [ ] available facilities load
- [ ] event types update by facility
- [ ] facility rules/hints display correctly
- [ ] valid reservation can be submitted
- [ ] overlap prevention works
- [ ] guest capacity validation works
- [ ] down-payment option works
- [ ] medical room details are required when needed

## 6. Billing

- [ ] billing list loads
- [ ] paid/balance values look correct
- [ ] collect down payment works
- [ ] collect remaining balance works
- [ ] full payment completes reservation
- [ ] cancel unpaid pending reservation works

## 7. Facilities

- [ ] facilities list loads
- [ ] admin can add facility
- [ ] admin can edit facility
- [ ] admin can archive facility
- [ ] archived facility disappears from active list

## 8. Notifications

- [ ] notifications list loads
- [ ] search/filter works
- [ ] mark single notification as read works
- [ ] mark all as read works
- [ ] admin can create notification

## 9. Users

- [ ] users list loads for admin
- [ ] pending signups are visible
- [ ] approve signup works
- [ ] create user works
- [ ] edit user works
- [ ] archive user works
- [ ] protected admin rules are enforced

## 10. Reports And Archive

- [ ] reports page loads
- [ ] CSV export works if exposed in current UI
- [ ] archive center loads
- [ ] archived users restore works
- [ ] archived facilities restore works
- [ ] archived reservations restore works

## 11. Known Current Risk

- [ ] team confirms `lib/main.dart` is no longer launching the rubric/demo screen before formal QA

Last updated: 2026-03-15
