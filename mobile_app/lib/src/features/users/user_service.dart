import '../../core/api_client.dart';
import 'app_user.dart';

class UserService {
  UserService({ApiClient? apiClient})
    : _apiClient = apiClient ?? ApiClient.instance;

  final ApiClient _apiClient;

  Future<List<AppUser>> getUsers() async {
    final payload = await _apiClient.getListJson('/users');
    return payload.map(AppUser.fromJson).toList();
  }

  Future<AppUser> createUser(Map<String, Object?> body) async {
    final payload = await _apiClient.postJson('/users', body);
    return AppUser.fromJson(payload);
  }

  Future<AppUser> updateUser(int id, Map<String, Object?> body) async {
    final payload = await _apiClient.putJson('/users/$id', body);
    return AppUser.fromJson(payload);
  }

  Future<void> archiveUser(int id) async {
    await _apiClient.deleteJson('/users/$id');
  }

  Future<AppUser> approveUser(int id) async {
    final payload = await _apiClient.postJson(
      '/users/$id/approve',
      const <String, Object?>{},
    );
    return AppUser.fromJson(payload);
  }
}
