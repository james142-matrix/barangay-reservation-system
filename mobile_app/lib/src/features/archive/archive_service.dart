import '../../core/api_client.dart';
import '../facilities/facility.dart';
import '../reservations/reservation.dart';
import 'archived_user.dart';

class ArchiveService {
  ArchiveService({ApiClient? apiClient})
    : _apiClient = apiClient ?? ApiClient.instance;

  final ApiClient _apiClient;

  Future<List<ArchivedUser>> getArchivedUsers() async {
    final payload = await _apiClient.getListJson('/archive/users');
    return payload.map(ArchivedUser.fromJson).toList();
  }

  Future<List<Facility>> getArchivedFacilities() async {
    final payload = await _apiClient.getListJson('/archive/facilities');
    return payload.map(Facility.fromJson).toList();
  }

  Future<List<Reservation>> getArchivedReservations() async {
    final payload = await _apiClient.getListJson('/archive/reservations');
    return payload.map(Reservation.fromJson).toList();
  }

  Future<void> restoreUser(int id) async {
    await _apiClient.postJson(
      '/archive/users/$id/restore',
      const <String, Object?>{},
    );
  }

  Future<void> restoreFacility(int id) async {
    await _apiClient.postJson(
      '/archive/facilities/$id/restore',
      const <String, Object?>{},
    );
  }

  Future<void> restoreReservation(int id) async {
    await _apiClient.postJson(
      '/archive/reservations/$id/restore',
      const <String, Object?>{},
    );
  }
}
