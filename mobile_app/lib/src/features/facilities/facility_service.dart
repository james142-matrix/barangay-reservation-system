import '../../core/api_client.dart';
import 'facility.dart';

class FacilityService {
  FacilityService({ApiClient? apiClient})
    : _apiClient = apiClient ?? ApiClient.instance;

  final ApiClient _apiClient;

  Future<List<Facility>> getFacilities() async {
    final payload = await _apiClient.getListJson('/facilities');
    return payload.map(Facility.fromJson).toList();
  }

  Future<Facility> createFacility(Map<String, Object?> body) async {
    final payload = await _apiClient.postJson('/facilities', body);
    return Facility.fromJson(payload);
  }

  Future<Facility> updateFacility(int id, Map<String, Object?> body) async {
    final payload = await _apiClient.putJson('/facilities/$id', body);
    return Facility.fromJson(payload);
  }

  Future<void> archiveFacility(int id) async {
    await _apiClient.deleteJson('/facilities/$id');
  }
}
