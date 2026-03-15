import 'package:flutter/material.dart';

import '../reservations/reservation.dart';

class DashboardPage extends StatelessWidget {
  const DashboardPage({
    super.key,
    required this.roleLabel,
    required this.reservations,
    required this.facilityNamesById,
  });

  final String roleLabel;
  final List<Reservation> reservations;
  final Map<int, String> facilityNamesById;

  @override
  Widget build(BuildContext context) {
    final total = reservations.length;
    final pending = _statusCount('pending');
    final approved = _statusCount('approved');
    final completed = _statusCount('completed');
    final rejected = _statusCount('rejected');
    final cancelled = _statusCount('cancelled');
    final unpaidApproved = reservations.where((r) {
      final s = r.status.toLowerCase();
      final p = r.paymentStatus.toLowerCase();
      return s == 'approved' && p != 'paid' && p != 'cash';
    }).length;
    final paidTotal = reservations.fold<double>(
      0,
      (sum, r) => sum + r.amountPaid,
    );
    final pendingRows =
        reservations.where((r) => r.status.toLowerCase() == 'pending').toList()
          ..sort((a, b) {
            final aDate =
                DateTime.tryParse(a.createdAt) ??
                DateTime.fromMillisecondsSinceEpoch(0);
            final bDate =
                DateTime.tryParse(b.createdAt) ??
                DateTime.fromMillisecondsSinceEpoch(0);
            return bDate.compareTo(aDate);
          });
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final next7 = today.add(const Duration(days: 7));
    final upcomingRows =
        reservations.where((r) {
          final s = r.status.toLowerCase();
          if (s != 'approved' && s != 'completed') return false;
          final start = DateTime.tryParse(r.eventDate);
          if (start == null) return false;
          final day = DateTime(start.year, start.month, start.day);
          return (day.isAtSameMomentAs(today) || day.isAfter(today)) &&
              (day.isAtSameMomentAs(next7) || day.isBefore(next7));
        }).toList()..sort((a, b) {
          final aDate =
              DateTime.tryParse(a.eventDate) ??
              DateTime.fromMillisecondsSinceEpoch(0);
          final bDate =
              DateTime.tryParse(b.eventDate) ??
              DateTime.fromMillisecondsSinceEpoch(0);
          return aDate.compareTo(bDate);
        });
    final recentDecisionRows =
        reservations.where((r) {
          final s = r.status.toLowerCase();
          return s == 'approved' || s == 'rejected' || s == 'completed';
        }).toList()..sort((a, b) {
          final aDate =
              DateTime.tryParse(a.createdAt) ??
              DateTime.fromMillisecondsSinceEpoch(0);
          final bDate =
              DateTime.tryParse(b.createdAt) ??
              DateTime.fromMillisecondsSinceEpoch(0);
          return bDate.compareTo(aDate);
        });

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [Color(0xFFFFF1F7), Color(0xFFFFFFFF)],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: const Color(0xFFF5C2D9)),
          ),
          child: Row(
            children: [
              Container(
                height: 42,
                width: 42,
                decoration: BoxDecoration(
                  color: const Color(0xFFFCE7F3),
                  borderRadius: BorderRadius.circular(12),
                ),
                alignment: Alignment.center,
                child: const Icon(
                  Icons.dashboard_outlined,
                  color: Color(0xFFC2185B),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  'Dashboard ($roleLabel)',
                  style: Theme.of(context).textTheme.titleLarge,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        Wrap(
          spacing: 10,
          runSpacing: 10,
          children: [
            _MetricCard(
              label: 'Total Reservations',
              value: '$total',
              tone: const Color(0xFFEFF6FF),
            ),
            _MetricCard(
              label: 'Pending',
              value: '$pending',
              tone: const Color(0xFFFFF7ED),
            ),
            _MetricCard(
              label: 'Approved',
              value: '$approved',
              tone: const Color(0xFFECFDF5),
            ),
            _MetricCard(
              label: 'Completed',
              value: '$completed',
              tone: const Color(0xFFEEF2FF),
            ),
            _MetricCard(
              label: 'Rejected',
              value: '$rejected',
              tone: const Color(0xFFFEF2F2),
            ),
            _MetricCard(
              label: 'Cancelled',
              value: '$cancelled',
              tone: const Color(0xFFF3F4F6),
            ),
            _MetricCard(
              label: 'Unpaid Approved',
              value: '$unpaidApproved',
              tone: const Color(0xFFFFF1F2),
            ),
          ],
        ),
        const SizedBox(height: 12),
        Card(
          child: ListTile(
            leading: const Icon(Icons.payments_outlined),
            title: const Text('Total Collected Payments'),
            subtitle: const Text('Based on reservation amountPaid'),
            trailing: Text(
              'PHP ${paidTotal.toStringAsFixed(2)}',
              style: const TextStyle(fontWeight: FontWeight.w700),
            ),
          ),
        ),
        const SizedBox(height: 12),
        _sectionCard(
          title: 'Pending Requests',
          child: pendingRows.isEmpty
              ? const Text('No pending requests.')
              : Column(
                  children: pendingRows.take(5).map((r) {
                    final facility = r.facilityId == null
                        ? 'Unknown'
                        : (facilityNamesById[r.facilityId!] ??
                              'Facility #${r.facilityId}');
                    return ListTile(
                      dense: true,
                      contentPadding: EdgeInsets.zero,
                      title: Text('${r.username} - $facility'),
                      subtitle: Text(
                        '${r.eventDate} ${r.startTime}-${r.endTime}',
                      ),
                      trailing: _pill(r.paymentOption),
                    );
                  }).toList(),
                ),
        ),
        const SizedBox(height: 12),
        _sectionCard(
          title: 'Upcoming Events (7 days)',
          child: upcomingRows.isEmpty
              ? const Text('No upcoming events.')
              : Column(
                  children: upcomingRows.take(8).map((r) {
                    final facility = r.facilityId == null
                        ? 'Unknown'
                        : (facilityNamesById[r.facilityId!] ??
                              'Facility #${r.facilityId}');
                    return ListTile(
                      dense: true,
                      contentPadding: EdgeInsets.zero,
                      title: Text('${r.eventDate} - $facility'),
                      subtitle: Text(
                        '${r.username} | ${r.startTime}-${r.endTime}',
                      ),
                      trailing: _statusPill(r.status),
                    );
                  }).toList(),
                ),
        ),
        const SizedBox(height: 12),
        _sectionCard(
          title: 'Recent Decisions',
          child: recentDecisionRows.isEmpty
              ? const Text('No recent decisions.')
              : Column(
                  children: recentDecisionRows.take(8).map((r) {
                    final facility = r.facilityId == null
                        ? 'Unknown'
                        : (facilityNamesById[r.facilityId!] ??
                              'Facility #${r.facilityId}');
                    return ListTile(
                      dense: true,
                      contentPadding: EdgeInsets.zero,
                      title: Text('${r.username} - $facility'),
                      subtitle: Text(
                        '${r.eventDate} | payment: ${r.paymentStatus}',
                      ),
                      trailing: _statusPill(r.status),
                    );
                  }).toList(),
                ),
        ),
      ],
    );
  }

  int _statusCount(String status) {
    return reservations.where((r) => r.status.toLowerCase() == status).length;
  }

  Widget _sectionCard({required String title, required Widget child}) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16),
            ),
            const SizedBox(height: 8),
            const Divider(height: 1),
            const SizedBox(height: 8),
            child,
          ],
        ),
      ),
    );
  }

  Widget _pill(String text) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: const Color(0xFFF3F4F6),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(text, style: const TextStyle(fontSize: 12)),
    );
  }

  Widget _statusPill(String status) {
    final s = status.toLowerCase();
    Color bg = const Color(0xFFF3F4F6);
    Color fg = const Color(0xFF374151);
    if (s == 'approved' || s == 'completed') {
      bg = const Color(0xFFDCFCE7);
      fg = const Color(0xFF166534);
    } else if (s == 'pending') {
      bg = const Color(0xFFFFEDD5);
      fg = const Color(0xFF9A3412);
    } else if (s == 'rejected' || s == 'cancelled') {
      bg = const Color(0xFFFEE2E2);
      fg = const Color(0xFF991B1B);
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        status,
        style: TextStyle(fontSize: 12, color: fg, fontWeight: FontWeight.w600),
      ),
    );
  }
}

class _MetricCard extends StatelessWidget {
  const _MetricCard({
    required this.label,
    required this.value,
    required this.tone,
  });

  final String label;
  final String value;
  final Color tone;

  @override
  Widget build(BuildContext context) {
    return ConstrainedBox(
      constraints: const BoxConstraints(minWidth: 150),
      child: Card(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                height: 6,
                width: 34,
                decoration: BoxDecoration(
                  color: tone,
                  borderRadius: BorderRadius.circular(6),
                ),
              ),
              const SizedBox(height: 8),
              Text(label, style: const TextStyle(color: Colors.black54)),
              const SizedBox(height: 8),
              Text(value, style: Theme.of(context).textTheme.headlineSmall),
            ],
          ),
        ),
      ),
    );
  }
}
