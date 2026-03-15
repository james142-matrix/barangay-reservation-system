import '../../core/api_client.dart';
import '../auth/auth_user.dart';
import 'reservation.dart';

class ReservationService {
  ReservationService({ApiClient? apiClient})
    : _apiClient = apiClient ?? ApiClient.instance;

  final ApiClient _apiClient;

  Future<List<Reservation>> getReservationsForUser(AuthUser user) async {
    final payload = await _apiClient.getListJson('/reservations');
    return payload.map(Reservation.fromJson).toList();
  }

  Future<Reservation> updateReservation(
    int id,
    Map<String, Object?> body,
  ) async {
    final payload = await _apiClient.putJson('/reservations/$id', body);
    return Reservation.fromJson(payload);
  }

  Future<Reservation> createReservation(Map<String, Object?> body) async {
    final payload = await _apiClient.postJson('/reservations', body);
    return Reservation.fromJson(payload);
  }
}
