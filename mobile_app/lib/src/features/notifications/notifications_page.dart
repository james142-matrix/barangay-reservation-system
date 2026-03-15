import 'package:flutter/material.dart';

import '../../core/ui_error.dart';
import '../users/app_user.dart';
import 'notification_item.dart';

typedef MarkNotificationReadFn = Future<void> Function(NotificationItem item);
typedef CreateNotificationFn =
    Future<void> Function(Map<String, Object?> payload);

class NotificationsPage extends StatefulWidget {
  const NotificationsPage({
    super.key,
    required this.notifications,
    required this.onMarkRead,
    required this.onCreate,
    required this.users,
    required this.canCreate,
    required this.defaultUsername,
  });

  final List<NotificationItem> notifications;
  final MarkNotificationReadFn onMarkRead;
  final CreateNotificationFn onCreate;
  final List<AppUser> users;
  final bool canCreate;
  final String defaultUsername;

  @override
  State<NotificationsPage> createState() => _NotificationsPageState();
}

class _NotificationsPageState extends State<NotificationsPage> {
  final Set<int> _busy = <int>{};
  bool _creating = false;
  final TextEditingController _searchController = TextEditingController();
  String _readFilter = 'all';
  int _page = 1;
  int _pageSize = 10;

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final query = _searchController.text.trim().toLowerCase();
    final filtered =
        widget.notifications.where((n) {
          if (_readFilter == 'unread' && n.isRead) return false;
          if (_readFilter == 'read' && !n.isRead) return false;
          if (query.isEmpty) return true;
          return n.title.toLowerCase().contains(query) ||
              n.message.toLowerCase().contains(query) ||
              n.username.toLowerCase().contains(query) ||
              n.id.toString().contains(query);
        }).toList()..sort((a, b) {
          final aDate =
              DateTime.tryParse(a.createdAt) ??
              DateTime.fromMillisecondsSinceEpoch(0);
          final bDate =
              DateTime.tryParse(b.createdAt) ??
              DateTime.fromMillisecondsSinceEpoch(0);
          return bDate.compareTo(aDate);
        });
    final unreadCount = widget.notifications.where((n) => !n.isRead).length;
    final totalCount = widget.notifications.length;
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
        const SizedBox(height: 10),
        Row(
          children: [
            Expanded(
              child: Text(
                'Notifications',
                style: Theme.of(context).textTheme.titleLarge,
              ),
            ),
            if (widget.canCreate)
              FilledButton.icon(
                onPressed: _creating ? null : _createNotification,
                icon: const Icon(Icons.add_alert_outlined),
                label: Text(_creating ? 'Creating...' : 'Create'),
              ),
          ],
        ),
        const SizedBox(height: 10),
        Wrap(
          spacing: 10,
          runSpacing: 10,
          children: [
            _statCard('Total', '$totalCount'),
            _statCard('Unread', '$unreadCount'),
          ],
        ),
        const SizedBox(height: 10),
        DropdownButtonFormField<String>(
          key: ValueKey('notif_read_filter_$_readFilter'),
          initialValue: _readFilter,
          decoration: const InputDecoration(
            labelText: 'Read Filter',
            border: OutlineInputBorder(),
          ),
          items: const [
            DropdownMenuItem(value: 'all', child: Text('All')),
            DropdownMenuItem(value: 'unread', child: Text('Unread')),
            DropdownMenuItem(value: 'read', child: Text('Read')),
          ],
          onChanged: (value) {
            setState(() {
              _readFilter = value ?? 'all';
              _page = 1;
            });
          },
        ),
        const SizedBox(height: 10),
        if (unreadCount > 0)
          Align(
            alignment: Alignment.centerLeft,
            child: OutlinedButton.icon(
              onPressed: _markAllRead,
              icon: const Icon(Icons.done_all),
              label: const Text('Mark All Read'),
            ),
          ),
        const SizedBox(height: 10),
        TextField(
          controller: _searchController,
          decoration: InputDecoration(
            labelText: 'Search notifications',
            border: const OutlineInputBorder(),
            suffixIcon: IconButton(
              onPressed: () {
                _searchController.clear();
                setState(() {
                  _page = 1;
                });
              },
              icon: const Icon(Icons.clear),
            ),
          ),
          onChanged: (_) => setState(() => _page = 1),
        ),
        const SizedBox(height: 10),
        if (filtered.isEmpty)
          const Card(
            child: Padding(
              padding: EdgeInsets.all(12),
              child: Text('No notifications.'),
            ),
          ),
        ...pageData.map((n) {
          final busy = _busy.contains(n.id);
          return Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Card(
              color: n.isRead ? null : const Color(0xFFFFF1F7),
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            n.title,
                            style: const TextStyle(fontWeight: FontWeight.w700),
                          ),
                        ),
                        if (!n.isRead)
                          const Padding(
                            padding: EdgeInsets.only(right: 8),
                            child: Icon(
                              Icons.brightness_1,
                              size: 10,
                              color: Color(0xFFE83E8C),
                            ),
                          ),
                        if (!n.isRead)
                          OutlinedButton(
                            onPressed: busy ? null : () => _markRead(n),
                            child: Text(busy ? '...' : 'Mark Read'),
                          ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Text(n.message),
                    Text('To: ${n.username}'),
                    if (n.reservationId != null)
                      Text('Reservation #${n.reservationId}'),
                    if (n.createdAt.isNotEmpty)
                      Text(
                        n.createdAt,
                        style: const TextStyle(
                          color: Colors.black54,
                          fontSize: 12,
                        ),
                      ),
                  ],
                ),
              ),
            ),
          );
        }),
        const SizedBox(height: 10),
        _buildPager(totalPages, filtered.length),
      ],
    );
  }

  Widget _statCard(String label, String value) {
    return SizedBox(
      width: 140,
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
                  fontSize: 20,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
        ),
      ),
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
            child: const Icon(
              Icons.notifications_active,
              color: Color(0xFFC2185B),
            ),
          ),
          const SizedBox(width: 12),
          const Expanded(
            child: Text(
              'Notifications Center',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700),
            ),
          ),
        ],
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

  Future<void> _markRead(NotificationItem item) async {
    setState(() => _busy.add(item.id));
    try {
      await widget.onMarkRead(item);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(uiErrorMessage(e))));
    } finally {
      if (mounted) setState(() => _busy.remove(item.id));
    }
  }

  Future<void> _markAllRead() async {
    final unread = widget.notifications.where((n) => !n.isRead).toList();
    if (unread.isEmpty) return;
    for (final item in unread) {
      setState(() => _busy.add(item.id));
    }
    try {
      for (final item in unread) {
        await widget.onMarkRead(item);
      }
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('All notifications marked read.')),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(uiErrorMessage(e))));
    } finally {
      if (mounted) {
        setState(() {
          for (final item in unread) {
            _busy.remove(item.id);
          }
        });
      }
    }
  }

  Future<void> _createNotification() async {
    final payload = await _showCreateDialog();
    if (payload == null) return;
    setState(() => _creating = true);
    try {
      await widget.onCreate(payload);
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Notification created.')));
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(uiErrorMessage(e))));
    } finally {
      if (mounted) setState(() => _creating = false);
    }
  }

  Future<Map<String, Object?>?> _showCreateDialog() async {
    final formKey = GlobalKey<FormState>();
    String username = widget.defaultUsername;
    final titleController = TextEditingController();
    final messageController = TextEditingController();
    final reservationController = TextEditingController();
    String type = 'info';
    final userOptions = widget.users.map((u) => u.username).toSet().toList()
      ..sort();
    if (userOptions.isNotEmpty && !userOptions.contains(username)) {
      username = userOptions.first;
    }

    return showDialog<Map<String, Object?>>(
      context: context,
      builder: (dialogContext) {
        return StatefulBuilder(
          builder: (context, setLocalState) {
            return AlertDialog(
              title: const Text('Create Notification'),
              content: SizedBox(
                width: 430,
                child: Form(
                  key: formKey,
                  child: SingleChildScrollView(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        DropdownButtonFormField<String>(
                          key: ValueKey('notif_user_$username'),
                          initialValue: username,
                          decoration: const InputDecoration(
                            labelText: 'Username',
                            border: OutlineInputBorder(),
                          ),
                          items: userOptions
                              .map(
                                (u) =>
                                    DropdownMenuItem(value: u, child: Text(u)),
                              )
                              .toList(),
                          onChanged: (value) =>
                              setLocalState(() => username = value ?? username),
                        ),
                        const SizedBox(height: 10),
                        TextFormField(
                          controller: titleController,
                          decoration: const InputDecoration(
                            labelText: 'Title',
                            border: OutlineInputBorder(),
                          ),
                          validator: (v) =>
                              (v ?? '').trim().isEmpty ? 'Required' : null,
                        ),
                        const SizedBox(height: 10),
                        TextFormField(
                          controller: messageController,
                          minLines: 2,
                          maxLines: 4,
                          decoration: const InputDecoration(
                            labelText: 'Message',
                            border: OutlineInputBorder(),
                          ),
                          validator: (v) =>
                              (v ?? '').trim().isEmpty ? 'Required' : null,
                        ),
                        const SizedBox(height: 10),
                        DropdownButtonFormField<String>(
                          key: ValueKey('notif_type_$type'),
                          initialValue: type,
                          decoration: const InputDecoration(
                            labelText: 'Type',
                            border: OutlineInputBorder(),
                          ),
                          items: const [
                            DropdownMenuItem(
                              value: 'info',
                              child: Text('info'),
                            ),
                            DropdownMenuItem(
                              value: 'success',
                              child: Text('success'),
                            ),
                            DropdownMenuItem(
                              value: 'warning',
                              child: Text('warning'),
                            ),
                            DropdownMenuItem(
                              value: 'error',
                              child: Text('error'),
                            ),
                          ],
                          onChanged: (value) =>
                              setLocalState(() => type = value ?? 'info'),
                        ),
                        const SizedBox(height: 10),
                        TextFormField(
                          controller: reservationController,
                          keyboardType: TextInputType.number,
                          decoration: const InputDecoration(
                            labelText: 'Reservation ID (optional)',
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
                    final reservationId = int.tryParse(
                      reservationController.text.trim(),
                    );
                    final reservationPart = reservationId == null
                        ? null
                        : <String, Object?>{'reservationId': reservationId};
                    Navigator.of(dialogContext).pop({
                      'username': username,
                      'title': titleController.text.trim(),
                      'message': messageController.text.trim(),
                      'type': type,
                      ...?reservationPart,
                    });
                  },
                  child: const Text('Create'),
                ),
              ],
            );
          },
        );
      },
    );
  }
}
