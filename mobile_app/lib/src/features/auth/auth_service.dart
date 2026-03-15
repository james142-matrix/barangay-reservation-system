import '../../core/api_client.dart';
import 'auth_user.dart';

class AuthService {
  AuthService({ApiClient? apiClient})
    : _apiClient = apiClient ?? ApiClient.instance;

  final ApiClient _apiClient;

  Future<AuthUser> login({
    required String username,
    required String password,
  }) async {
    final payload = await _apiClient.postJson('/auth/login', <String, Object?>{
      'username': username,
      'password': password,
    });
    return AuthUser.fromJson(payload);
  }

  Future<AuthUser?> me() async {
    try {
      final payload = await _apiClient.getJson('/auth/me');
      return AuthUser.fromJson(payload);
    } on ApiException catch (e) {
      if (e.statusCode == 401) {
        return null;
      }
      rethrow;
    }
  }

  Future<void> logout() async {
    try {
      await _apiClient.postJson('/auth/logout', const <String, Object?>{});
    } finally {
      _apiClient.clearAuthContext();
    }
  }

  Future<AuthUser> changePasswordRequired({
    required String username,
    required String currentPassword,
    required String newPassword,
  }) async {
    final payload = await _apiClient
        .postJson('/auth/change-password-required', <String, Object?>{
          'username': username,
          'currentPassword': currentPassword,
          'newPassword': newPassword,
        });
    return AuthUser.fromJson(payload);
  }
}
