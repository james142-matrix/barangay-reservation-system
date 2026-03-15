import 'package:flutter/material.dart';

import '../../core/api_client.dart';
import '../auth/auth_service.dart';
import '../auth/auth_user.dart';

class ProfilePage extends StatefulWidget {
  const ProfilePage({super.key, required this.user, required this.authService});

  final AuthUser user;
  final AuthService authService;

  @override
  State<ProfilePage> createState() => _ProfilePageState();
}

class _ProfilePageState extends State<ProfilePage> {
  final _formKey = GlobalKey<FormState>();
  final _currentController = TextEditingController();
  final _newController = TextEditingController();
  final _confirmController = TextEditingController();
  bool _submitting = false;
  bool _hideCurrent = true;
  bool _hideNew = true;
  bool _hideConfirm = true;

  @override
  void initState() {
    super.initState();
    _newController.addListener(() {
      if (mounted) setState(() {});
    });
  }

  @override
  void dispose() {
    _currentController.dispose();
    _newController.dispose();
    _confirmController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text('Profile', style: Theme.of(context).textTheme.titleLarge),
        const SizedBox(height: 10),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Username: ${widget.user.username}'),
                Text('Full Name: ${widget.user.fullname}'),
                Text('Email: ${widget.user.email}'),
                Text('Role: ${widget.user.role}'),
              ],
            ),
          ),
        ),
        const SizedBox(height: 12),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Form(
              key: _formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Text(
                    'Change Password',
                    style: TextStyle(fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 8),
                  TextFormField(
                    controller: _currentController,
                    obscureText: _hideCurrent,
                    decoration: InputDecoration(
                      labelText: 'Current Password',
                      border: const OutlineInputBorder(),
                      suffixIcon: IconButton(
                        onPressed: () =>
                            setState(() => _hideCurrent = !_hideCurrent),
                        icon: Icon(
                          _hideCurrent
                              ? Icons.visibility
                              : Icons.visibility_off,
                        ),
                      ),
                    ),
                    onTapOutside: (_) => FocusScope.of(context).unfocus(),
                    validator: (v) => (v ?? '').isEmpty ? 'Required' : null,
                  ),
                  const SizedBox(height: 10),
                  TextFormField(
                    controller: _newController,
                    obscureText: _hideNew,
                    decoration: InputDecoration(
                      labelText: 'New Password',
                      border: const OutlineInputBorder(),
                      suffixIcon: IconButton(
                        onPressed: () => setState(() => _hideNew = !_hideNew),
                        icon: Icon(
                          _hideNew ? Icons.visibility : Icons.visibility_off,
                        ),
                      ),
                    ),
                    onTapOutside: (_) => FocusScope.of(context).unfocus(),
                    validator: (v) {
                      final value = v ?? '';
                      if (value.length < 8) return 'At least 8 characters';
                      if (!RegExp(r'[A-Z]').hasMatch(value))
                        return 'Need uppercase letter';
                      if (!RegExp(r'[^A-Za-z0-9]').hasMatch(value))
                        return 'Need special character';
                      if (value.contains(' ')) return 'No spaces allowed';
                      return null;
                    },
                  ),
                  const SizedBox(height: 10),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: Colors.grey.shade50,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: Colors.grey.shade300),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Password requirements'),
                        const SizedBox(height: 6),
                        _requirementRow(
                          '8+ characters',
                          _newController.text.length >= 8,
                        ),
                        _requirementRow(
                          'At least one uppercase letter',
                          RegExp(r'[A-Z]').hasMatch(_newController.text),
                        ),
                        _requirementRow(
                          'At least one special character',
                          RegExp(r'[^A-Za-z0-9]').hasMatch(_newController.text),
                        ),
                        _requirementRow(
                          'No spaces',
                          !RegExp(r'\s').hasMatch(_newController.text),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 10),
                  TextFormField(
                    controller: _confirmController,
                    obscureText: _hideConfirm,
                    decoration: InputDecoration(
                      labelText: 'Confirm New Password',
                      border: const OutlineInputBorder(),
                      suffixIcon: IconButton(
                        onPressed: () =>
                            setState(() => _hideConfirm = !_hideConfirm),
                        icon: Icon(
                          _hideConfirm
                              ? Icons.visibility
                              : Icons.visibility_off,
                        ),
                      ),
                    ),
                    onTapOutside: (_) => FocusScope.of(context).unfocus(),
                    validator: (v) => (v ?? '') != _newController.text
                        ? 'Passwords do not match'
                        : null,
                  ),
                  const SizedBox(height: 10),
                  FilledButton(
                    onPressed: _submitting ? null : _changePassword,
                    child: Text(
                      _submitting ? 'Updating...' : 'Update Password',
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }

  Future<void> _changePassword() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _submitting = true);
    try {
      await widget.authService.changePasswordRequired(
        username: widget.user.username,
        currentPassword: _currentController.text,
        newPassword: _newController.text,
      );
      if (!mounted) return;
      _currentController.clear();
      _newController.clear();
      _confirmController.clear();
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Password updated successfully.')),
      );
    } on ApiException catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(e.message)));
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(e.toString())));
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  Widget _requirementRow(String label, bool ok) {
    return Row(
      children: [
        Icon(
          ok ? Icons.check_circle : Icons.radio_button_unchecked,
          size: 16,
          color: ok ? Colors.green : Colors.black45,
        ),
        const SizedBox(width: 6),
        Text(
          label,
          style: TextStyle(color: ok ? Colors.green.shade700 : Colors.black54),
        ),
      ],
    );
  }
}
