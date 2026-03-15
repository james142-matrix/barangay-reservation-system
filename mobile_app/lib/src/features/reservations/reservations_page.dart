import 'package:flutter/material.dart';

import '../../core/ui_error.dart';
import '../facilities/facility.dart';
import 'reservation.dart';

typedef StatusUpdateFn =
    Future<void> Function(
      Reservation reservation,
      String status, {
      String? rejectionReason,
    });
typedef RecordPaymentFn = Future<void> Function(Reservation reservation);
typedef UpdateDetailsFn =
    Future<void> Function(
      Reservation reservation,
      Map<String, Object?> updates,
    );

class ReservationsPage extends StatefulWidget {
  const ReservationsPage({
    super.key,
    required this.reservations,
    required this.facilityNamesById,
    required this.facilities,
    required this.onUpdateStatus,
    required this.onRecordFullPayment,
    required this.onUpdateDetails,
  });

  final List<Reservation> reservations;
  final Map<int, String> facilityNamesById;
  final List<Facility> facilities;
  final StatusUpdateFn onUpdateStatus;
  final RecordPaymentFn onRecordFullPayment;
  final UpdateDetailsFn onUpdateDetails;

  @override
  State<ReservationsPage> createState() => _ReservationsPageState();
}

class _ReservationsPageState extends State<ReservationsPage> {
  final Set<int> _updatingReservationIds = <int>{};
  final TextEditingController _searchController = TextEditingController();
  String _statusFilter = 'all';
  int _page = 1;
  int _pageSize = 10;

