import 'package:flutter/material.dart';

import '../facilities/facility.dart';
import '../reservations/reservation.dart';

class ReportsPage extends StatefulWidget {
  const ReportsPage({
    super.key,
    required this.reservations,
    required this.facilities,
  });

  final List<Reservation> reservations;
  final List<Facility> facilities;

  @override
  State<ReportsPage> createState() => _ReportsPageState();
}

class _ReportsPageState extends State<ReportsPage> {
  String _statusFilter = 'all';
  int _facilityFilter = 0;
  DateTime? _fromDate;
  DateTime? _toDate;

  @override
  Widget build(BuildContext context) {
    final filtered = _filteredReservations();
    final total = filtered.length;
    final approved = _countStatus(filtered, 'approved');
    final completed = _countStatus(filtered, 'completed');
    final pending = _countStatus(filtered, 'pending');
    final rejected = _countStatus(filtered, 'rejected');
    final cancelled = _countStatus(filtered, 'cancelled');
    final billed = filtered.fold<double>(0, (sum, e) => sum + e.totalCost);
    final paid = filtered.fold<double>(0, (sum, e) => sum + e.amountPaid);

    final facilityNameById = <int, String>{
      for (final f in widget.facilities) f.id: f.name,
    };
    final usage = <String, int>{};
    for (final r in filtered) {
      final name = r.facilityId == null
          ? 'Unknown'
          : (facilityNameById[r.facilityId!] ?? 'Facility #${r.facilityId}');
      usage[name] = (usage[name] ?? 0) + 1;
    }
    final sortedUsage = usage.entries.toList()
      ..sort((a, b) => b.value.compareTo(a.value));

    return Scaffold(
      appBar: AppBar(title: const Text('Reports')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _buildFilters(),
          const SizedBox(height: 12),
          Wrap(
            spacing: 10,
            runSpacing: 10,
            children: [
              _CardMetric(label: 'Total Reservations', value: '$total'),
              _CardMetric(label: 'Pending', value: '$pending'),
              _CardMetric(label: 'Approved', value: '$approved'),
              _CardMetric(label: 'Completed', value: '$completed'),
              _CardMetric(label: 'Rejected', value: '$rejected'),
              _CardMetric(label: 'Cancelled', value: '$cancelled'),
              _CardMetric(
                label: 'Total Billed',
                value: 'PHP ${billed.toStringAsFixed(2)}',
              ),
              _CardMetric(
                label: 'Total Paid',
                value: 'PHP ${paid.toStringAsFixed(2)}',
              ),
            ],
          ),
          const SizedBox(height: 10),
          Align(
            alignment: Alignment.centerLeft,
            child: OutlinedButton.icon(
              onPressed: () => _exportCsv(context, filtered),
              icon: const Icon(Icons.download_outlined),
              label: const Text('Export CSV (copyable)'),
            ),
          ),
          const SizedBox(height: 14),
          const Text(
            'Facility Usage',
            style: TextStyle(fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 8),
          if (sortedUsage.isEmpty)
            const Card(
              child: Padding(
                padding: EdgeInsets.all(12),
                child: Text('No data.'),
              ),
            ),
          ...sortedUsage.map(
            (e) => Card(
              child: ListTile(
                title: Text(e.key),
                trailing: Text('${e.value} bookings'),
              ),
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
            DropdownButtonFormField<String>(
              key: ValueKey('report_status_$_statusFilter'),
              initialValue: _statusFilter,
              decoration: const InputDecoration(
                labelText: 'Status',
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
              onChanged: (value) =>
                  setState(() => _statusFilter = value ?? 'all'),
            ),
            const SizedBox(height: 8),
            DropdownButtonFormField<int>(
              key: ValueKey('report_fac_$_facilityFilter'),
              initialValue: _facilityFilter,
              decoration: const InputDecoration(
                labelText: 'Facility',
                border: OutlineInputBorder(),
              ),
              items: [
                const DropdownMenuItem(value: 0, child: Text('All Facilities')),
                ...widget.facilities.map(
                  (f) => DropdownMenuItem(value: f.id, child: Text(f.name)),
                ),
              ],
              onChanged: (value) =>
                  setState(() => _facilityFilter = value ?? 0),
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: _pickFromDate,
                    icon: const Icon(Icons.calendar_month_outlined),
                    label: Text(
                      _fromDate == null ? 'From Date' : _fmtDate(_fromDate!),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: _pickToDate,
                    icon: const Icon(Icons.event_available_outlined),
                    label: Text(
                      _toDate == null ? 'To Date' : _fmtDate(_toDate!),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                IconButton(
                  tooltip: 'Clear dates',
                  onPressed: () => setState(() {
                    _fromDate = null;
                    _toDate = null;
                  }),
                  icon: const Icon(Icons.clear),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  List<Reservation> _filteredReservations() {
    return widget.reservations.where((r) {
      if (_statusFilter != 'all' && r.status.toLowerCase() != _statusFilter)
        return false;
      if (_facilityFilter != 0 && r.facilityId != _facilityFilter) return false;
      if (_fromDate != null || _toDate != null) {
        final dt = DateTime.tryParse(r.eventDate);
        if (dt == null) return false;
        if (_fromDate != null && dt.isBefore(_fromDate!)) return false;
        if (_toDate != null) {
          final toInclusive = DateTime(
            _toDate!.year,
            _toDate!.month,
            _toDate!.day,
            23,
            59,
            59,
          );
          if (dt.isAfter(toInclusive)) return false;
        }
      }
      return true;
    }).toList();
  }

  int _countStatus(List<Reservation> data, String status) {
    return data.where((e) => e.status.toLowerCase() == status).length;
  }

  Future<void> _pickFromDate() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      firstDate: DateTime(now.year - 5),
      lastDate: DateTime(now.year + 5),
      initialDate: _fromDate ?? now,
    );
    if (picked != null) setState(() => _fromDate = picked);
  }

  Future<void> _pickToDate() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      firstDate: DateTime(now.year - 5),
      lastDate: DateTime(now.year + 5),
      initialDate: _toDate ?? _fromDate ?? now,
    );
    if (picked != null) setState(() => _toDate = picked);
  }

  String _fmtDate(DateTime date) {
    final m = date.month.toString().padLeft(2, '0');
    final d = date.day.toString().padLeft(2, '0');
    return '${date.year}-$m-$d';
  }

  void _exportCsv(BuildContext context, List<Reservation> data) {
    final headers = [
      'id',
      'username',
      'facilityId',
      'eventDate',
      'eventEndDate',
      'startTime',
      'endTime',
      'eventType',
      'expectedGuests',
      'status',
      'paymentStatus',
      'amountPaid',
      'totalCost',
      'createdAt',
    ];
    final rows = data.map((r) {
      return [
        r.id.toString(),
        r.username,
        (r.facilityId ?? '').toString(),
        r.eventDate,
        r.eventEndDate,
        r.startTime,
        r.endTime,
        r.eventType,
        r.expectedGuests.toString(),
        r.status,
        r.paymentStatus,
        r.amountPaid.toStringAsFixed(2),
        r.totalCost.toStringAsFixed(2),
        r.createdAt,
      ];
    }).toList();
    final buffer = StringBuffer();
    buffer.writeln(headers.map(_csvEscape).join(','));
    for (final row in rows) {
      buffer.writeln(row.map(_csvEscape).join(','));
    }
    final csv = buffer.toString();
    showDialog<void>(
      context: context,
      builder: (dialogContext) {
        return AlertDialog(
          title: const Text('CSV Export'),
          content: SizedBox(width: 620, child: SelectableText(csv)),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(dialogContext).pop(),
              child: const Text('Close'),
            ),
          ],
        );
      },
    );
  }

  String _csvEscape(String value) {
    final normalized = value.replaceAll('\r', ' ').replaceAll('\n', ' ');
    final escaped = normalized.replaceAll('"', '""');
    return '"$escaped"';
  }
}

class _CardMetric extends StatelessWidget {
  const _CardMetric({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return ConstrainedBox(
      constraints: const BoxConstraints(minWidth: 150),
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label, style: const TextStyle(color: Colors.black54)),
              const SizedBox(height: 6),
              Text(value, style: const TextStyle(fontWeight: FontWeight.w700)),
            ],
          ),
        ),
      ),
    );
  }
}
