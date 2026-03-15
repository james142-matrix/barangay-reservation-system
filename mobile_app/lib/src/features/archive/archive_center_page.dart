import 'package:flutter/material.dart';

import '../facilities/facility.dart';
import '../reservations/reservation.dart';
import 'archived_user.dart';

typedef RestoreUserFn = Future<void> Function(ArchivedUser user);
typedef RestoreFacilityFn = Future<void> Function(Facility facility);
typedef RestoreReservationFn = Future<void> Function(Reservation reservation);

class ArchiveCenterPage extends StatefulWidget {
  const ArchiveCenterPage({
    super.key,
    required this.users,
    required this.facilities,
    required this.reservations,
    required this.onRestoreUser,
    required this.onRestoreFacility,
    required this.onRestoreReservation,
  });

  final List<ArchivedUser> users;
  final List<Facility> facilities;
  final List<Reservation> reservations;
  final RestoreUserFn onRestoreUser;
  final RestoreFacilityFn onRestoreFacility;
  final RestoreReservationFn onRestoreReservation;

  @override
  State<ArchiveCenterPage> createState() => _ArchiveCenterPageState();
}

class _ArchiveCenterPageState extends State<ArchiveCenterPage> {
  int _tab = 0;
  final Set<String> _busy = <String>{};
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
    final usersCount = widget.users.length;
    final facilitiesCount = widget.facilities.length;
    final reservationsCount = widget.reservations.length;
    return Scaffold(
      appBar: AppBar(title: const Text('Archive Center')),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 12, 12, 0),
            child: Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                _countChip('Users', usersCount),
                _countChip('Facilities', facilitiesCount),
                _countChip('Reservations', reservationsCount),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(12),
            child: SegmentedButton<int>(
              segments: const [
                ButtonSegment(value: 0, label: Text('Users')),
                ButtonSegment(value: 1, label: Text('Facilities')),
                ButtonSegment(value: 2, label: Text('Reservations')),
              ],
              selected: {_tab},
              onSelectionChanged: (selected) {
                setState(() {
                  _tab = selected.first;
                  _page = 1;
                });
              },
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 0, 12, 8),
            child: TextField(
              controller: _searchController,
              decoration: InputDecoration(
                labelText: _tab == 0
                    ? 'Search archived users'
                    : _tab == 1
                    ? 'Search archived facilities'
                    : 'Search archived reservations',
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
          ),
          Expanded(child: _buildBody()),
        ],
      ),
    );
  }

  Widget _buildBody() {
    final query = _searchController.text.trim().toLowerCase();
    if (_tab == 0) {
      final filtered = widget.users.where((u) {
        if (query.isEmpty) return true;
        return u.username.toLowerCase().contains(query) ||
            u.fullname.toLowerCase().contains(query) ||
            u.email.toLowerCase().contains(query) ||
            u.id.toString().contains(query);
      }).toList();
      if (filtered.isEmpty)
        return const Center(child: Text('No archived users.'));
      final pageData = _paged(filtered.length, filtered);
      return ListView.builder(
        padding: const EdgeInsets.all(12),
        itemCount: pageData.length + 1,
        itemBuilder: (context, i) {
          if (i == pageData.length) return _pagerCard(filtered.length);
          final u = pageData[i];
          final key = 'u_${u.id}';
          final busy = _busy.contains(key);
          return Card(
            child: ListTile(
              title: Text('${u.fullname} (${u.username})'),
              subtitle: Text('${u.role} | ${u.email}'),
              trailing: FilledButton(
                onPressed: busy ? null : () => _restoreUserWithConfirm(u, key),
                child: Text(busy ? '...' : 'Restore'),
              ),
            ),
          );
        },
      );
    }
    if (_tab == 1) {
      final filtered = widget.facilities.where((f) {
        if (query.isEmpty) return true;
        return f.name.toLowerCase().contains(query) ||
            f.id.toString().contains(query);
      }).toList();
      if (filtered.isEmpty)
        return const Center(child: Text('No archived facilities.'));
      final pageData = _paged(filtered.length, filtered);
      return ListView.builder(
        padding: const EdgeInsets.all(12),
        itemCount: pageData.length + 1,
        itemBuilder: (context, i) {
          if (i == pageData.length) return _pagerCard(filtered.length);
          final f = pageData[i];
          final key = 'f_${f.id}';
          final busy = _busy.contains(key);
          return Card(
            child: ListTile(
              title: Text(f.name),
              subtitle: Text(
                'Capacity: ${f.capacity} | PHP ${f.price.toStringAsFixed(2)}',
              ),
              trailing: FilledButton(
                onPressed: busy
                    ? null
                    : () => _restoreFacilityWithConfirm(f, key),
                child: Text(busy ? '...' : 'Restore'),
              ),
            ),
          );
        },
      );
    }
    final filtered = widget.reservations.where((r) {
      if (query.isEmpty) return true;
      return r.username.toLowerCase().contains(query) ||
          r.status.toLowerCase().contains(query) ||
          r.id.toString().contains(query);
    }).toList();
    if (filtered.isEmpty)
      return const Center(child: Text('No archived reservations.'));
    final pageData = _paged(filtered.length, filtered);
    return ListView.builder(
      padding: const EdgeInsets.all(12),
      itemCount: pageData.length + 1,
      itemBuilder: (context, i) {
        if (i == pageData.length) return _pagerCard(filtered.length);
        final r = pageData[i];
        final key = 'r_${r.id}';
        final busy = _busy.contains(key);
        return Card(
          child: ListTile(
            title: Text('Reservation #${r.id} (${r.username})'),
            subtitle: Text(
              '${r.eventDate} ${r.startTime} - ${r.eventEndDate} ${r.endTime}',
            ),
            trailing: FilledButton(
              onPressed: busy
                  ? null
                  : () => _restoreReservationWithConfirm(r, key),
              child: Text(busy ? '...' : 'Restore'),
            ),
          ),
        );
      },
    );
  }

  Widget _countChip(String label, int count) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: Colors.blueGrey.shade50,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        '$label: $count',
        style: const TextStyle(fontWeight: FontWeight.w600),
      ),
    );
  }

  List<T> _paged<T>(int totalItems, List<T> data) {
    final totalPages = totalItems == 0
        ? 1
        : ((totalItems - 1) ~/ _pageSize) + 1;
    if (_page > totalPages) _page = totalPages;
    final start = (_page - 1) * _pageSize;
    final end = (start + _pageSize).clamp(0, totalItems);
    return data.sublist(start.clamp(0, totalItems), end);
  }

  Widget _pagerCard(int totalItems) {
    final totalPages = totalItems == 0
        ? 1
        : ((totalItems - 1) ~/ _pageSize) + 1;
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

  Future<void> _restoreUserWithConfirm(ArchivedUser user, String key) async {
    final ok = await _confirm('Restore user "${user.username}"?');
    if (!ok) return;
    await _restoreUser(user, key);
  }

  Future<void> _restoreFacilityWithConfirm(
    Facility facility,
    String key,
  ) async {
    final ok = await _confirm('Restore facility "${facility.name}"?');
    if (!ok) return;
    await _restoreFacility(facility, key);
  }

  Future<void> _restoreReservationWithConfirm(
    Reservation reservation,
    String key,
  ) async {
    final ok = await _confirm('Restore reservation #${reservation.id}?');
    if (!ok) return;
    await _restoreReservation(reservation, key);
  }

  Future<bool> _confirm(String message) async {
    final result = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Confirm Restore'),
        content: Text(message),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(dialogContext).pop(true),
            child: const Text('Restore'),
          ),
        ],
      ),
    );
    return result ?? false;
  }

  Future<void> _restoreUser(ArchivedUser user, String key) async {
    setState(() => _busy.add(key));
    try {
      await widget.onRestoreUser(user);
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('User restored.')));
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(e.toString())));
    } finally {
      if (mounted) setState(() => _busy.remove(key));
    }
  }

  Future<void> _restoreFacility(Facility facility, String key) async {
    setState(() => _busy.add(key));
    try {
      await widget.onRestoreFacility(facility);
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Facility restored.')));
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(e.toString())));
    } finally {
      if (mounted) setState(() => _busy.remove(key));
    }
  }

  Future<void> _restoreReservation(Reservation reservation, String key) async {
    setState(() => _busy.add(key));
    try {
      await widget.onRestoreReservation(reservation);
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Reservation restored.')));
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(e.toString())));
    } finally {
      if (mounted) setState(() => _busy.remove(key));
    }
  }
}
