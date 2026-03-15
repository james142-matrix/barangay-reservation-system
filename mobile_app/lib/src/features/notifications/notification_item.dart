class NotificationItem {
  final int id;
  final String username;
  final String title;
  final String message;
  final String type;
  final bool isRead;
  final int? reservationId;
  final String createdAt;

  const NotificationItem({
    required this.id,
    required this.username,
    required this.title,
    required this.message,
    required this.type,
    required this.isRead,
    required this.reservationId,
    required this.createdAt,
  });

  factory NotificationItem.fromJson(Map<String, dynamic> json) {
    return NotificationItem(
      id: (json['id'] as num?)?.toInt() ?? 0,
      username: (json['username'] ?? '').toString(),
      title: (json['title'] ?? '').toString(),
      message: (json['message'] ?? '').toString(),
      type: (json['type'] ?? 'info').toString(),
      isRead: json['isRead'] == true,
      reservationId: (json['reservationId'] as num?)?.toInt(),
      createdAt: (json['createdAt'] ?? '').toString(),
    );
  }
}
