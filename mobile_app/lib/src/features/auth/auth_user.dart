class AuthUser {
  final int id;
  final String fullname;
  final String username;
  final String role;
  final String email;

  const AuthUser({
    required this.id,
    required this.fullname,
    required this.username,
    required this.role,
    required this.email,
  });

  factory AuthUser.fromJson(Map<String, dynamic> json) {
    return AuthUser(
      id: (json['id'] as num?)?.toInt() ?? 0,
      fullname: (json['fullname'] ?? '').toString(),
      username: (json['username'] ?? '').toString(),
      role: (json['role'] ?? '').toString(),
      email: (json['email'] ?? '').toString(),
    );
  }
}
