class ArchivedUser {
  final int id;
  final String username;
  final String email;
  final String fullname;
  final String role;
  final String approvalStatus;

  const ArchivedUser({
    required this.id,
    required this.username,
    required this.email,
    required this.fullname,
    required this.role,
    required this.approvalStatus,
  });

  factory ArchivedUser.fromJson(Map<String, dynamic> json) {
    return ArchivedUser(
      id: (json['id'] as num?)?.toInt() ?? 0,
      username: (json['username'] ?? '').toString(),
      email: (json['email'] ?? '').toString(),
      fullname: (json['fullname'] ?? '').toString(),
      role: (json['role'] ?? '').toString(),
      approvalStatus: (json['approvalStatus'] ?? '').toString(),
    );
  }
}
