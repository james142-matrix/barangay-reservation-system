class AppUser {
  final int id;
  final String username;
  final String email;
  final String fullname;
  final String phone;
  final String address;
  final String role;
  final String approvalStatus;
  final String approvedBy;
  final String approvedAt;

  const AppUser({
    required this.id,
    required this.username,
    required this.email,
    required this.fullname,
    required this.phone,
    required this.address,
    required this.role,
    required this.approvalStatus,
    required this.approvedBy,
    required this.approvedAt,
  });

  factory AppUser.fromJson(Map<String, dynamic> json) {
    return AppUser(
      id: (json['id'] as num?)?.toInt() ?? 0,
      username: (json['username'] ?? '').toString(),
      email: (json['email'] ?? '').toString(),
      fullname: (json['fullname'] ?? '').toString(),
      phone: (json['phone'] ?? '').toString(),
      address: (json['address'] ?? '').toString(),
      role: (json['role'] ?? '').toString(),
      approvalStatus: (json['approvalStatus'] ?? 'approved').toString(),
      approvedBy: (json['approved_by'] ?? '').toString(),
      approvedAt: (json['approved_at'] ?? '').toString(),
    );
  }
}
