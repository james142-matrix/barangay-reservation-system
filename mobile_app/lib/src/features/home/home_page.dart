import 'package:flutter/material.dart';

import '../auth/auth_service.dart';
import '../auth/auth_user.dart';
import '../archive/archive_center_page.dart';
import '../archive/archive_service.dart';
import '../archive/archived_user.dart';
import '../billing/billing_page.dart';
import '../dashboard/dashboard_page.dart';
import '../facilities/facility.dart';
import '../facilities/facilities_page.dart';
import '../facilities/facility_service.dart';
import '../notifications/notification_item.dart';
import '../notifications/notification_service.dart';
import '../notifications/notifications_page.dart';
import '../profile/profile_page.dart';
import '../reports/reports_page.dart';
import '../reservations/create_reservation_page.dart';
import '../reservations/reservation.dart';
import '../reservations/reservation_service.dart';
import '../reservations/reservations_page.dart';
import '../users/app_user.dart';
import '../users/user_service.dart';
import '../users/users_page.dart';

class HomePage extends StatefulWidget {
  const HomePage({
    super.key,
    required this.user,
    required this.authService,
    required this.onLogout,
  });

  final AuthUser user;
  final AuthService authService;
  final VoidCallback onLogout;

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  final ReservationService _reservationService = ReservationService();
  final FacilityService _facilityService = FacilityService();
  final NotificationService _notificationService = NotificationService();
  final ArchiveService _archiveService = ArchiveService();
  final UserService _userService = UserService();
  late Future<_HomeData> _homeDataFuture;
  _HomeData? _latestData;
  int _selectedTab = 0;

  @override
  void initState() {
    super.initState();
    _homeDataFuture = _loadHomeData();
  }

  Future<_HomeData> _loadHomeData() async {
    final results = await Future.wait([
      _reservationService.getReservationsForUser(widget.user),
      _facilityService.getFacilities(),
      _notificationService.getNotifications(widget.user),
      _userService.getUsers(),
    ]);

    final reservations = results[0] as List<Reservation>;
    final facilities = results[1] as List<Facility>;
    final notifications = results[2] as List<NotificationItem>;
    final users = results[3] as List<AppUser>;
    List<ArchivedUser> archivedUsers = const [];
    List<Facility> archivedFacilities = const [];
    List<Reservation> archivedReservations = const [];
    if (widget.user.role == 'admin') {
      final archiveResults = await Future.wait([
        _archiveService.getArchivedUsers(),
        _archiveService.getArchivedFacilities(),
        _archiveService.getArchivedReservations(),
      ]);
      archivedUsers = archiveResults[0] as List<ArchivedUser>;
      archivedFacilities = archiveResults[1] as List<Facility>;
      archivedReservations = archiveResults[2] as List<Reservation>;
    }
    final nameMap = <int, String>{};
    for (final facility in facilities) {
      if (facility.id > 0 && facility.name.isNotEmpty) {
        nameMap[facility.id] = facility.name;
      }
    }
    return _HomeData(
      reservations: reservations,
      facilities: facilities,
      notifications: notifications,
      archivedUsers: archivedUsers,
      archivedFacilities: archivedFacilities,
      archivedReservations: archivedReservations,
      users: users,
      facilityNamesById: nameMap,
    );
  }

  Future<void> _refresh() async {
    setState(() {
      _homeDataFuture = _loadHomeData();
    });
    await _homeDataFuture;
  }

  Future<void> _updateReservationStatus(
    Reservation reservation,
    String status, {
    String? rejectionReason,
  }) async {
    final payload = <String, Object?>{'status': status};
    if (rejectionReason != null && rejectionReason.trim().isNotEmpty) {
      payload['rejectionReason'] = rejectionReason.trim();
    }
    await _reservationService.updateReservation(reservation.id, payload);
    await _refresh();
  }

