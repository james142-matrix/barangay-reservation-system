import 'package:flutter/material.dart';

import '../../core/ui_error.dart';
import '../reservations/reservation.dart';
import 'facility.dart';

typedef CreateFacilityFn = Future<void> Function(Map<String, Object?> payload);
typedef UpdateFacilityFn =
    Future<void> Function(Facility facility, Map<String, Object?> payload);
typedef ArchiveFacilityFn = Future<void> Function(Facility facility);

class FacilitiesPage extends StatefulWidget {
  const FacilitiesPage({
    super.key,
    required this.facilities,
    required this.reservations,
    required this.canManage,
    required this.onCreateFacility,
    required this.onUpdateFacility,
    required this.onArchiveFacility,
  });

  final List<Facility> facilities;
  final List<Reservation> reservations;
  final bool canManage;
  final CreateFacilityFn onCreateFacility;
  final UpdateFacilityFn onUpdateFacility;
  final ArchiveFacilityFn onArchiveFacility;

  @override
  State<FacilitiesPage> createState() => _FacilitiesPageState();
}

class _FacilitiesPageState extends State<FacilitiesPage> {
  final Set<int> _busyIds = <int>{};
  bool _creating = false;
  final TextEditingController _searchController = TextEditingController();
  String _statusFilter = 'all';
  int _page = 1;
  int _pageSize = 10;

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final reservationStatsByFacility = <int, _FacilityReservationStats>{};
    for (final r in widget.reservations) {
      final fid = r.facilityId;
      if (fid == null) continue;
      final stats = reservationStatsByFacility.putIfAbsent(
        fid,
        _FacilityReservationStats.new,
      );
      final status = r.status.toLowerCase();
      if (status == 'approved') stats.approved++;
      if (status == 'pending') stats.pending++;
      if (status == 'completed') stats.completed++;
    }
    final query = _searchController.text.trim().toLowerCase();
    final filtered = widget.facilities.where((f) {
      if (_statusFilter != 'all' && f.status.toLowerCase() != _statusFilter)
        return false;
      if (query.isEmpty) return true;
      return f.name.toLowerCase().contains(query) ||
          f.description.toLowerCase().contains(query) ||
          f.id.toString().contains(query);
    }).toList();
    final totalPages = filtered.isEmpty
        ? 1
        : ((filtered.length - 1) ~/ _pageSize) + 1;
    if (_page > totalPages) _page = totalPages;
    final start = (_page - 1) * _pageSize;
    final end = (start + _pageSize).clamp(0, filtered.length);
    final pageData = filtered.sublist(start.clamp(0, filtered.length), end);

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        _buildHeader(),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: Text(
                'Facilities',
                style: Theme.of(context).textTheme.titleLarge,
              ),
            ),
            if (widget.canManage)
              FilledButton.icon(
                onPressed: _creating ? null : _createFacility,
                icon: const Icon(Icons.add),
                label: Text(_creating ? 'Creating...' : 'Add Facility'),
              ),
          ],
        ),
        const SizedBox(height: 12),
        _buildStatsCards(widget.facilities),
        const SizedBox(height: 12),
        TextField(
          controller: _searchController,
          decoration: InputDecoration(
            labelText: 'Search facilities',
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
        const SizedBox(height: 8),
        DropdownButtonFormField<String>(
          key: ValueKey('fac_filter_$_statusFilter'),
          initialValue: _statusFilter,
          decoration: const InputDecoration(
            labelText: 'Status Filter',
            border: OutlineInputBorder(),
          ),
          items: const [
            DropdownMenuItem(value: 'all', child: Text('All')),
            DropdownMenuItem(value: 'available', child: Text('available')),
            DropdownMenuItem(value: 'unavailable', child: Text('unavailable')),
          ],
          onChanged: (value) {
            setState(() {
              _statusFilter = value ?? 'all';
              _page = 1;
            });
          },
        ),
        const SizedBox(height: 12),
        if (filtered.isEmpty)
          const Card(
            child: Padding(
              padding: EdgeInsets.all(16),
              child: Text('No facilities found.'),
            ),
          ),
        ...pageData.map((f) {
          final busy = _busyIds.contains(f.id);
          final stats =
              reservationStatsByFacility[f.id] ?? _FacilityReservationStats();
          return Card(
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          f.name,
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                      _facilityStatusChip(f.status),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text('Capacity: ${f.capacity}'),
                  Text('Price per hour: PHP ${f.price.toStringAsFixed(2)}'),
                  if (f.description.isNotEmpty)
                    Text('Description: ${f.description}'),
                  if (f.eventTypes.isNotEmpty)
                    Text('Event Types: ${f.eventTypes.join(', ')}'),
                  if (f.addOns.isNotEmpty)
                    Text(
                      'Add-ons: ${f.addOns.where((a) => a.enabled).map((a) => a.name).join(', ')}',
                    ),
                  if (f.openingTime.isNotEmpty && f.closingTime.isNotEmpty)
                    Text(
                      'Operating Hours: ${f.openingTime} - ${f.closingTime}',
                    ),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      _miniStat('Approved', stats.approved),
                      _miniStat('Pending', stats.pending),
                      _miniStat('Completed', stats.completed),
                      _miniStat(
                        'Total',
                        stats.approved + stats.pending + stats.completed,
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      OutlinedButton.icon(
                        onPressed: () => _showFacilityDetails(f, stats),
                        icon: const Icon(Icons.visibility_outlined),
                        label: const Text('View Details'),
                      ),
                      if (widget.canManage) ...[
                        OutlinedButton.icon(
                          onPressed: busy ? null : () => _editFacility(f),
                          icon: const Icon(Icons.edit),
                          label: const Text('Edit'),
                        ),
                        OutlinedButton.icon(
                          onPressed: busy ? null : () => _archiveFacility(f),
                          icon: const Icon(Icons.archive_outlined),
                          label: const Text('Archive'),
                        ),
                      ],
                    ],
                  ),
                ],
              ),
            ),
          );
        }),
        if (filtered.isNotEmpty) ...[
          const SizedBox(height: 10),
          _buildPager(totalPages, filtered.length),
        ],
      ],
    );
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
            child: const Icon(Icons.apartment, color: Color(0xFFC2185B)),
          ),
          const SizedBox(width: 12),
          const Expanded(
            child: Text(
              'Facilities Overview',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatsCards(List<Facility> facilities) {
    int available = 0;
    int unavailable = 0;
    for (final f in facilities) {
      if (f.status.toLowerCase() == 'available') {
        available++;
      } else {
        unavailable++;
      }
    }
    return Wrap(
      spacing: 10,
      runSpacing: 10,
      children: [
        _statCard('Total Facilities', '${facilities.length}'),
        _statCard('Available', '$available'),
        _statCard('Unavailable', '$unavailable'),
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

  Widget _miniStat(String label, int value) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: Colors.grey.shade100,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text('$label: $value', style: const TextStyle(fontSize: 12)),
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

  Widget _facilityStatusChip(String status) {
    final s = status.toLowerCase();
    final ok = s == 'available';
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: ok ? Colors.green.shade100 : Colors.orange.shade100,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        status,
        style: TextStyle(
          color: ok ? Colors.green.shade900 : Colors.orange.shade900,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }

  Future<void> _showFacilityDetails(
    Facility facility,
    _FacilityReservationStats stats,
  ) async {
    await showDialog<void>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: Text(facility.name),
        content: SizedBox(
          width: 460,
          child: SingleChildScrollView(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (facility.description.isNotEmpty) Text(facility.description),
                const SizedBox(height: 10),
                Text('Capacity: ${facility.capacity}'),
                Text('Price: PHP ${facility.price.toStringAsFixed(2)}'),
                Text('Status: ${facility.status}'),
                if (facility.openingTime.isNotEmpty &&
                    facility.closingTime.isNotEmpty)
                  Text(
                    'Hours: ${facility.openingTime} - ${facility.closingTime}',
                  ),
                Text(
                  'Overnight: ${facility.allowsOvernight ? 'Allowed' : 'Not allowed'}',
                ),
                Text(
                  'All-day: ${facility.allowsAllDay ? 'Allowed' : 'Not allowed'}',
                ),
                Text(
                  'Multi-day: ${facility.allowsMultiDay ? 'Allowed' : 'Not allowed'}',
                ),
                Text(
                  'Max Duration: ${facility.maxDurationHours == null ? 'none' : '${facility.maxDurationHours}h'}',
                ),
                const SizedBox(height: 10),
                Text(
                  'Event Types: ${facility.eventTypes.isEmpty ? 'General Event' : facility.eventTypes.join(', ')}',
                ),
                const SizedBox(height: 10),
                Text(
                  'Add-ons: ${facility.addOns.where((a) => a.enabled).isEmpty ? 'No Add-ons' : facility.addOns.where((a) => a.enabled).map((a) => '${a.name} (${a.unit})').join(', ')}',
                ),
                const SizedBox(height: 10),
                Text('Approved Reservations: ${stats.approved}'),
                Text('Pending Reservations: ${stats.pending}'),
                Text('Completed Reservations: ${stats.completed}'),
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

  Future<void> _createFacility() async {
    final form = await _showFacilityFormDialog();
    if (form == null) return;
    setState(() {
      _creating = true;
    });
    try {
      await widget.onCreateFacility(form);
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Facility created.')));
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(uiErrorMessage(e))));
    } finally {
      if (mounted) {
        setState(() {
          _creating = false;
        });
      }
    }
  }

  Future<void> _editFacility(Facility facility) async {
    final form = await _showFacilityFormDialog(seed: facility);
    if (form == null) return;
    setState(() {
      _busyIds.add(facility.id);
    });
    try {
      await widget.onUpdateFacility(facility, form);
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Facility updated.')));
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(uiErrorMessage(e))));
    } finally {
      if (mounted) {
        setState(() {
          _busyIds.remove(facility.id);
        });
      }
    }
  }

  Future<void> _archiveFacility(Facility facility) async {
    final ok =
        await showDialog<bool>(
          context: context,
          builder: (dialogContext) => AlertDialog(
            title: const Text('Archive Facility'),
            content: Text('Archive "${facility.name}"?'),
            actions: [
              TextButton(
                onPressed: () => Navigator.of(dialogContext).pop(false),
                child: const Text('Cancel'),
              ),
              FilledButton(
                onPressed: () => Navigator.of(dialogContext).pop(true),
                child: const Text('Archive'),
              ),
            ],
          ),
        ) ??
        false;
    if (!ok) return;
    setState(() {
      _busyIds.add(facility.id);
    });
    try {
      await widget.onArchiveFacility(facility);
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Facility archived.')));
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(uiErrorMessage(e))));
    } finally {
      if (mounted) {
        setState(() {
          _busyIds.remove(facility.id);
        });
      }
    }
  }

  Future<Map<String, Object?>?> _showFacilityFormDialog({
    Facility? seed,
  }) async {
    final formKey = GlobalKey<FormState>();
    final nameController = TextEditingController(text: seed?.name ?? '');
    final descriptionController = TextEditingController(
      text: seed?.description ?? '',
    );
    final capacityController = TextEditingController(
      text: (seed?.capacity ?? 0).toString(),
    );
    final priceController = TextEditingController(
      text: (seed?.price ?? 0).toStringAsFixed(2),
    );
    final openingController = TextEditingController(
      text: seed?.openingTime ?? '',
    );
    final closingController = TextEditingController(
      text: seed?.closingTime ?? '',
    );
    final maxDurationController = TextEditingController(
      text: seed?.maxDurationHours?.toString() ?? '',
    );
    final eventTypesController = TextEditingController(
      text: seed?.eventTypes.join(', ') ?? '',
    );
    final addOnsController = TextEditingController(
      text: (seed?.addOns ?? const <FacilityAddOn>[])
          .map((a) => '${a.name}:${a.price}:${a.unit}')
          .join('\n'),
    );

    String status = seed?.status.isNotEmpty == true
        ? seed!.status
        : 'available';
    bool allowsOvernight = seed?.allowsOvernight ?? false;
    bool allowsAllDay = seed?.allowsAllDay ?? false;
    bool allowsMultiDay = seed?.allowsMultiDay ?? false;

    return showDialog<Map<String, Object?>>(
      context: context,
      builder: (dialogContext) {
        return StatefulBuilder(
          builder: (context, setLocalState) {
            return AlertDialog(
              title: Text(seed == null ? 'Add Facility' : 'Edit Facility'),
              content: SizedBox(
                width: 430,
                child: Form(
                  key: formKey,
                  child: SingleChildScrollView(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        TextFormField(
                          controller: nameController,
                          decoration: const InputDecoration(
                            labelText: 'Name',
                            border: OutlineInputBorder(),
                          ),
                          validator: (v) =>
                              (v ?? '').trim().isEmpty ? 'Required' : null,
                        ),
                        const SizedBox(height: 10),
                        TextFormField(
                          controller: descriptionController,
                          minLines: 2,
                          maxLines: 3,
                          decoration: const InputDecoration(
                            labelText: 'Description',
                            border: OutlineInputBorder(),
                          ),
                        ),
                        const SizedBox(height: 10),
                        TextFormField(
                          controller: capacityController,
                          keyboardType: TextInputType.number,
                          decoration: const InputDecoration(
                            labelText: 'Capacity',
                            border: OutlineInputBorder(),
                          ),
                          validator: (v) =>
                              (int.tryParse((v ?? '').trim()) ?? -1) < 0
                              ? 'Invalid'
                              : null,
                        ),
                        const SizedBox(height: 10),
                        TextFormField(
                          controller: priceController,
                          keyboardType: const TextInputType.numberWithOptions(
                            decimal: true,
                          ),
                          decoration: const InputDecoration(
                            labelText: 'Price per hour',
                            border: OutlineInputBorder(),
                          ),
                          validator: (v) =>
                              (double.tryParse((v ?? '').trim()) ?? -1) < 0
                              ? 'Invalid'
                              : null,
                        ),
                        const SizedBox(height: 10),
                        DropdownButtonFormField<String>(
                          key: ValueKey('facility_status_$status'),
                          initialValue: status,
                          decoration: const InputDecoration(
                            labelText: 'Status',
                            border: OutlineInputBorder(),
                          ),
                          items: const [
                            DropdownMenuItem(
                              value: 'available',
                              child: Text('available'),
                            ),
                            DropdownMenuItem(
                              value: 'unavailable',
                              child: Text('unavailable'),
                            ),
                          ],
                          onChanged: (value) {
                            setLocalState(() {
                              status = value ?? 'available';
                            });
                          },
                        ),
                        const SizedBox(height: 10),
                        TextFormField(
                          controller: eventTypesController,
                          decoration: const InputDecoration(
                            labelText: 'Event Types (comma separated)',
                            border: OutlineInputBorder(),
                          ),
                        ),
                        const SizedBox(height: 10),
                        TextFormField(
                          controller: openingController,
                          decoration: const InputDecoration(
                            labelText: 'Opening Time (HH:mm, optional)',
                            border: OutlineInputBorder(),
                          ),
                        ),
                        const SizedBox(height: 10),
                        TextFormField(
                          controller: closingController,
                          decoration: const InputDecoration(
                            labelText: 'Closing Time (HH:mm, optional)',
                            border: OutlineInputBorder(),
                          ),
                        ),
                        const SizedBox(height: 10),
                        TextFormField(
                          controller: maxDurationController,
                          keyboardType: TextInputType.number,
                          decoration: const InputDecoration(
                            labelText: 'Max Duration Hours (optional)',
                            border: OutlineInputBorder(),
                          ),
                        ),
                        const SizedBox(height: 10),
                        TextFormField(
                          controller: addOnsController,
                          minLines: 3,
                          maxLines: 5,
                          decoration: const InputDecoration(
                            labelText:
                                'Add-ons (one per line: name:price:unit)',
                            border: OutlineInputBorder(),
                          ),
                        ),
                        SwitchListTile(
                          value: allowsOvernight,
                          onChanged: (v) =>
                              setLocalState(() => allowsOvernight = v),
                          title: const Text('Allows Overnight'),
                        ),
                        SwitchListTile(
                          value: allowsAllDay,
                          onChanged: (v) =>
                              setLocalState(() => allowsAllDay = v),
                          title: const Text('Allows All Day'),
                        ),
                        SwitchListTile(
                          value: allowsMultiDay,
                          onChanged: (v) =>
                              setLocalState(() => allowsMultiDay = v),
                          title: const Text('Allows Multi Day'),
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
                    final eventTypes = eventTypesController.text
                        .split(',')
                        .map((e) => e.trim())
                        .where((e) => e.isNotEmpty)
                        .toList();
                    final addOns = _parseAddOns(addOnsController.text);
                    final maxDuration = int.tryParse(
                      maxDurationController.text.trim(),
                    );
                    Navigator.of(dialogContext).pop(<String, Object?>{
                      'name': nameController.text.trim(),
                      'description': descriptionController.text.trim(),
                      'capacity':
                          int.tryParse(capacityController.text.trim()) ?? 0,
                      'price':
                          double.tryParse(priceController.text.trim()) ?? 0,
                      'status': status,
                      'eventTypes': eventTypes,
                      'openingTime': openingController.text.trim(),
                      'closingTime': closingController.text.trim(),
                      'allowsOvernight': allowsOvernight,
                      'allowsAllDay': allowsAllDay,
                      'allowsMultiDay': allowsMultiDay,
                      'maxDurationHours': maxDuration,
                      'addOns': addOns,
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

  List<Map<String, Object?>> _parseAddOns(String raw) {
    final lines = raw
        .split('\n')
        .map((e) => e.trim())
        .where((e) => e.isNotEmpty)
        .toList();
    final out = <Map<String, Object?>>[];
    var idx = 1;
    for (final line in lines) {
      final parts = line.split(':').map((e) => e.trim()).toList();
      if (parts.length < 2) continue;
      final name = parts[0];
      final price = double.tryParse(parts[1]) ?? -1;
      final unit = parts.length >= 3 && parts[2].isNotEmpty ? parts[2] : 'item';
      if (name.isEmpty || price < 0) continue;
      out.add({
        'id': 'addon_$idx',
        'name': name,
        'price': price,
        'unit': unit,
        'enabled': true,
      });
      idx++;
    }
    return out;
  }
}

class _FacilityReservationStats {
  int approved = 0;
  int pending = 0;
  int completed = 0;
}
