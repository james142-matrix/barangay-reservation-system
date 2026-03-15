import '../../core/api_client.dart';
import '../auth/auth_user.dart';
import 'notification_item.dart';

class NotificationService {
  NotificationService({ApiClient? apiClient})
    : _apiClient = apiClient ?? ApiClient.instance;

  final ApiClient _apiClient;

  Future<List<NotificationItem>> getNotifications(AuthUser user) async {
    final path = user.role == 'admin'
        ? '/notifications'
        : '/notifications?user=${Uri.encodeQueryComponent(user.username)}';
    final payload = await _apiClient.getListJson(path);
    return payload.map(NotificationItem.fromJson).toList();
  }

  Future<NotificationItem> markAsRead(int id) async {
    final payload = await _apiClient.putJson(
      '/notifications/$id/read',
      const <String, Object?>{},
    );
    return NotificationItem.fromJson(payload);
  }

  Future<NotificationItem> createNotification(Map<String, Object?> body) async {
    final payload = await _apiClient.postJson('/notifications', body);
    return NotificationItem.fromJson(payload);
  }
}