  Future<void> _recordFullPayment(Reservation reservation) async {
    final payload = <String, Object?>{
      'amountPaid': reservation.totalCost,
      'paymentStatus': 'paid',
      'paymentMethod': 'onsite_cash',
    };
    await _reservationService.updateReservation(reservation.id, payload);
    await _refresh();
  }

  Future<void> _updateReservationDetails(
    Reservation reservation,
    Map<String, Object?> updates,
  ) async {
    await _reservationService.updateReservation(reservation.id, updates);
    await _refresh();
  }

  Future<void> _createReservation(Map<String, Object?> payload) async {
    await _reservationService.createReservation(payload);
    await _refresh();
  }

  Future<void> _createFacility(Map<String, Object?> payload) async {
    await _facilityService.createFacility(payload);
    await _refresh();
  }

  Future<void> _updateFacility(
    Facility facility,
    Map<String, Object?> payload,
  ) async {
    await _facilityService.updateFacility(facility.id, payload);
    await _refresh();
  }

  Future<void> _archiveFacility(Facility facility) async {
    await _facilityService.archiveFacility(facility.id);
    await _refresh();
  }

  Future<void> _markNotificationRead(NotificationItem item) async {
    await _notificationService.markAsRead(item.id);
    await _refresh();
  }

  Future<void> _createNotification(Map<String, Object?> payload) async {
    await _notificationService.createNotification(payload);
    await _refresh();
  }

  Future<void> _addPayment(
    Reservation reservation, {
    required double amountToAdd,
  }) async {
    final newAmount = reservation.amountPaid + amountToAdd;
    final paidFull = newAmount >= reservation.totalCost;
    final payload = <String, Object?>{
      'amountPaid': newAmount,
      'paymentStatus': paidFull ? 'paid' : 'partial',
      'paymentMethod': 'onsite_cash',
    };
    await _reservationService.updateReservation(reservation.id, payload);
    await _refresh();
  }

  Future<void> _cancelReservationFromBilling(Reservation reservation) async {
    await _reservationService
        .updateReservation(reservation.id, <String, Object?>{
          'status': 'cancelled',
          'paymentStatus': 'cancelled',
          'rejectionReason': 'Cancelled during billing by staff/admin',
        });
    await _refresh();
  }

  Future<void> _createUser(Map<String, Object?> payload) async {
    await _userService.createUser(payload);
    await _refresh();
  }

  Future<void> _updateUser(AppUser user, Map<String, Object?> payload) async {
    await _userService.updateUser(user.id, payload);
    await _refresh();
  }

  Future<void> _archiveUser(AppUser user) async {
    await _userService.archiveUser(user.id);
    await _refresh();
  }

  Future<void> _approveUser(AppUser user) async {
    await _userService.approveUser(user.id);
    await _refresh();
  }

  Future<void> _restoreArchivedUser(ArchivedUser user) async {
    await _archiveService.restoreUser(user.id);
    await _refresh();
  }

  Future<void> _restoreArchivedFacility(Facility facility) async {
    await _archiveService.restoreFacility(facility.id);
    await _refresh();
  }

  Future<void> _restoreArchivedReservation(Reservation reservation) async {
    await _archiveService.restoreReservation(reservation.id);
    await _refresh();
  }

  Future<void> _openAdminPage(_HomeData data, String action) async {
    if (action == 'reports') {
      await Navigator.of(context).push(
        MaterialPageRoute<void>(
          builder: (_) => ReportsPage(
            reservations: data.reservations,
            facilities: data.facilities,
          ),
        ),
      );
      return;
    }
    if (action == 'archive') {
      await Navigator.of(context).push(
        MaterialPageRoute<void>(
          builder: (_) => ArchiveCenterPage(
            users: data.archivedUsers,
            facilities: data.archivedFacilities,
            reservations: data.archivedReservations,
            onRestoreUser: _restoreArchivedUser,
            onRestoreFacility: _restoreArchivedFacility,
            onRestoreReservation: _restoreArchivedReservation,
          ),
        ),
      );
      return;
    }
  }

