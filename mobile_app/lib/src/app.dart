import 'package:flutter/material.dart';

import 'features/auth/auth_service.dart';
import 'features/auth/auth_user.dart';
import 'features/auth/login_page.dart';
import 'features/home/home_page.dart';

class BarangayReservationApp extends StatelessWidget {
  const BarangayReservationApp({super.key});

  @override
  Widget build(BuildContext context) {
    const primary = Color(0xFFE83E8C);
    const primaryDark = Color(0xFFC2185B);
    const background = Color(0xFFF5F7FA);
    const surface = Colors.white;

    final colorScheme = const ColorScheme.light(
      primary: primary,
      onPrimary: Colors.white,
      secondary: primaryDark,
      onSecondary: Colors.white,
      surface: surface,
      onSurface: Color(0xFF1F2937),
      error: Color(0xFFB91C1C),
      onError: Colors.white,
    );

    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'Barangay Reservation',
      theme: ThemeData(
        colorScheme: colorScheme,
        useMaterial3: true,
        scaffoldBackgroundColor: background,
        appBarTheme: const AppBarTheme(
          backgroundColor: Colors.white,
          foregroundColor: Color(0xFF111827),
          elevation: 0,
          centerTitle: false,
          surfaceTintColor: Colors.transparent,
          titleTextStyle: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w600,
            color: Color(0xFF111827),
          ),
        ),
        textTheme: const TextTheme(
          titleLarge: TextStyle(
            fontSize: 32,
            fontWeight: FontWeight.w600,
            color: Color(0xFF111827),
          ),
          titleMedium: TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.w600,
            color: Color(0xFF111827),
          ),
          bodyLarge: TextStyle(fontSize: 16, color: Color(0xFF1F2937)),
          bodyMedium: TextStyle(fontSize: 14, color: Color(0xFF1F2937)),
        ),
        cardTheme: CardThemeData(
          color: Colors.white,
          elevation: 0,
          margin: EdgeInsets.zero,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
            side: const BorderSide(color: Color(0xFFE5E7EB)),
          ),
        ),
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: Colors.white,
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(color: Color(0xFFD1D5DB)),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(color: Color(0xFFD1D5DB)),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(color: primary, width: 1.4),
          ),
          contentPadding: const EdgeInsets.symmetric(
            horizontal: 14,
            vertical: 12,
          ),
        ),
        filledButtonTheme: FilledButtonThemeData(
          style: FilledButton.styleFrom(
            backgroundColor: primary,
            foregroundColor: Colors.white,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(10),
            ),
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            textStyle: const TextStyle(fontWeight: FontWeight.w700),
          ),
        ),
        outlinedButtonTheme: OutlinedButtonThemeData(
          style: OutlinedButton.styleFrom(
            foregroundColor: primaryDark,
            side: const BorderSide(color: Color(0xFFD1D5DB)),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(10),
            ),
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          ),
        ),
        snackBarTheme: SnackBarThemeData(
          behavior: SnackBarBehavior.floating,
          backgroundColor: primaryDark,
          contentTextStyle: const TextStyle(color: Colors.white),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(10),
          ),
        ),
        navigationBarTheme: NavigationBarThemeData(
          backgroundColor: Colors.white,
          indicatorColor: const Color(0xFFFCE7F3),
          labelTextStyle: WidgetStateProperty.resolveWith<TextStyle?>((states) {
            final selected = states.contains(WidgetState.selected);
            return TextStyle(
              fontSize: 12,
              fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
              color: selected ? primaryDark : const Color(0xFF374151),
            );
          }),
          iconTheme: WidgetStateProperty.resolveWith<IconThemeData?>((states) {
            final selected = states.contains(WidgetState.selected);
            return IconThemeData(
              color: selected ? primaryDark : const Color(0xFF4B5563),
            );
          }),
        ),
      ),
      home: const AuthGate(),
    );
  }
}

class AuthGate extends StatefulWidget {
  const AuthGate({super.key});

  @override
  State<AuthGate> createState() => _AuthGateState();
}

class _AuthGateState extends State<AuthGate> {
  final AuthService _authService = AuthService();
  late Future<AuthUser?> _sessionFuture;

  @override
  void initState() {
    super.initState();
    _sessionFuture = _authService.me();
  }

  void _reloadSession() {
    setState(() {
      _sessionFuture = _authService.me();
    });
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<AuthUser?>(
      future: _sessionFuture,
      builder: (context, snapshot) {
        if (snapshot.connectionState != ConnectionState.done) {
          return const Scaffold(
            body: Center(child: CircularProgressIndicator()),
          );
        }

        final user = snapshot.data;
        if (user == null) {
          return LoginPage(
            authService: _authService,
            onLoginSuccess: _reloadSession,
          );
        }

        return HomePage(
          user: user,
          authService: _authService,
          onLogout: _reloadSession,
        );
      },
    );
  }
}
