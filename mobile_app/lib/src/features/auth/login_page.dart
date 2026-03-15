import 'package:flutter/material.dart';

import '../../core/api_client.dart';
import 'auth_service.dart';

class LoginPage extends StatefulWidget {
  const LoginPage({
    super.key,
    required this.authService,
    required this.onLoginSuccess,
  });

  final AuthService authService;
  final VoidCallback onLoginSuccess;

  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  final _formKey = GlobalKey<FormState>();
  final _usernameController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _submitting = false;
  bool _passwordVisible = false;
  String _errorMessage = '';

  @override
  void dispose() {
    _usernameController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _submitting = true;
      _errorMessage = '';
    });

    try {
      await widget.authService.login(
        username: _usernameController.text.trim(),
        password: _passwordController.text,
      );
      if (!mounted) return;
      widget.onLoginSuccess();
    } on ApiException catch (e) {
      setState(() {
        _errorMessage = e.message;
      });
    } catch (_) {
      setState(() {
        _errorMessage = 'Login failed. Please try again.';
      });
    } finally {
      if (mounted) {
        setState(() {
          _submitting = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Container(
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              colors: [Color(0xFFFFF1F7), Color(0xFFF5F7FA)],
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
            ),
          ),
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(20),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 420),
                child: Card(
                  child: Padding(
                    padding: const EdgeInsets.all(20),
                    child: Form(
                      key: _formKey,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Container(
                            height: 56,
                            width: 56,
                            alignment: Alignment.center,
                            decoration: BoxDecoration(
                              color: const Color(0xFFFCE7F3),
                              borderRadius: BorderRadius.circular(16),
                            ),
                            child: const Icon(
                              Icons.apartment,
                              color: Color(0xFFC2185B),
                            ),
                          ),
                          const SizedBox(height: 14),
                          const Text(
                            'Barangay Reservation',
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              fontSize: 24,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                          const SizedBox(height: 6),
                          const Text(
                            'Staff/Admin Sign In',
                            textAlign: TextAlign.center,
                            style: TextStyle(color: Colors.black54),
                          ),
                          const SizedBox(height: 18),
                          TextFormField(
                            controller: _usernameController,
                            decoration: const InputDecoration(
                              labelText: 'Username',
                            ),
                            validator: (value) {
                              final v = (value ?? '').trim();
                              if (v.isEmpty) return 'Enter username';
                              if (v.length < 3) return 'Minimum 3 characters';
                              return null;
                            },
                          ),
                          const SizedBox(height: 12),
                          TextFormField(
                            controller: _passwordController,
                            obscureText: !_passwordVisible,
                            decoration: InputDecoration(
                              labelText: 'Password',
                              suffixIcon: IconButton(
                                onPressed: () {
                                  setState(() {
                                    _passwordVisible = !_passwordVisible;
                                  });
                                },
                                icon: Icon(
                                  _passwordVisible
                                      ? Icons.visibility_off
                                      : Icons.visibility,
                                ),
                              ),
                            ),
                            validator: (value) {
                              final v = value ?? '';
                              if (v.isEmpty) return 'Enter password';
                              if (v.length < 3) return 'Minimum 3 characters';
                              return null;
                            },
                            onFieldSubmitted: (_) =>
                                _submitting ? null : _submit(),
                          ),
                          if (_errorMessage.isNotEmpty) ...[
                            const SizedBox(height: 10),
                            Text(
                              _errorMessage,
                              style: const TextStyle(color: Colors.red),
                            ),
                          ],
                          const SizedBox(height: 16),
                          FilledButton(
                            onPressed: _submitting ? null : _submit,
                            child: Text(
                              _submitting ? 'Signing in...' : 'Sign In',
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