  @override
  Widget build(BuildContext context) {
    final roleLabel = widget.user.role == 'admin' ? 'Admin' : 'Barangay Staff';
    final isAdmin = widget.user.role == 'admin';
    final isDesktop = MediaQuery.of(context).size.width >= 1100;
    return Scaffold(
      appBar: isDesktop
          ? null
          : AppBar(
              title: Text('Barangay Reservation ($roleLabel)'),
              actions: [
                if (widget.user.role == 'admin')
                  PopupMenuButton<String>(
                    icon: const Icon(Icons.admin_panel_settings_outlined),
                    tooltip: 'Admin Tools',
                    onSelected: (value) {
                      final data = _latestData;
                      if (data == null) return;
                      _openAdminPage(data, value);
                    },
                    itemBuilder: (_) => const [
                      PopupMenuItem(value: 'reports', child: Text('Reports')),
                      PopupMenuItem(
                        value: 'archive',
                        child: Text('Archive Center'),
                      ),
                    ],
                  ),
                IconButton(
                  tooltip: 'Refresh',
                  icon: const Icon(Icons.refresh),
                  onPressed: _refresh,
                ),
                IconButton(
                  tooltip: 'Logout',
                  icon: const Icon(Icons.logout),
                  onPressed: () async {
                    await widget.authService.logout();
                    widget.onLogout();
                  },
                ),
              ],
            ),
      body: FutureBuilder<_HomeData>(
        future: _homeDataFuture,
        builder: (context, snapshot) {
          if (snapshot.connectionState != ConnectionState.done) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Text(
                      'Failed to load data from API.',
                      style: TextStyle(fontWeight: FontWeight.w700),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      '${snapshot.error}',
                      textAlign: TextAlign.center,
                      style: const TextStyle(color: Colors.black54),
                    ),
                    const SizedBox(height: 14),
                    FilledButton(
                      onPressed: _refresh,
                      child: const Text('Retry'),
                    ),
                  ],
                ),
              ),
            );
          }

          final data = snapshot.data!;
          _latestData = data;
          final pages = <Widget>[
            DashboardPage(
              roleLabel: roleLabel,
              reservations: data.reservations,
              facilityNamesById: data.facilityNamesById,
            ),
            ReservationsPage(
              reservations: data.reservations,
              facilityNamesById: data.facilityNamesById,
              facilities: data.facilities,
              onUpdateStatus: _updateReservationStatus,
              onRecordFullPayment: _recordFullPayment,
              onUpdateDetails: _updateReservationDetails,
            ),
            CreateReservationPage(
              user: widget.user,
              facilities: data.facilities,
              existingReservations: data.reservations,
              onCreateReservation: _createReservation,
            ),
            BillingPage(
              reservations: data.reservations,
              facilities: data.facilities,
              onAddPayment: _addPayment,
              onCancelReservation: _cancelReservationFromBilling,
            ),
            FacilitiesPage(
              facilities: data.facilities,
              reservations: data.reservations,
              canManage: isAdmin,
              onCreateFacility: _createFacility,
              onUpdateFacility: _updateFacility,
              onArchiveFacility: _archiveFacility,
            ),
            NotificationsPage(
              notifications: data.notifications,
              onMarkRead: _markNotificationRead,
              onCreate: _createNotification,
              users: data.users,
              canCreate: isAdmin,
              defaultUsername: widget.user.username,
            ),
            ProfilePage(user: widget.user, authService: widget.authService),
            if (isAdmin)
              UsersPage(
                users: data.users,
                canManage: true,
                currentUsername: widget.user.username,
                onCreateUser: _createUser,
                onUpdateUser: _updateUser,
                onArchiveUser: _archiveUser,
                onApproveUser: _approveUser,
              ),
          ];
          final selectedIndex = _selectedTab >= pages.length
              ? pages.length - 1
              : _selectedTab;
          final content = IndexedStack(index: selectedIndex, children: pages);
          if (!isDesktop) {
            return RefreshIndicator(onRefresh: _refresh, child: content);
          }

          final unreadCount = data.notifications.where((n) => !n.isRead).length;
          final desktopItems = _desktopNavItems(isAdmin, data);
          return Column(
            children: [
              _buildDesktopTopBar(
                roleLabel: roleLabel,
                unreadCount: unreadCount,
                onNotificationsTap: () => setState(() => _selectedTab = 5),
              ),
              Expanded(
                child: Row(
                  children: [
                    _buildDesktopSidebar(
                      items: desktopItems,
                      selectedTab: selectedIndex,
                    ),
                    Expanded(
                      child: ColoredBox(
                        color: const Color(0xFFF3F4F6),
                        child: content,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          );
        },
      ),
      bottomNavigationBar: isDesktop
          ? null
          : NavigationBar(
              selectedIndex: (!isAdmin && _selectedTab > 6) ? 0 : _selectedTab,
              onDestinationSelected: (index) {
                setState(() {
                  _selectedTab = index;
                });
              },
              destinations: _mobileDestinations(isAdmin),
            ),
    );
  }

  List<NavigationDestination> _mobileDestinations(bool isAdmin) {
    final items = <NavigationDestination>[
      const NavigationDestination(
        icon: Icon(Icons.dashboard_outlined),
        selectedIcon: Icon(Icons.dashboard),
        label: 'Dashboard',
      ),
      const NavigationDestination(
        icon: Icon(Icons.event_note_outlined),
        selectedIcon: Icon(Icons.event_note),
        label: 'Reservations',
      ),
      const NavigationDestination(
        icon: Icon(Icons.add_task_outlined),
        selectedIcon: Icon(Icons.add_task),
        label: 'Create',
      ),
      const NavigationDestination(
        icon: Icon(Icons.payments_outlined),
        selectedIcon: Icon(Icons.payments),
        label: 'Billing',
      ),
      const NavigationDestination(
        icon: Icon(Icons.apartment_outlined),
        selectedIcon: Icon(Icons.apartment),
        label: 'Facilities',
      ),
      const NavigationDestination(
        icon: Icon(Icons.notifications_outlined),
        selectedIcon: Icon(Icons.notifications),
        label: 'Notifs',
      ),
      const NavigationDestination(
        icon: Icon(Icons.person_outline),
        selectedIcon: Icon(Icons.person),
        label: 'Profile',
      ),
    ];
    if (isAdmin) {
      items.add(
        const NavigationDestination(
          icon: Icon(Icons.group_outlined),
          selectedIcon: Icon(Icons.group),
          label: 'Users',
        ),
      );
    }
    return items;
  }

  List<_DesktopNavItem> _desktopNavItems(bool isAdmin, _HomeData data) {
    final items = <_DesktopNavItem>[
      _DesktopNavItem(icon: Icons.bar_chart, label: 'Dashboard', tabIndex: 0),
      _DesktopNavItem(
        icon: Icons.assignment_outlined,
        label: 'Approval Requests',
        tabIndex: 1,
      ),
      _DesktopNavItem(
        icon: Icons.payments_outlined,
        label: 'Payments & Billing',
        tabIndex: 3,
      ),
      _DesktopNavItem(
        icon: Icons.apartment_outlined,
        label: 'Facilities',
        tabIndex: 4,
      ),
      _DesktopNavItem(
        icon: Icons.add_box_outlined,
        label: 'New Reservation',
        tabIndex: 2,
      ),
    ];
    if (isAdmin) {
      items.add(
        _DesktopNavItem(
          icon: Icons.group_outlined,
          label: 'Users',
          tabIndex: 7,
        ),
      );
      items.add(
        _DesktopNavItem(
          icon: Icons.query_stats_outlined,
          label: 'Reports',
          onTap: () => _openAdminPage(data, 'reports'),
        ),
      );
      items.add(
        _DesktopNavItem(
          icon: Icons.archive_outlined,
          label: 'Archive Center',
          onTap: () => _openAdminPage(data, 'archive'),
        ),
      );
    }
    items.add(
      _DesktopNavItem(
        icon: Icons.person_outline,
        label: 'Profile',
        tabIndex: 6,
      ),
    );
    items.add(
      _DesktopNavItem(
        icon: Icons.logout,
        label: 'Logout',
        onTap: () async {
          await widget.authService.logout();
          widget.onLogout();
        },
      ),
    );
    return items;
  }

  Widget _buildDesktopTopBar({
    required String roleLabel,
    required int unreadCount,
    required VoidCallback onNotificationsTap,
  }) {
    return Container(
      height: 74,
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(bottom: BorderSide(color: Color(0xFFE5E7EB))),
      ),
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Row(
        children: [
          const Icon(Icons.account_balance, color: Color(0xFF374151)),
          const SizedBox(width: 10),
          Text(
            'Barangay Molugan - $roleLabel',
            style: const TextStyle(
              fontSize: 19,
              fontWeight: FontWeight.w700,
              color: Color(0xFFE83E8C),
            ),
          ),
          const Spacer(),
          FilledButton.icon(
            onPressed: onNotificationsTap,
            style: FilledButton.styleFrom(
              backgroundColor: const Color(0xFFD61F78),
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            ),
            icon: const Icon(Icons.notifications, size: 18),
            label: Row(
              children: [
                const Text('Notifications'),
                const SizedBox(width: 8),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 2,
                  ),
                  decoration: BoxDecoration(
                    color: const Color(0xFFE11D48),
                    borderRadius: BorderRadius.circular(999),
                  ),
                  child: Text(
                    '$unreadCount',
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w700,
                      fontSize: 12,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDesktopSidebar({
    required List<_DesktopNavItem> items,
    required int selectedTab,
  }) {
    return Container(
      width: 250,
      color: Colors.white,
      child: ListView.builder(
        itemCount: items.length,
        itemBuilder: (context, index) {
          final item = items[index];
          final selected =
              item.tabIndex != null && item.tabIndex == selectedTab;
          return InkWell(
            onTap: () async {
              if (item.tabIndex != null) {
                setState(() => _selectedTab = item.tabIndex!);
                return;
              }
              if (item.onTap != null) {
                await item.onTap!.call();
              }
            },
            child: Container(
              decoration: BoxDecoration(
                color: selected ? const Color(0xFFF3F4F6) : Colors.white,
                border: Border(
                  left: BorderSide(
                    color: selected
                        ? const Color(0xFFE83E8C)
                        : Colors.transparent,
                    width: 3,
                  ),
                  bottom: const BorderSide(color: Color(0xFFF3F4F6)),
                ),
              ),
              padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 16),
              child: Row(
                children: [
                  Icon(
                    item.icon,
                    size: 20,
                    color: selected
                        ? const Color(0xFFE83E8C)
                        : const Color(0xFF4B5563),
                  ),
                  const SizedBox(width: 10),
                  Text(
                    item.label,
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: selected ? FontWeight.w600 : FontWeight.w500,
                      color: selected
                          ? const Color(0xFFE83E8C)
                          : const Color(0xFF374151),
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}

class _DesktopNavItem {
  const _DesktopNavItem({
    required this.icon,
    required this.label,
    this.tabIndex,
    this.onTap,
  });

  final IconData icon;
  final String label;
  final int? tabIndex;
  final Future<void> Function()? onTap;
}

class _HomeData {
  const _HomeData({
    required this.reservations,
    required this.facilities,
    required this.notifications,
    required this.archivedUsers,
    required this.archivedFacilities,
    required this.archivedReservations,
    required this.users,
    required this.facilityNamesById,
  });

  final List<Reservation> reservations;
  final List<Facility> facilities;
  final List<NotificationItem> notifications;
  final List<ArchivedUser> archivedUsers;
  final List<Facility> archivedFacilities;
  final List<Reservation> archivedReservations;
  final List<AppUser> users;
  final Map<int, String> facilityNamesById;
}
