import 'package:flutter/material.dart';

import '../../core/ui_error.dart';
import 'app_user.dart';

typedef CreateUserFn = Future<void> Function(Map<String, Object?> payload);
typedef UpdateUserFn =
    Future<void> Function(AppUser user, Map<String, Object?> payload);
typedef ArchiveUserFn = Future<void> Function(AppUser user);
typedef ApproveUserFn = Future<void> Function(AppUser user);

class UsersPage extends StatefulWidget {
  const UsersPage({
    super.key,
    required this.users,
    required this.canManage,
    required this.currentUsername,
    required this.onCreateUser,
    required this.onUpdateUser,
    required this.onArchiveUser,
    required this.onApproveUser,
  });

  final List<AppUser> users;
  final bool canManage;
  final String currentUsername;
  final CreateUserFn onCreateUser;
  final UpdateUserFn onUpdateUser;
  final ArchiveUserFn onArchiveUser;
  final ApproveUserFn onApproveUser;

  @override
  State<UsersPage> createState() => _UsersPageState();
}

class _UsersPageState extends State<UsersPage> {
  final Set<int> _busy = <int>{};
  bool _creating = false;
  final TextEditingController _searchController = TextEditingController();
  String _roleFilter = 'all';
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
    final totalUsers = widget.users.length;
    final totalStaff = widget.users
        .where((u) => u.role == 'barangay_staff')
        .length;
    final totalAdmins = widget.users.where((u) => u.role == 'admin').length;
    final totalPending = widget.users
        .where((u) => u.approvalStatus.toLowerCase() != 'approved')
        .length;
    final query = _searchController.text.trim().toLowerCase();
    final filtered = widget.users.where((u) {
      if (_roleFilter != 'all' && u.role != _roleFilter) return false;
      final approvalStatus = u.approvalStatus.toLowerCase();
      if (_statusFilter == 'pending' && approvalStatus == 'approved')
        return false;
      if (_statusFilter == 'approved' && approvalStatus != 'approved')
        return false;
      if (query.isEmpty) return true;
      return u.username.toLowerCase().contains(query) ||
          u.fullname.toLowerCase().contains(query) ||
          u.email.toLowerCase().contains(query) ||
          u.id.toString().contains(query);
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
        const SizedBox(height: 10),
        Row(
          children: [
            Expanded(
              child: Text(
                'Users',
                style: Theme.of(context).textTheme.titleLarge,
              ),
            ),
            if (widget.canManage)
              FilledButton.icon(
                onPressed: _creating ? null : _createUser,
                icon: const Icon(Icons.person_add_alt_1),
                label: Text(_creating ? 'Creating...' : 'Add User'),
              ),
          ],
        ),
        const SizedBox(height: 10),
        Wrap(
          spacing: 10,
          runSpacing: 10,
          children: [
            _statCard('Total Users', '$totalUsers'),
            _statCard('Staff', '$totalStaff'),
            _statCard('Admins', '$totalAdmins'),
            _statCard('Pending', '$totalPending'),
          ],
        ),
        const SizedBox(height: 10),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            ChoiceChip(
              label: const Text('All'),
              selected: _statusFilter == 'all',
              onSelected: (_) => setState(() {
                _statusFilter = 'all';
                _page = 1;
              }),
            ),
            ChoiceChip(
              label: const Text('Pending'),
              selected: _statusFilter == 'pending',
              onSelected: (_) => setState(() {
                _statusFilter = 'pending';
                _page = 1;
              }),
            ),
            ChoiceChip(
              label: const Text('Approved'),
              selected: _statusFilter == 'approved',
              onSelected: (_) => setState(() {
                _statusFilter = 'approved';
                _page = 1;
              }),
            ),
          ],
        ),
        const SizedBox(height: 10),
        TextField(
          controller: _searchController,
          decoration: InputDecoration(
            labelText: 'Search users',
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
          key: ValueKey('user_filter_$_roleFilter'),
          initialValue: _roleFilter,
          decoration: const InputDecoration(
            labelText: 'Role Filter',
            border: OutlineInputBorder(),
          ),
          items: const [
            DropdownMenuItem(value: 'all', child: Text('All')),
            DropdownMenuItem(value: 'admin', child: Text('admin')),
            DropdownMenuItem(
              value: 'barangay_staff',
              child: Text('barangay_staff'),
            ),
          ],
          onChanged: (value) {
            setState(() {
              _roleFilter = value ?? 'all';
              _page = 1;
            });
          },
        ),
        const SizedBox(height: 10),
        if (filtered.isEmpty)
          const Card(
            child: Padding(
              padding: EdgeInsets.all(12),
              child: Text('No users found.'),
            ),
          ),
        ...pageData.map((u) {
          final busy = _busy.contains(u.id);
          final pending = u.approvalStatus.toLowerCase() != 'approved';
          final activeAdminCount = widget.users
              .where((x) => x.role == 'admin')
              .length;
          final isSelfAdmin =
              u.role == 'admin' &&
              u.username.toLowerCase() == widget.currentUsername.toLowerCase();
          final isProtectedAdmin =
              u.role == 'admin' && (isSelfAdmin || activeAdminCount <= 1);
          return Card(
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          '${u.fullname.isNotEmpty ? u.fullname : u.username} (${u.username})',
                          style: const TextStyle(fontWeight: FontWeight.w700),
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 10,
                          vertical: 4,
                        ),
                        decoration: BoxDecoration(
                          color: pending
                              ? Colors.orange.shade100
                              : Colors.green.shade100,
                          borderRadius: BorderRadius.circular(999),
                        ),
                        child: Text(
                          u.approvalStatus,
                          style: TextStyle(
                            color: pending
                                ? Colors.orange.shade900
                                : Colors.green.shade900,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text('Role: ${u.role}'),
                  Text('Email: ${u.email}'),
                  if (u.phone.isNotEmpty) Text('Phone: ${u.phone}'),
                  if (u.address.isNotEmpty) Text('Address: ${u.address}'),
                  const SizedBox(height: 8),
                  if (widget.canManage)
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        if (pending)
                          OutlinedButton(
                            onPressed: busy ? null : () => _approveUser(u),
                            child: const Text('Approve'),
                          ),
                        OutlinedButton(
                          onPressed: busy ? null : () => _editUser(u),
                          child: const Text('Edit'),
                        ),
                        if (!pending && isProtectedAdmin)
                          const OutlinedButton(
                            onPressed: null,
                            child: Text('Protected Admin'),
                          )
                        else
                          OutlinedButton(
                            onPressed: busy ? null : () => _archiveUser(u),
                            child: Text(pending ? 'Decline' : 'Archive'),
                          ),
                      ],
                    ),
                ],
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
      width: 150,
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
            child: const Icon(Icons.group, color: Color(0xFFC2185B)),
          ),
          const SizedBox(width: 12),
          const Expanded(
            child: Text(
              'User Management',
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

  Future<void> _createUser() async {
    final data = await _showUserDialog();
    if (data == null) return;
    setState(() => _creating = true);
    try {
      await widget.onCreateUser(data);
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('User created.')));
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(uiErrorMessage(e))));
    } finally {
      if (mounted) setState(() => _creating = false);
    }
  }

  Future<void> _editUser(AppUser user) async {
    final data = await _showUserDialog(seed: user);
    if (data == null) return;
    setState(() => _busy.add(user.id));
    try {
      await widget.onUpdateUser(user, data);
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('User updated.')));
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(uiErrorMessage(e))));
    } finally {
      if (mounted) setState(() => _busy.remove(user.id));
    }
  }

  Future<void> _archiveUser(AppUser user) async {
    final activeAdminCount = widget.users
        .where((x) => x.role == 'admin')
        .length;
    final isSelfAdmin =
        user.role == 'admin' &&
        user.username.toLowerCase() == widget.currentUsername.toLowerCase();
    final isLastAdmin = user.role == 'admin' && activeAdminCount <= 1;
    if (isSelfAdmin) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('You cannot archive your own admin account.'),
        ),
      );
      return;
    }
    if (isLastAdmin) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Cannot archive the last active admin account.'),
        ),
      );
      return;
    }
    final pending = user.approvalStatus.toLowerCase() != 'approved';
    final actionWord = pending ? 'decline' : 'archive';
    final ok = await _confirm(
      '${actionWord[0].toUpperCase()}${actionWord.substring(1)} user "${user.username}"?',
    );
    if (!ok) return;
    setState(() => _busy.add(user.id));
    try {
      await widget.onArchiveUser(user);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            pending ? 'Signup request declined.' : 'User archived.',
          ),
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(uiErrorMessage(e))));
    } finally {
      if (mounted) setState(() => _busy.remove(user.id));
    }
  }

  Future<void> _approveUser(AppUser user) async {
    final ok = await _confirm('Approve user "${user.username}"?');
    if (!ok) return;
    setState(() => _busy.add(user.id));
    try {
      await widget.onApproveUser(user);
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('User approved.')));
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(uiErrorMessage(e))));
    } finally {
      if (mounted) setState(() => _busy.remove(user.id));
    }
  }

  Future<bool> _confirm(String message) async {
    final result = await showDialog<bool>(
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
    );
    return result ?? false;
  }

  Future<Map<String, Object?>?> _showUserDialog({AppUser? seed}) async {
    final formKey = GlobalKey<FormState>();
    final usernameController = TextEditingController(
      text: seed?.username ?? '',
    );
    final emailController = TextEditingController(text: seed?.email ?? '');
    final fullnameController = TextEditingController(
      text: seed?.fullname ?? '',
    );
    final phoneController = TextEditingController(text: seed?.phone ?? '');
    final addressController = TextEditingController(text: seed?.address ?? '');
    final passwordController = TextEditingController();
    String role = seed?.role.isNotEmpty == true ? seed!.role : 'barangay_staff';
    final activeAdminCount = widget.users
        .where((x) => x.role == 'admin')
        .length;
    final isSelfAdmin =
        seed != null &&
        seed.role == 'admin' &&
        seed.username.toLowerCase() == widget.currentUsername.toLowerCase();
    final isProtectedAdminRole =
        seed != null &&
        seed.role == 'admin' &&
        (isSelfAdmin || activeAdminCount <= 1);

    return showDialog<Map<String, Object?>>(
      context: context,
      builder: (dialogContext) {
        return StatefulBuilder(
          builder: (context, setLocalState) => AlertDialog(
            title: Text(seed == null ? 'Add User' : 'Edit User'),
            content: SizedBox(
              width: 430,
              child: Form(
                key: formKey,
                child: SingleChildScrollView(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      TextFormField(
                        controller: usernameController,
                        decoration: const InputDecoration(
                          labelText: 'Username',
                          border: OutlineInputBorder(),
                        ),
                        validator: (v) => (v ?? '').trim().length < 3
                            ? 'Minimum 3 chars'
                            : null,
                      ),
                      const SizedBox(height: 10),
                      TextFormField(
                        controller: emailController,
                        decoration: const InputDecoration(
                          labelText: 'Email',
                          border: OutlineInputBorder(),
                        ),
                        validator: (v) =>
                            RegExp(
                              r'^[^@\s]+@[^@\s]+\.[^@\s]+$',
                            ).hasMatch((v ?? '').trim())
                            ? null
                            : 'Invalid email',
                      ),
                      const SizedBox(height: 10),
                      TextFormField(
                        controller: fullnameController,
                        decoration: const InputDecoration(
                          labelText: 'Full Name',
                          border: OutlineInputBorder(),
                        ),
                      ),
                      const SizedBox(height: 10),
                      TextFormField(
                        controller: phoneController,
                        decoration: const InputDecoration(
                          labelText: 'Phone',
                          border: OutlineInputBorder(),
                        ),
                      ),
                      const SizedBox(height: 10),
                      TextFormField(
                        controller: addressController,
                        decoration: const InputDecoration(
                          labelText: 'Address',
                          border: OutlineInputBorder(),
                        ),
                      ),
                      const SizedBox(height: 10),
                      DropdownButtonFormField<String>(
                        key: ValueKey('user_role_$role'),
                        initialValue: role,
                        decoration: const InputDecoration(
                          labelText: 'Role',
                          border: OutlineInputBorder(),
                        ),
                        items: const [
                          DropdownMenuItem(
                            value: 'admin',
                            child: Text('admin'),
                          ),
                          DropdownMenuItem(
                            value: 'barangay_staff',
                            child: Text('barangay_staff'),
                          ),
                        ],
                        onChanged: isProtectedAdminRole
                            ? null
                            : (value) {
                                setLocalState(
                                  () => role = value ?? 'barangay_staff',
                                );
                              },
                      ),
                      const SizedBox(height: 10),
                      TextFormField(
                        controller: passwordController,
                        decoration: InputDecoration(
                          labelText: seed == null
                              ? 'Password'
                              : 'Password (leave blank to keep current)',
                          border: const OutlineInputBorder(),
                        ),
                        obscureText: true,
                        validator: (v) {
                          final value = (v ?? '').trim();
                          if (seed == null && value.isEmpty) {
                            return 'Password required';
                          }
                          if (value.isNotEmpty && value.length < 8) {
                            return 'Password must be at least 8 characters';
                          }
                          if (value.isNotEmpty &&
                              !RegExp(r'[A-Z]').hasMatch(value)) {
                            return 'Password must include uppercase letter';
                          }
                          if (value.isNotEmpty &&
                              !RegExp(r'[^A-Za-z0-9]').hasMatch(value)) {
                            return 'Password must include special character';
                          }
                          if (value.contains(' ')) {
                            return 'Password must not contain spaces';
                          }
                          return null;
                        },
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
                  final payload = <String, Object?>{
                    'username': usernameController.text.trim(),
                    'email': emailController.text.trim(),
                    'fullname': fullnameController.text.trim(),
                    'phone': phoneController.text.trim(),
                    'address': addressController.text.trim(),
                    'role': role,
                  };
                  final pass = passwordController.text.trim();
                  if (pass.isNotEmpty) payload['password'] = pass;
                  Navigator.of(dialogContext).pop(payload);
                },
                child: const Text('Save'),
              ),
            ],
          ),
        );
      },
    );
  }
}