  int? _timeToMinutes(String value) {
    final m = RegExp(r'^(\d{2}):(\d{2})$').firstMatch(value);
    if (m == null) return null;
    final hh = int.tryParse(m.group(1)!);
    final mm = int.tryParse(m.group(2)!);
    if (hh == null || mm == null || hh < 0 || hh > 23 || mm < 0 || mm > 59)
      return null;
    return hh * 60 + mm;
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final query = _searchController.text.trim().toLowerCase();
    final filtered =
        widget.reservations.where((r) {
          if (_statusFilter != 'all' && r.status.toLowerCase() != _statusFilter)
            return false;
          if (query.isEmpty) return true;
          final facilityName = r.facilityId == null
              ? 'unknown'
              : (widget.facilityNamesById[r.facilityId!] ??
                        'facility #${r.facilityId}')
                    .toLowerCase();
          return r.username.toLowerCase().contains(query) ||
              r.eventType.toLowerCase().contains(query) ||
              facilityName.contains(query) ||
              r.id.toString().contains(query);
        }).toList()..sort((a, b) {
          final aDate =
              DateTime.tryParse(a.createdAt) ??
              DateTime.fromMillisecondsSinceEpoch(0);
          final bDate =
              DateTime.tryParse(b.createdAt) ??
              DateTime.fromMillisecondsSinceEpoch(0);
          return bDate.compareTo(aDate);
        });
    final totalPages = filtered.isEmpty
        ? 1
        : ((filtered.length - 1) ~/ _pageSize) + 1;
    if (_page > totalPages) _page = totalPages;
    final start = (_page - 1) * _pageSize;
    final end = (start + _pageSize).clamp(0, filtered.length);
    final pageData = filtered.sublist(start.clamp(0, filtered.length), end);

    final children = <Widget>[
      _buildHeader(),
      const SizedBox(height: 10),
      _buildFilters(),
      const SizedBox(height: 10),
      _buildStatusSummary(widget.reservations),
      const SizedBox(height: 10),
    ];
    if (filtered.isEmpty) {
      children.add(
        const Center(
          child: Padding(
            padding: EdgeInsets.symmetric(vertical: 24),
            child: Text('No reservations found.'),
          ),
        ),
      );
    } else {
      for (final r in pageData) {
        final facilityName = r.facilityId == null
            ? 'Unknown Facility'
            : (widget.facilityNamesById[r.facilityId!] ??
                  'Facility #${r.facilityId}');
        final isUpdating = _updatingReservationIds.contains(r.id);
        children.add(
          Card(
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          facilityName,
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                      _StatusChip(status: r.status),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text('Reservation ID: #${r.id}'),
                  Text('Client Username: ${r.username}'),
                  Text(
                    'Event Type: ${r.eventType.isEmpty ? '-' : r.eventType}',
                  ),
                  Text(
                    'Schedule: ${r.eventDate} ${r.startTime} - ${r.eventEndDate} ${r.endTime}',
                  ),
                  Text('Submitted: ${r.createdAt.isEmpty ? '-' : r.createdAt}'),
                  Text('Guests: ${r.expectedGuests}'),
                  Text(
                    'Contact: ${r.contactPerson.isEmpty ? '-' : r.contactPerson} | ${r.contactPhone.isEmpty ? '-' : r.contactPhone}',
                  ),
                  Text(
                    'Client Email: ${r.clientEmail.isEmpty ? '-' : r.clientEmail}',
                  ),
                  const SizedBox(height: 6),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [_pill(r.paymentOption), _pill(r.paymentStatus)],
                  ),
                  Text(
                    'Paid: PHP ${r.amountPaid.toStringAsFixed(2)} / PHP ${r.totalCost.toStringAsFixed(2)}',
                  ),
                  if (r.rejectionReason.isNotEmpty) ...[
                    const SizedBox(height: 6),
                    Text(
                      'Rejection reason: ${r.rejectionReason}',
                      style: const TextStyle(color: Colors.redAccent),
                    ),
                  ],
                  const SizedBox(height: 10),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: _buildActions(context, r, isUpdating),
                  ),
                ],
              ),
            ),
          ),
        );
        children.add(const SizedBox(height: 10));
      }
      children.add(_buildPager(totalPages, filtered.length));
    }

    return ListView(padding: const EdgeInsets.all(16), children: children);
  }

  Widget _buildHeader() {
    return Container(
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
            child: const Icon(Icons.event_note, color: Color(0xFFC2185B)),
          ),
          const SizedBox(width: 12),
          const Expanded(
            child: Text(
              'Reservation Requests',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFilters() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          children: [
            TextField(
              controller: _searchController,
              decoration: InputDecoration(
                labelText: 'Search (ID, username, event, facility)',
                border: const OutlineInputBorder(),
                suffixIcon: IconButton(
                  onPressed: () {
                    _searchController.clear();
                    setState(() {});
                  },
                  icon: const Icon(Icons.clear),
                ),
              ),
              onChanged: (_) => setState(() => _page = 1),
            ),
            const SizedBox(height: 8),
            DropdownButtonFormField<String>(
              key: ValueKey('res_filter_$_statusFilter'),
              initialValue: _statusFilter,
              decoration: const InputDecoration(
                labelText: 'Status Filter',
                border: OutlineInputBorder(),
              ),
              items: const [
                DropdownMenuItem(value: 'all', child: Text('All')),
                DropdownMenuItem(value: 'pending', child: Text('Pending')),
                DropdownMenuItem(value: 'approved', child: Text('Approved')),
                DropdownMenuItem(value: 'rejected', child: Text('Rejected')),
                DropdownMenuItem(value: 'completed', child: Text('Completed')),
                DropdownMenuItem(value: 'cancelled', child: Text('Cancelled')),
              ],
              onChanged: (value) {
                setState(() {
                  _statusFilter = value ?? 'all';
                  _page = 1;
                });
              },
            ),
          ],
        ),
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

  List<Widget> _buildActions(
    BuildContext context,
    Reservation r,
    bool isUpdating,
  ) {
    final s = r.status.toLowerCase();
    final actions = <Widget>[
      _actionButton(
        label: 'Review',
        icon: Icons.preview_outlined,
        enabled: !isUpdating,
        onPressed: () => _showReviewDialog(context, r),
      ),
    ];
    if (s != 'completed' && s != 'cancelled') {
      actions.add(
        _actionButton(
          label: 'Edit Details',
          icon: Icons.edit_note,
          enabled: !isUpdating,
          onPressed: () => _editDetails(context, r),
        ),
      );
    }

    if (s == 'pending') {
      actions.add(
        _actionButton(
          label: 'Approve',
          icon: Icons.check_circle_outline,
          enabled: !isUpdating,
          onPressed: () => _confirmAndRun(
            message: 'Approve reservation #${r.id}?',
            reservationId: r.id,
            task: () => widget.onUpdateStatus(r, 'approved'),
          ),
        ),
      );
      actions.add(
        _actionButton(
          label: 'Reject',
          icon: Icons.cancel_outlined,
          enabled: !isUpdating,
          onPressed: () => _rejectWithReason(context, r),
        ),
      );
      actions.add(
        _actionButton(
          label: 'Cancel',
          icon: Icons.block_outlined,
          enabled: !isUpdating,
          onPressed: () => _confirmAndRun(
            message: 'Cancel reservation #${r.id}?',
            reservationId: r.id,
            task: () => widget.onUpdateStatus(r, 'cancelled'),
          ),
        ),
      );
    }

    if (s == 'approved') {
      if (!r.isFullyPaid) {
        actions.add(
          _actionButton(
            label: 'Record Full Payment',
            icon: Icons.payments_outlined,
            enabled: !isUpdating,
            onPressed: () => _confirmAndRun(
              message:
                  'Record full remaining payment for reservation #${r.id}?',
              reservationId: r.id,
              task: () => widget.onRecordFullPayment(r),
            ),
          ),
        );
      }
      if (r.isFullyPaid) {
        actions.add(
          _actionButton(
            label: 'Complete',
            icon: Icons.task_alt,
            enabled: !isUpdating,
            onPressed: () => _confirmAndRun(
              message: 'Mark reservation #${r.id} as completed?',
              reservationId: r.id,
              task: () => widget.onUpdateStatus(r, 'completed'),
            ),
          ),
        );
      }
      actions.add(
        _actionButton(
          label: 'Cancel',
          icon: Icons.block_outlined,
          enabled: !isUpdating,
          onPressed: () => _confirmAndRun(
            message: 'Cancel reservation #${r.id}?',
            reservationId: r.id,
            task: () => widget.onUpdateStatus(r, 'cancelled'),
          ),
        ),
      );
    }

    if (s == 'rejected') {
      actions.add(
        _actionButton(
          label: 'Mark Pending',
          icon: Icons.undo,
          enabled: !isUpdating,
          onPressed: () => _confirmAndRun(
            message: 'Set reservation #${r.id} back to pending?',
            reservationId: r.id,
            task: () => widget.onUpdateStatus(r, 'pending'),
          ),
        ),
      );
      actions.add(
        _actionButton(
          label: 'Cancel',
          icon: Icons.block_outlined,
          enabled: !isUpdating,
          onPressed: () => _confirmAndRun(
            message: 'Cancel reservation #${r.id}?',
            reservationId: r.id,
            task: () => widget.onUpdateStatus(r, 'cancelled'),
          ),
        ),
      );
    }

    if (actions.isEmpty) {
      actions.add(const Text('No actions available.'));
    }
    return actions;
  }

  Widget _buildStatusSummary(List<Reservation> reservations) {
    int pending = 0;
    int approved = 0;
    int completed = 0;
    int rejected = 0;
    int cancelled = 0;
    for (final r in reservations) {
      final s = r.status.toLowerCase();
      if (s == 'pending') pending++;
      if (s == 'approved') approved++;
      if (s == 'completed') completed++;
      if (s == 'rejected') rejected++;
      if (s == 'cancelled') cancelled++;
    }
    final total = reservations.length;
    return Wrap(
      spacing: 10,
      runSpacing: 10,
      children: [
        _statCard('Total', '$total'),
        _statCard('Pending', '$pending'),
        _statCard('Approved', '$approved'),
        _statCard('Completed', '$completed'),
        _statCard('Rejected', '$rejected'),
        _statCard('Cancelled', '$cancelled'),
      ],
    );
  }

  Widget _statCard(String label, String value) {
    return SizedBox(
      width: 130,
      child: Card(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                height: 6,
                width: 34,
                decoration: BoxDecoration(
                  color: const Color(0xFFFCE7F3),
                  borderRadius: BorderRadius.circular(6),
                ),
              ),
              const SizedBox(height: 8),
              Text(
                label,
                style: const TextStyle(fontSize: 12, color: Colors.black54),
              ),
              const SizedBox(height: 4),
              Text(
                value,
                style: const TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _actionButton({
    required String label,
    required IconData icon,
    required bool enabled,
    required Future<void> Function() onPressed,
  }) {
    return OutlinedButton.icon(
      onPressed: enabled ? onPressed : null,
      icon: Icon(icon, size: 18),
      label: Text(label),
    );
  }

  Widget _pill(String text) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: const Color(0xFFF3F4F6),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        text,
        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
      ),
    );
  }

  Future<void> _rejectWithReason(BuildContext context, Reservation r) async {
    final reason = await _showRejectionReasonDialog(context);
    if (reason == null || reason.trim().isEmpty) return;
    await _runUpdate(
      () =>
          widget.onUpdateStatus(r, 'rejected', rejectionReason: reason.trim()),
      r.id,
    );
  }

  Future<String?> _showRejectionReasonDialog(BuildContext context) async {
    final controller = TextEditingController();
    return showDialog<String>(
      context: context,
      builder: (dialogContext) {
        return AlertDialog(
          title: const Text('Reject Reservation'),
          content: TextField(
            controller: controller,
            minLines: 2,
            maxLines: 4,
            decoration: const InputDecoration(
              hintText: 'Enter rejection reason',
              border: OutlineInputBorder(),
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(dialogContext).pop(),
              child: const Text('Cancel'),
            ),
            FilledButton(
              onPressed: () => Navigator.of(dialogContext).pop(controller.text),
              child: const Text('Submit'),
            ),
          ],
        );
      },
    );
  }

  Future<void> _runUpdate(
    Future<void> Function() task,
    int reservationId,
  ) async {
    setState(() {
      _updatingReservationIds.add(reservationId);
    });
    try {
      await task();
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Reservation updated.')));
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(uiErrorMessage(e))));
    } finally {
      if (mounted) {
        setState(() {
          _updatingReservationIds.remove(reservationId);
        });
      }
    }
  }

  Future<void> _editDetails(BuildContext context, Reservation r) async {
    final formState = await _showEditDetailsDialog(context, r);
    if (formState == null) return;
    await _runUpdate(() => widget.onUpdateDetails(r, formState), r.id);
  }

  Future<Map<String, Object?>?> _showEditDetailsDialog(
    BuildContext context,
    Reservation reservation,
  ) async {
    final formKey = GlobalKey<FormState>();
    Facility? selectedFacility;
    if (reservation.facilityId != null) {
      for (final f in widget.facilities) {
        if (f.id == reservation.facilityId) {
          selectedFacility = f;
          break;
        }
      }
    }
    selectedFacility ??= widget.facilities.isNotEmpty
        ? widget.facilities.first
        : null;
    final usernameController = TextEditingController(
      text: reservation.username,
    );
    final emailController = TextEditingController(
      text: reservation.clientEmail,
    );
    final contactPersonController = TextEditingController(
      text: reservation.contactPerson,
    );
    final contactPhoneController = TextEditingController(
      text: reservation.contactPhone,
    );
    final eventDescriptionController = TextEditingController(
      text: reservation.eventDescription,
    );
    final expectedGuestsController = TextEditingController(
      text: reservation.expectedGuests.toString(),
    );
    final eventDateController = TextEditingController(
      text: reservation.eventDate,
    );
    final eventEndDateController = TextEditingController(
      text: reservation.eventEndDate,
    );
    final startTimeController = TextEditingController(
      text: reservation.startTime,
    );
    final endTimeController = TextEditingController(text: reservation.endTime);
    final medicalRoomDetailsController = TextEditingController(
      text: reservation.medicalRoomDetails,
    );
    String paymentOption = reservation.paymentOption.isEmpty
        ? 'full'
        : reservation.paymentOption;
    final downPaymentController = TextEditingController(
      text: reservation.downPaymentAmount.toStringAsFixed(2),
    );
    final facilityAmountController = TextEditingController(
      text: (reservation.totalCost - reservation.computedAddOnTotal)
          .clamp(0, double.infinity)
          .toStringAsFixed(2),
    );
    final totalCostController = TextEditingController(
      text: reservation.totalCost.toStringAsFixed(2),
    );
    List<_EditAddOnDraft> editableAddOns = _buildEditableAddOns(
      selectedFacility: selectedFacility,
      reservation: reservation,
    );
    void recomputeTotal() {
      final facilityAmount =
          (double.tryParse(facilityAmountController.text.trim()) ?? 0)
              .clamp(0, double.infinity)
              .toDouble();
      final addOnSubtotal = editableAddOns.fold<double>(
        0,
        (sum, item) => sum + item.total,
      );
      totalCostController.text = (facilityAmount + addOnSubtotal)
          .toStringAsFixed(2);
    }

    recomputeTotal();
    String eventType = reservation.eventType;
    if (selectedFacility != null &&
        selectedFacility.eventTypes.isNotEmpty &&
        !selectedFacility.eventTypes.contains(eventType)) {
      eventType = selectedFacility.eventTypes.first;
    }

    return showDialog<Map<String, Object?>>(
      context: context,
      builder: (dialogContext) {
        return StatefulBuilder(
          builder: (context, setLocalState) {
            return AlertDialog(
              title: Text('Edit #${reservation.id}'),
              content: SizedBox(
                width: 460,
                child: Form(
                  key: formKey,
                  child: SingleChildScrollView(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        DropdownButtonFormField<Facility>(
                          key: ValueKey(
                            'edit_fac_${selectedFacility?.id ?? 0}',
                          ),
                          initialValue: selectedFacility,
                          decoration: const InputDecoration(
                            labelText: 'Facility',
                            border: OutlineInputBorder(),
                          ),
                          items: widget.facilities
                              .map(
                                (f) => DropdownMenuItem(
                                  value: f,
                                  child: Text(f.name),
                                ),
                              )
                              .toList(),
                          onChanged: (value) {
                            setLocalState(() {
                              selectedFacility = value;
                              final options =
                                  selectedFacility?.eventTypes ??
                                  const <String>[];
                              if (options.isNotEmpty &&
                                  !options.contains(eventType)) {
                                eventType = options.first;
                              }
                              editableAddOns = _buildEditableAddOns(
                                selectedFacility: selectedFacility,
                                reservation: reservation,
                              );
                              final start = DateTime.tryParse(
                                '${eventDateController.text.trim()} ${startTimeController.text.trim()}:00',
                              );
                              final end = DateTime.tryParse(
                                '${eventEndDateController.text.trim()} ${endTimeController.text.trim()}:00',
                              );
                              if (start != null &&
                                  end != null &&
                                  end.isAfter(start) &&
                                  selectedFacility != null) {
                                final hours =
                                    end.difference(start).inMinutes / 60.0;
                                facilityAmountController.text =
                                    (selectedFacility!.price * hours)
                                        .toStringAsFixed(2);
                              }
                              recomputeTotal();
                            });
                          },
                        ),
                        const SizedBox(height: 10),
                        TextFormField(
                          controller: usernameController,
                          decoration: const InputDecoration(
                            labelText: 'Client Name',
                            border: OutlineInputBorder(),
                          ),
                          validator: (value) {
                            final v = (value ?? '').trim();
                            if (v.length < 3)
                              return 'Client name must be at least 3 chars';
                            return null;
                          },
                        ),
                        const SizedBox(height: 10),
                        DropdownButtonFormField<String>(
                          key: ValueKey('edit_event_$eventType'),
                          initialValue: eventType.isEmpty ? null : eventType,
                          decoration: const InputDecoration(
                            labelText: 'Event Type',
                            border: OutlineInputBorder(),
                          ),
                          items:
                              (selectedFacility?.eventTypes ?? const <String>[])
                                  .map(
                                    (e) => DropdownMenuItem(
                                      value: e,
                                      child: Text(e),
                                    ),
                                  )
                                  .toList(),
                          onChanged: (value) {
                            setLocalState(() {
                              eventType = value ?? '';
                            });
                          },
                        ),
                        const SizedBox(height: 10),
                        TextFormField(
                          controller: eventDateController,
                          decoration: const InputDecoration(
                            labelText: 'Event Date (YYYY-MM-DD)',
                            border: OutlineInputBorder(),
                          ),
                          validator: (v) =>
                              RegExp(
                                r'^\d{4}-\d{2}-\d{2}$',
                              ).hasMatch((v ?? '').trim())
                              ? null
                              : 'Invalid date format',
                          onChanged: (_) {
                            setLocalState(() {
                              final start = DateTime.tryParse(
                                '${eventDateController.text.trim()} ${startTimeController.text.trim()}:00',
                              );
                              final end = DateTime.tryParse(
                                '${eventEndDateController.text.trim()} ${endTimeController.text.trim()}:00',
                              );
                              if (start != null &&
                                  end != null &&
                                  end.isAfter(start) &&
                                  selectedFacility != null) {
                                final hours =
                                    end.difference(start).inMinutes / 60.0;
                                facilityAmountController.text =
                                    (selectedFacility!.price * hours)
                                        .toStringAsFixed(2);
                              }
                              recomputeTotal();
                            });
                          },
                        ),
                        const SizedBox(height: 10),
                        TextFormField(
                          controller: eventEndDateController,
                          decoration: const InputDecoration(
                            labelText: 'Event End Date (YYYY-MM-DD)',
                            border: OutlineInputBorder(),
                          ),
                          validator: (v) =>
                              RegExp(
                                r'^\d{4}-\d{2}-\d{2}$',
                              ).hasMatch((v ?? '').trim())
                              ? null
                              : 'Invalid date format',
                          onChanged: (_) {
                            setLocalState(() {
                              final start = DateTime.tryParse(
                                '${eventDateController.text.trim()} ${startTimeController.text.trim()}:00',
                              );
                              final end = DateTime.tryParse(
                                '${eventEndDateController.text.trim()} ${endTimeController.text.trim()}:00',
                              );
                              if (start != null &&
                                  end != null &&
                                  end.isAfter(start) &&
                                  selectedFacility != null) {
                                final hours =
                                    end.difference(start).inMinutes / 60.0;
                                facilityAmountController.text =
                                    (selectedFacility!.price * hours)
                                        .toStringAsFixed(2);
                              }
                              recomputeTotal();
                            });
                          },
                        ),
                        const SizedBox(height: 10),
                        Row(
                          children: [
                            Expanded(
                              child: TextFormField(
                                controller: startTimeController,
                                decoration: const InputDecoration(
                                  labelText: 'Start (HH:mm)',
                                  border: OutlineInputBorder(),
                                ),
                                validator: (v) =>
                                    RegExp(
                                      r'^\d{2}:\d{2}$',
                                    ).hasMatch((v ?? '').trim())
                                    ? null
                                    : 'HH:mm',
                                onChanged: (_) {
                                  setLocalState(() {
                                    final start = DateTime.tryParse(
                                      '${eventDateController.text.trim()} ${startTimeController.text.trim()}:00',
                                    );
                                    final end = DateTime.tryParse(
                                      '${eventEndDateController.text.trim()} ${endTimeController.text.trim()}:00',
                                    );
                                    if (start != null &&
                                        end != null &&
                                        end.isAfter(start) &&
                                        selectedFacility != null) {
                                      final hours =
                                          end.difference(start).inMinutes /
                                          60.0;
                                      facilityAmountController.text =
                                          (selectedFacility!.price * hours)
                                              .toStringAsFixed(2);
                                    }
                                    recomputeTotal();
                                  });
                                },
                              ),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: TextFormField(
                                controller: endTimeController,
                                decoration: const InputDecoration(
                                  labelText: 'End (HH:mm)',
                                  border: OutlineInputBorder(),
                                ),
                                validator: (v) =>
                                    RegExp(
                                      r'^\d{2}:\d{2}$',
                                    ).hasMatch((v ?? '').trim())
                                    ? null
                                    : 'HH:mm',
                                onChanged: (_) {
                                  setLocalState(() {
                                    final start = DateTime.tryParse(
                                      '${eventDateController.text.trim()} ${startTimeController.text.trim()}:00',
                                    );
                                    final end = DateTime.tryParse(
                                      '${eventEndDateController.text.trim()} ${endTimeController.text.trim()}:00',
                                    );
                                    if (start != null &&
                                        end != null &&
                                        end.isAfter(start) &&
                                        selectedFacility != null) {
                                      final hours =
                                          end.difference(start).inMinutes /
                                          60.0;
                                      facilityAmountController.text =
                                          (selectedFacility!.price * hours)
                                              .toStringAsFixed(2);
                                    }
                                    recomputeTotal();
                                  });
                                },
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 10),
                        TextFormField(
                          controller: emailController,
                          decoration: const InputDecoration(
                            labelText: 'Client Email',
                            border: OutlineInputBorder(),
                          ),
                          validator: (value) {
                            final v = (value ?? '').trim();
                            if (v.isEmpty) return null;
                            final isEmail = RegExp(
                              r'^[^@\s]+@[^@\s]+\.[^@\s]+$',
                            ).hasMatch(v);
                            if (!isEmail) return 'Invalid email';
                            return null;
                          },
                        ),
                        const SizedBox(height: 10),
                        TextFormField(
                          controller: contactPersonController,
                          decoration: const InputDecoration(
                            labelText: 'Contact Person',
                            border: OutlineInputBorder(),
                          ),
                          validator: (value) {
                            final v = (value ?? '').trim();
                            if (v.isEmpty) return 'Required';
                            return null;
                          },
                        ),
                        const SizedBox(height: 10),
                        TextFormField(
                          controller: contactPhoneController,
                          decoration: const InputDecoration(
                            labelText: 'Contact Phone',
                            border: OutlineInputBorder(),
                          ),
                          validator: (value) {
                            final v = (value ?? '').trim();
                            if (v.isEmpty) return 'Required';
                            if (!RegExp(r'^\d{7,15}$').hasMatch(v))
                              return 'Use 7-15 digits';
                            return null;
                          },
                        ),
                        const SizedBox(height: 10),
                        DropdownButtonFormField<String>(
                          key: ValueKey('edit_payment_$paymentOption'),
                          initialValue: paymentOption,
                          decoration: const InputDecoration(
                            labelText: 'Payment Option',
                            border: OutlineInputBorder(),
                          ),
                          items: const [
                            DropdownMenuItem(
                              value: 'full',
                              child: Text('Full Payment'),
                            ),
                            DropdownMenuItem(
                              value: 'down_payment',
                              child: Text('Down Payment'),
                            ),
                          ],
                          onChanged: (value) {
                            setLocalState(() {
                              paymentOption = value ?? 'full';
                              if (paymentOption != 'down_payment') {
                                downPaymentController.text = '0.00';
                              }
                            });
                          },
                        ),
                        const SizedBox(height: 10),
                        if (paymentOption == 'down_payment') ...[
                          TextFormField(
                            controller: downPaymentController,
                            keyboardType: const TextInputType.numberWithOptions(
                              decimal: true,
                            ),
                            decoration: const InputDecoration(
                              labelText: 'Down Payment Amount',
                              border: OutlineInputBorder(),
                            ),
                            validator: (value) {
                              final down =
                                  double.tryParse((value ?? '').trim()) ?? 0;
                              if (down <= 0)
                                return 'Down payment must be greater than 0';
                              final total =
                                  double.tryParse(
                                    totalCostController.text.trim(),
                                  ) ??
                                  0;
                              if (total > 0 && down > total)
                                return 'Down payment cannot exceed total cost';
                              return null;
                            },
                          ),
                          const SizedBox(height: 10),
                        ],
                        TextFormField(
                          controller: facilityAmountController,
                          keyboardType: const TextInputType.numberWithOptions(
                            decimal: true,
                          ),
                          decoration: const InputDecoration(
                            labelText: 'Facility Amount (PHP)',
                            border: OutlineInputBorder(),
                          ),
                          onChanged: (_) {
                            setLocalState(recomputeTotal);
                          },
                          validator: (value) {
                            final amount = double.tryParse(
                              (value ?? '').trim(),
                            );
                            if (amount == null || amount < 0)
                              return 'Invalid facility amount';
                            return null;
                          },
                        ),
                        const SizedBox(height: 10),
                        Align(
                          alignment: Alignment.centerLeft,
                          child: Text(
                            'Add-ons',
                            style: Theme.of(context).textTheme.titleSmall,
                          ),
                        ),
                        const SizedBox(height: 6),
                        if (editableAddOns.isEmpty)
                          const Align(
                            alignment: Alignment.centerLeft,
                            child: Text(
                              'No add-ons configured for this facility.',
                            ),
                          ),
                        ...editableAddOns.map(
                          (item) => Padding(
                            padding: const EdgeInsets.only(bottom: 8),
                            child: Row(
                              children: [
                                Expanded(
                                  flex: 3,
                                  child: Text(
                                    item.name.isEmpty ? item.id : item.name,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: TextFormField(
                                    initialValue: item.qty.toString(),
                                    keyboardType: TextInputType.number,
                                    decoration: const InputDecoration(
                                      labelText: 'Qty',
                                      border: OutlineInputBorder(),
                                      isDense: true,
                                    ),
                                    onChanged: (value) {
                                      setLocalState(() {
                                        item.qty =
                                            int.tryParse(value.trim()) ?? 0;
                                        if (item.qty < 0) item.qty = 0;
                                        recomputeTotal();
                                      });
                                    },
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Expanded(
                                  flex: 2,
                                  child: TextFormField(
                                    initialValue: item.price.toStringAsFixed(2),
                                    keyboardType:
                                        const TextInputType.numberWithOptions(
                                          decimal: true,
                                        ),
                                    decoration: const InputDecoration(
                                      labelText: 'Price',
                                      border: OutlineInputBorder(),
                                      isDense: true,
                                    ),
                                    onChanged: (value) {
                                      setLocalState(() {
                                        item.price =
                                            double.tryParse(value.trim()) ?? 0;
                                        if (item.price < 0) item.price = 0;
                                        recomputeTotal();
                                      });
                                    },
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                        const SizedBox(height: 10),
                        TextFormField(
                          controller: totalCostController,
                          readOnly: true,
                          decoration: const InputDecoration(
                            labelText: 'Recalculated Total Cost (PHP)',
                            border: OutlineInputBorder(),
                          ),
                          validator: (value) {
                            final total = double.tryParse((value ?? '').trim());
                            if (total == null || total < 0)
                              return 'Invalid total cost';
                            return null;
                          },
                        ),
                        const SizedBox(height: 10),
                        TextFormField(
                          controller: expectedGuestsController,
                          keyboardType: TextInputType.number,
                          decoration: const InputDecoration(
                            labelText: 'Expected Guests',
                            border: OutlineInputBorder(),
                          ),
                          validator: (value) {
                            final parsed = int.tryParse((value ?? '').trim());
                            if (parsed == null || parsed < 1)
                              return 'Must be at least 1';
                            return null;
                          },
                        ),
                        const SizedBox(height: 10),
                        TextFormField(
                          controller: medicalRoomDetailsController,
                          decoration: const InputDecoration(
                            labelText: 'Medical Room Details (if needed)',
                            border: OutlineInputBorder(),
                          ),
                        ),
                        const SizedBox(height: 10),
                        TextFormField(
                          controller: eventDescriptionController,
                          minLines: 2,
                          maxLines: 3,
                          decoration: const InputDecoration(
                            labelText: 'Event Description',
                            border: OutlineInputBorder(),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.of(dialogContext).pop(),
                  child: const Text('Cancel'),
                ),
                FilledButton(
                  onPressed: () {
                    if (!formKey.currentState!.validate()) return;
                    final eventDate = eventDateController.text.trim();
                    final eventEndDate = eventEndDateController.text.trim();
                    final startTime = startTimeController.text.trim();
                    final endTime = endTimeController.text.trim();
                    final start = DateTime.tryParse('$eventDate $startTime:00');
                    final end = DateTime.tryParse('$eventEndDate $endTime:00');
                    if (start == null || end == null || !end.isAfter(start)) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text(
                            'End date/time must be after start date/time.',
                          ),
                        ),
                      );
                      return;
                    }
                    final guests = int.parse(
                      expectedGuestsController.text.trim(),
                    );
                    if (selectedFacility != null &&
                        guests > selectedFacility!.capacity) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text(
                            'Expected guests exceeds facility capacity (${selectedFacility!.capacity}).',
                          ),
                        ),
                      );
                      return;
                    }
                    if (selectedFacility != null) {
                      final fac = selectedFacility!;
                      if (!fac.allowsMultiDay && eventDate != eventEndDate) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text(
                              'This facility does not allow multi-day reservation.',
                            ),
                          ),
                        );
                        return;
                      }
                      final startMin = _timeToMinutes(startTime);
                      final endMin = _timeToMinutes(endTime);
                      if (!fac.allowsOvernight &&
                          startMin != null &&
                          endMin != null &&
                          endMin <= startMin) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text(
                              'This facility does not allow overnight use.',
                            ),
                          ),
                        );
                        return;
                      }
                      if (fac.maxDurationHours != null) {
                        final hours = end.difference(start).inMinutes / 60.0;
                        if (hours > fac.maxDurationHours!) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text(
                                'Exceeds max duration (${fac.maxDurationHours}h).',
                              ),
                            ),
                          );
                          return;
                        }
                      }
                      if (fac.openingTime.isNotEmpty &&
                          fac.closingTime.isNotEmpty) {
                        final openMin = _timeToMinutes(fac.openingTime);
                        final closeMin = _timeToMinutes(fac.closingTime);
                        if (startMin == null ||
                            endMin == null ||
                            openMin == null ||
                            closeMin == null) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content: Text('Invalid operating hours setup.'),
                            ),
                          );
                          return;
                        }
                        final within =
                            startMin >= openMin &&
                            startMin <= closeMin &&
                            endMin >= openMin &&
                            endMin <= closeMin;
                        if (!within) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content: Text(
                                'Reservation must be within facility operating hours.',
                              ),
                            ),
                          );
                          return;
                        }
                      }
                      final hasConflict = widget.reservations.any((other) {
                        if (other.id == reservation.id) return false;
                        if (other.facilityId != fac.id) return false;
                        final status = other.status.toLowerCase();
                        if (status != 'pending' && status != 'approved')
                          return false;
                        final oStart = DateTime.tryParse(
                          '${other.eventDate} ${other.startTime}:00',
                        );
                        final oEnd = DateTime.tryParse(
                          '${other.eventEndDate} ${other.endTime}:00',
                        );
                        if (oStart == null || oEnd == null) return false;
                        final noOverlap =
                            end.isAtSameMomentAs(oStart) ||
                            end.isBefore(oStart) ||
                            start.isAtSameMomentAs(oEnd) ||
                            start.isAfter(oEnd);
                        return !noOverlap;
                      });
                      if (hasConflict) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text(
                              'Schedule conflicts with another reservation.',
                            ),
                          ),
                        );
                        return;
                      }
                    }
                    Navigator.of(dialogContext).pop(<String, Object?>{
                      'username': usernameController.text.trim(),
                      'facilityId': selectedFacility?.id,
                      'eventType': eventType.trim(),
                      'eventDate': eventDate,
                      'eventEndDate': eventEndDate,
                      'startTime': startTime,
                      'endTime': endTime,
                      'clientEmail': emailController.text.trim(),
                      'contactPerson': contactPersonController.text.trim(),
                      'contactPhone': contactPhoneController.text.trim(),
                      'paymentOption': paymentOption,
                      'downPaymentAmount': paymentOption == 'down_payment'
                          ? (double.tryParse(
                                  downPaymentController.text.trim(),
                                ) ??
                                0)
                          : 0,
                      'addOns': editableAddOns
                          .where((item) => item.qty > 0)
                          .map(
                            (item) => <String, Object?>{
                              'id': item.id,
                              'name': item.name,
                              'unit': item.unit,
                              'qty': item.qty,
                              'price': item.price,
                              'total': item.total,
                            },
                          )
                          .toList(),
                      'addOnTotal': editableAddOns.fold<double>(
                        0,
                        (sum, item) => sum + item.total,
                      ),
                      'totalCost':
                          double.tryParse(totalCostController.text.trim()) ??
                          reservation.totalCost,
                      'expectedGuests': guests,
                      'medicalRoomDetails': medicalRoomDetailsController.text
                          .trim(),
                      'eventDescription': eventDescriptionController.text
                          .trim(),
                    });
                  },
                  child: const Text('Save'),
                ),
              ],
            );
          },
        );
      },
    );
  }

  Future<void> _confirmAndRun({
    required String message,
    required int reservationId,
    required Future<void> Function() task,
  }) async {
    final ok =
        await showDialog<bool>(
          context: context,
          builder: (dialogContext) => AlertDialog(
            title: const Text('Confirm Action'),
            content: Text(message),
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
    await _runUpdate(task, reservationId);
  }

  Future<void> _showReviewDialog(BuildContext context, Reservation r) async {
    final facilityName = r.facilityId == null
        ? 'Unknown Facility'
        : (widget.facilityNamesById[r.facilityId!] ??
              'Facility #${r.facilityId}');
    final status = r.status.toLowerCase();
    final addOnSubtotal = r.computedAddOnTotal;
    final remainingBalance = (r.totalCost - r.amountPaid)
        .clamp(0, double.infinity)
        .toDouble();
    final addOnLines = r.addOns.where((e) => e.qty > 0).map((e) {
      final label = e.name.isEmpty ? e.id : e.name;
      return '$label ${e.qty} x PHP ${e.price.toStringAsFixed(2)}';
    }).toList();
    await showDialog<void>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: Text('Review Reservation #${r.id}'),
        content: SizedBox(
          width: 520,
          child: SingleChildScrollView(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Facility: $facilityName'),
                Text('Client: ${r.username}'),
                Text('Email: ${r.clientEmail.isEmpty ? '-' : r.clientEmail}'),
                Text(
                  'Contact: ${r.contactPerson.isEmpty ? '-' : r.contactPerson} | ${r.contactPhone.isEmpty ? '-' : r.contactPhone}',
                ),
                Text('Status: ${r.status}'),
                Text('Submitted: ${r.createdAt.isEmpty ? '-' : r.createdAt}'),
                const SizedBox(height: 8),
                Text(
                  'Schedule: ${r.eventDate} ${r.startTime} - ${r.eventEndDate} ${r.endTime}',
                ),
                Text('Event Type: ${r.eventType.isEmpty ? '-' : r.eventType}'),
                Text('Expected Guests: ${r.expectedGuests}'),
                if (r.medicalRoomDetails.isNotEmpty)
                  Text('Medical Room Details: ${r.medicalRoomDetails}'),
                const SizedBox(height: 8),
                Text('Payment Option: ${r.paymentOption}'),
                Text('Payment Status: ${r.paymentStatus}'),
                Text('Amount Paid: PHP ${r.amountPaid.toStringAsFixed(2)}'),
                Text('Total Cost: PHP ${r.totalCost.toStringAsFixed(2)}'),
                Text(
                  'Add-on Subtotal: PHP ${addOnSubtotal.toStringAsFixed(2)}',
                ),
                Text(
                  'Remaining Balance: PHP ${remainingBalance.toStringAsFixed(2)}',
                ),
                Text(
                  'Add-ons: ${addOnLines.isEmpty ? 'None' : addOnLines.join(', ')}',
                ),
                if (r.eventDescription.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  const Text(
                    'Event Description:',
                    style: TextStyle(fontWeight: FontWeight.w700),
                  ),
                  Text(r.eventDescription),
                ],
                if (r.rejectionReason.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  Text(
                    'Rejection Reason: ${r.rejectionReason}',
                    style: const TextStyle(color: Colors.redAccent),
                  ),
                ],
              ],
            ),
          ),
        ),
        actions: [
          if (status != 'completed' && status != 'cancelled')
            TextButton(
              onPressed: () async {
                Navigator.of(dialogContext).pop();
                await _editDetails(context, r);
              },
              child: const Text('Edit'),
            ),
          if (status == 'pending')
            FilledButton(
              onPressed: () async {
                Navigator.of(dialogContext).pop();
                await _confirmAndRun(
                  message: 'Approve reservation #${r.id}?',
                  reservationId: r.id,
                  task: () => widget.onUpdateStatus(r, 'approved'),
                );
              },
              child: const Text('Approve'),
            ),
          if (status == 'pending')
            TextButton(
              onPressed: () async {
                Navigator.of(dialogContext).pop();
                await _rejectWithReason(context, r);
              },
              child: const Text('Reject'),
            ),
          if (status == 'approved' && !r.isFullyPaid)
            TextButton(
              onPressed: () async {
                Navigator.of(dialogContext).pop();
                await _confirmAndRun(
                  message:
                      'Record full remaining payment for reservation #${r.id}?',
                  reservationId: r.id,
                  task: () => widget.onRecordFullPayment(r),
                );
              },
              child: const Text('Record Payment'),
            ),
          if (status == 'approved' && r.isFullyPaid)
            TextButton(
              onPressed: () async {
                Navigator.of(dialogContext).pop();
                await _confirmAndRun(
                  message: 'Mark reservation #${r.id} as completed?',
                  reservationId: r.id,
                  task: () => widget.onUpdateStatus(r, 'completed'),
                );
              },
              child: const Text('Complete'),
            ),
          if (status == 'rejected')
            TextButton(
              onPressed: () async {
                Navigator.of(dialogContext).pop();
                await _confirmAndRun(
                  message: 'Set reservation #${r.id} back to pending?',
                  reservationId: r.id,
                  task: () => widget.onUpdateStatus(r, 'pending'),
                );
              },
              child: const Text('Mark Pending'),
            ),
          if (status == 'pending' ||
              status == 'approved' ||
              status == 'rejected')
            TextButton(
              onPressed: () async {
                Navigator.of(dialogContext).pop();
                await _confirmAndRun(
                  message: 'Cancel reservation #${r.id}?',
                  reservationId: r.id,
                  task: () => widget.onUpdateStatus(r, 'cancelled'),
                );
              },
              child: const Text('Cancel Reservation'),
            ),
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(),
            child: const Text('Close'),
          ),
        ],
      ),
    );
  }

  List<_EditAddOnDraft> _buildEditableAddOns({
    required Facility? selectedFacility,
    required Reservation reservation,
  }) {
    if (selectedFacility == null) return <_EditAddOnDraft>[];
    final byId = <String, ReservationAddOn>{};
    for (final addOn in reservation.addOns) {
      byId[addOn.id] = addOn;
    }
    final drafts = <_EditAddOnDraft>[];
    for (final facilityAddOn in selectedFacility.addOns.where(
      (e) => e.enabled,
    )) {
      final existing = byId[facilityAddOn.id];
      drafts.add(
        _EditAddOnDraft(
          id: facilityAddOn.id,
          name: facilityAddOn.name,
          unit: facilityAddOn.unit,
          qty: existing?.qty ?? 0,
          price: existing?.price ?? facilityAddOn.price,
        ),
      );
    }
    return drafts;
  }
}

class _StatusChip extends StatelessWidget {
  const _StatusChip({required this.status});

  final String status;

  @override
  Widget build(BuildContext context) {
    final s = status.toLowerCase();
    Color bg;
    Color fg;
    if (s == 'approved' || s == 'completed') {
      bg = Colors.green.shade100;
      fg = Colors.green.shade900;
    } else if (s == 'pending') {
      bg = Colors.orange.shade100;
      fg = Colors.orange.shade900;
    } else if (s == 'rejected' || s == 'cancelled') {
      bg = Colors.red.shade100;
      fg = Colors.red.shade900;
    } else {
      bg = Colors.grey.shade200;
      fg = Colors.grey.shade800;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        status,
        style: TextStyle(color: fg, fontWeight: FontWeight.w600),
      ),
    );
  }
}

class _EditAddOnDraft {
  _EditAddOnDraft({
    required this.id,
    required this.name,
    required this.unit,
    required this.qty,
    required this.price,
  });

  final String id;
  final String name;
  final String unit;
  int qty;
  double price;

  double get total => qty * price;
}
