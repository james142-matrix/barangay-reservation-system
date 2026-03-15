import 'package:flutter/material.dart';

import '../../core/ui_error.dart';
import '../facilities/facility.dart';
import '../reservations/reservation.dart';

typedef UpdatePaymentFn =
    Future<void> Function(
      Reservation reservation, {
      required double amountToAdd,
    });
typedef CancelReservationFn = Future<void> Function(Reservation reservation);

class BillingPage extends StatefulWidget {
  const BillingPage({
    super.key,
    required this.reservations,
    required this.facilities,
    required this.onAddPayment,
    required this.onCancelReservation,
  });

  final List<Reservation> reservations;
  final List<Facility> facilities;
  final UpdatePaymentFn onAddPayment;
  final CancelReservationFn onCancelReservation;

  @override
  State<BillingPage> createState() => _BillingPageState();
}

class _BillingPageState extends State<BillingPage> {
  final Set<int> _busy = <int>{};
  String _filter = 'open';
  final TextEditingController _searchController = TextEditingController();
  int _page = 1;
  int _pageSize = 10;

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final facilityById = <int, String>{
      for (final f in widget.facilities) f.id: f.name,
    };
    final query = _searchController.text.trim().toLowerCase();
    final data =
        widget.reservations
            .where((r) {
              if (_filter == 'open') return r.amountPaid < r.totalCost;
              if (_filter == 'paid') return r.amountPaid >= r.totalCost;
              return true;
            })
            .where((r) {
              if (query.isEmpty) return true;
              final facilityName = r.facilityId == null
                  ? 'unknown'
                  : (facilityById[r.facilityId!] ?? 'facility #${r.facilityId}')
                        .toLowerCase();
              return r.username.toLowerCase().contains(query) ||
                  r.id.toString().contains(query) ||
                  facilityName.contains(query);
            })
            .toList()
          ..sort((a, b) {
            final aDate =
                DateTime.tryParse(a.createdAt) ??
                DateTime.fromMillisecondsSinceEpoch(0);
            final bDate =
                DateTime.tryParse(b.createdAt) ??
                DateTime.fromMillisecondsSinceEpoch(0);
            return bDate.compareTo(aDate);
          });
    final totalRevenue = data.fold<double>(0, (sum, r) => sum + _paidAmount(r));
    final pendingPayments = data.where((r) {
      final status = r.status.toLowerCase();
      return status == 'approved' &&
          r.paymentStatus.toLowerCase() != 'cancelled' &&
          _balanceAmount(r) > 0;
    }).length;
    final cashPaid = data.where((r) {
      final p = r.paymentStatus.toLowerCase();
      return p == 'cash' || p == 'paid';
    }).length;
    final totalPages = data.isEmpty ? 1 : ((data.length - 1) ~/ _pageSize) + 1;
    if (_page > totalPages) _page = totalPages;
    final start = (_page - 1) * _pageSize;
    final end = (start + _pageSize).clamp(0, data.length);
    final pageData = data.sublist(start.clamp(0, data.length), end);

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Row(
          children: [
            Expanded(
              child: Text(
                'Billing',
                style: Theme.of(context).textTheme.titleLarge,
              ),
            ),
            DropdownButton<String>(
              value: _filter,
              items: const [
                DropdownMenuItem(value: 'open', child: Text('Open')),
                DropdownMenuItem(value: 'paid', child: Text('Paid')),
                DropdownMenuItem(value: 'all', child: Text('All')),
              ],
              onChanged: (value) => setState(() {
                _filter = value ?? 'open';
                _page = 1;
              }),
            ),
          ],
        ),
        const SizedBox(height: 10),
        TextField(
          controller: _searchController,
          decoration: InputDecoration(
            labelText: 'Search billing',
            border: const OutlineInputBorder(),
            suffixIcon: IconButton(
              onPressed: () {
                _searchController.clear();
                setState(() => _page = 1);
              },
              icon: const Icon(Icons.clear),
            ),
          ),
          onChanged: (_) => setState(() => _page = 1),
        ),
        const SizedBox(height: 10),
        Wrap(
          spacing: 10,
          runSpacing: 10,
          children: [
            _statCard('Revenue', 'PHP ${totalRevenue.toStringAsFixed(2)}'),
            _statCard('Pending Payment', '$pendingPayments'),
            _statCard('Cash Paid', '$cashPaid'),
          ],
        ),
        const SizedBox(height: 10),
        if (data.isEmpty)
          const Card(
            child: Padding(
              padding: EdgeInsets.all(12),
              child: Text('No billing items.'),
            ),
          ),
        ...pageData.map((r) {
          final paid = _paidAmount(r);
          final remaining = _balanceAmount(r);
          final dueNow = _dueNowAmount(r);
          final busy = _busy.contains(r.id);
          final facilityName = r.facilityId == null
              ? 'Unknown'
              : (facilityById[r.facilityId!] ?? 'Facility #${r.facilityId}');
          final canCollect =
              r.status.toLowerCase() == 'approved' &&
              r.paymentStatus.toLowerCase() != 'cancelled' &&
              remaining > 0 &&
              dueNow > 0;
          final canCancel =
              r.status.toLowerCase() == 'approved' &&
              r.paymentStatus.toLowerCase() != 'cancelled' &&
              paid <= 0;
          return Card(
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '$facilityName - #${r.id}',
                    style: const TextStyle(fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 6),
                  Text('Client: ${r.username}'),
                  const SizedBox(height: 4),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      _statusPill(r.status),
                      _paymentPill(r.paymentStatus),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text('Total: PHP ${r.totalCost.toStringAsFixed(2)}'),
                  Text('Paid: PHP ${paid.toStringAsFixed(2)}'),
                  Text('Remaining: PHP ${remaining.toStringAsFixed(2)}'),
                  Text('Due Now: PHP ${dueNow.toStringAsFixed(2)}'),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      OutlinedButton(
                        onPressed: () =>
                            _showBillingDetails(context, r, facilityName),
                        child: const Text('View'),
                      ),
                      if (canCollect)
                        FilledButton(
                          onPressed: busy
                              ? null
                              : () => _addPayment(r, dueNow, full: true),
                          child: Text(
                            r.paymentOption.toLowerCase() == 'down_payment' &&
                                    paid <= 0
                                ? 'Collect Down Payment'
                                : 'Collect Balance',
                          ),
                        ),
                      if (canCancel)
                        OutlinedButton(
                          onPressed: busy ? null : () => _cancelReservation(r),
                          child: const Text('Cancel Reservation'),
                        ),
                      if (!canCollect && remaining <= 0)
                        const Text('Fully paid.'),
                    ],
                  ),
                ],
              ),
            ),
          );
        }),
        if (data.isNotEmpty) ...[
          const SizedBox(height: 10),
          _buildPager(totalPages, data.length),
        ],
      ],
    );
  }

  Widget _statCard(String label, String value) {
    return SizedBox(
      width: 170,
      child: Card(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: const TextStyle(fontSize: 12, color: Colors.black54),
              ),
              const SizedBox(height: 4),
              Text(
                value,
                style: const TextStyle(
                  fontWeight: FontWeight.w700,
                  fontSize: 18,
                ),
              ),
            ],
          ),
        ),
      ),
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
        style: TextStyle(color: fg, fontWeight: FontWeight.w600, fontSize: 12),
      ),
    );
  }

  Widget _paymentPill(String paymentStatus) {
    final p = paymentStatus.toLowerCase();
    Color bg = const Color(0xFFE5E7EB);
    Color fg = const Color(0xFF374151);
    if (p == 'paid' || p == 'cash') {
      bg = const Color(0xFFDBEAFE);
      fg = const Color(0xFF1E40AF);
    } else if (p == 'partial') {
      bg = const Color(0xFFE0F2FE);
      fg = const Color(0xFF0C4A6E);
    } else if (p == 'cancelled') {
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
        paymentStatus,
        style: TextStyle(color: fg, fontWeight: FontWeight.w600, fontSize: 12),
      ),
    );
  }

  Widget _buildPager(int totalPages, int totalItems) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(10),
        child: Wrap(
          crossAxisAlignment: WrapCrossAlignment.center,
          spacing: 10,
          runSpacing: 10,
          children: [
            Text('Total: $totalItems'),
            DropdownButton<int>(
              value: _pageSize,
              items: const [
                DropdownMenuItem(value: 5, child: Text('5 / page')),
                DropdownMenuItem(value: 10, child: Text('10 / page')),
                DropdownMenuItem(value: 20, child: Text('20 / page')),
              ],
              onChanged: (value) {
                setState(() {
                  _pageSize = value ?? 10;
                  _page = 1;
                });
              },
            ),
            Text('Page $_page of $totalPages'),
            OutlinedButton(
              onPressed: _page > 1 ? () => setState(() => _page--) : null,
              child: const Text('Prev'),
            ),
            OutlinedButton(
              onPressed: _page < totalPages
                  ? () => setState(() => _page++)
                  : null,
              child: const Text('Next'),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _addPayment(
    Reservation reservation,
    double remaining, {
    required bool full,
  }) async {
    double amountToAdd = remaining;
    if (!full) {
      final value = await _showPaymentDialog(remaining);
      if (value == null) return;
      amountToAdd = value;
    }
    if (amountToAdd <= 0 || amountToAdd > remaining) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Invalid payment amount.')));
      return;
    }
    if (!mounted) return;
    final ok =
        await showDialog<bool>(
          context: context,
          builder: (dialogContext) => AlertDialog(
            title: const Text('Confirm Payment'),
            content: Text(
              'Record payment of PHP ${amountToAdd.toStringAsFixed(2)} for reservation #${reservation.id}?',
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.of(dialogContext).pop(false),
                child: const Text('Cancel'),
              ),
              FilledButton(
                onPressed: () => Navigator.of(dialogContext).pop(true),
                child: const Text('Proceed'),
              ),
            ],
          ),
        ) ??
        false;
    if (!ok) return;
    setState(() => _busy.add(reservation.id));
    try {
      await widget.onAddPayment(reservation, amountToAdd: amountToAdd);
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Payment recorded.')));
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(uiErrorMessage(e))));
    } finally {
      if (mounted) setState(() => _busy.remove(reservation.id));
    }
  }

  Future<void> _cancelReservation(Reservation reservation) async {
    final ok =
        await showDialog<bool>(
          context: context,
          builder: (dialogContext) => AlertDialog(
            title: const Text('Cancel Reservation'),
            content: Text('Cancel reservation #${reservation.id}?'),
            actions: [
              TextButton(
                onPressed: () => Navigator.of(dialogContext).pop(false),
                child: const Text('No'),
              ),
              FilledButton(
                onPressed: () => Navigator.of(dialogContext).pop(true),
                child: const Text('Yes, Cancel'),
              ),
            ],
          ),
        ) ??
        false;
    if (!ok) return;
    setState(() => _busy.add(reservation.id));
    try {
      await widget.onCancelReservation(reservation);
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Reservation cancelled.')));
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(uiErrorMessage(e))));
    } finally {
      if (mounted) setState(() => _busy.remove(reservation.id));
    }
  }

  Future<void> _showBillingDetails(
    BuildContext context,
    Reservation r,
    String facilityName,
  ) async {
    final paid = _paidAmount(r);
    final remaining = _balanceAmount(r);
    final dueNow = _dueNowAmount(r);
    final addOnSummary = r.addOns.isEmpty
        ? 'None'
        : r.addOns
              .where((e) => e.qty > 0)
              .map((e) => '${e.name.isEmpty ? e.id : e.name} x${e.qty}')
              .join(', ');
    await showDialog<void>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: Text('Billing #${r.id}'),
        content: SizedBox(
          width: 520,
          child: SingleChildScrollView(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Client: ${r.username}'),
                Text('Facility: $facilityName'),
                Text('Date: ${r.eventDate}'),
                Text('Time: ${r.startTime} - ${r.endTime}'),
                const SizedBox(height: 8),
                Text('Total: PHP ${r.totalCost.toStringAsFixed(2)}'),
                Text('Paid: PHP ${paid.toStringAsFixed(2)}'),
                Text('Balance: PHP ${remaining.toStringAsFixed(2)}'),
                Text('Payment Option: ${r.paymentOption}'),
                Text(
                  'Down Payment Target: PHP ${r.downPaymentAmount.toStringAsFixed(2)}',
                ),
                Text('Due Now: PHP ${dueNow.toStringAsFixed(2)}'),
                Text('Add-ons: $addOnSummary'),
                Text(
                  'Add-on Subtotal: PHP ${r.computedAddOnTotal.toStringAsFixed(2)}',
                ),
                if (r.rejectionReason.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  Text(
                    'Reason: ${r.rejectionReason}',
                    style: const TextStyle(color: Colors.redAccent),
                  ),
                ],
              ],
            ),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(),
            child: const Text('Close'),
          ),
        ],
      ),
    );
  }

  double _paidAmount(Reservation r) {
    final p = r.paymentStatus.toLowerCase();
    if (p == 'cash' || p == 'paid') return r.totalCost;
    return r.amountPaid.clamp(0, r.totalCost).toDouble();
  }

  double _balanceAmount(Reservation r) {
    return (r.totalCost - _paidAmount(r)).clamp(0, double.infinity).toDouble();
  }

  double _dueNowAmount(Reservation r) {
    final total = r.totalCost;
    final paid = _paidAmount(r);
    final remaining = (total - paid).clamp(0, double.infinity).toDouble();
    if (remaining <= 0) return 0;
    if (r.paymentOption.toLowerCase() == 'down_payment' && paid <= 0) {
      final down = r.downPaymentAmount.clamp(0, total).toDouble();
      final initialDue = down > 0 ? down : total;
      return initialDue.clamp(0, remaining).toDouble();
    }
    return remaining;
  }

  Future<double?> _showPaymentDialog(double remaining) async {
    final controller = TextEditingController();
    return showDialog<double>(
      context: context,
      builder: (dialogContext) {
        return AlertDialog(
          title: const Text('Add Partial Payment'),
          content: TextField(
            controller: controller,
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            decoration: InputDecoration(
              labelText: 'Amount (max ${remaining.toStringAsFixed(2)})',
              border: const OutlineInputBorder(),
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(dialogContext).pop(),
              child: const Text('Cancel'),
            ),
            FilledButton(
              onPressed: () {
                final value = double.tryParse(controller.text.trim());
                Navigator.of(dialogContext).pop(value);
              },
              child: const Text('Save'),
            ),
          ],
        );
      },
    );
  }
}
