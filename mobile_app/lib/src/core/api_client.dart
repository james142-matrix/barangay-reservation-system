import 'dart:math';

import 'package:dio/dio.dart';

import 'app_config.dart';
import 'http_adapter_stub.dart' if (dart.library.html) 'http_adapter_web.dart';

class ApiException implements Exception {
  final String message;
  final int? statusCode;
  final String? code;

  ApiException(this.message, {this.statusCode, this.code});

  @override
  String toString() => message;
}

class ApiClient {
  ApiClient._internal() {
    _dio = Dio(
      BaseOptions(
        baseUrl: AppConfig.apiBaseUrl,
        connectTimeout: const Duration(seconds: 20),
        receiveTimeout: const Duration(seconds: 20),
        sendTimeout: const Duration(seconds: 20),
        headers: <String, Object?>{'Accept': 'application/json'},
      ),
    );
    configureDioForPlatform(_dio);
    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) {
          options.headers['X-Tab-Session'] = _tabSessionId;
          if (_csrfToken.isNotEmpty) {
            options.headers['X-CSRF-Token'] = _csrfToken;
          }
          handler.next(options);
        },
        onResponse: (response, handler) {
          final data = response.data;
          if (data is Map<String, dynamic>) {
            final csrfToken = data['csrfToken'];
            if (csrfToken is String && csrfToken.isNotEmpty) {
              _csrfToken = csrfToken;
            }
            final sessionId = data['sessionId'];
            if (sessionId is String && sessionId.isNotEmpty) {
              _tabSessionId = sessionId;
            }
          }
          handler.next(response);
        },
      ),
    );
  }

  static final ApiClient instance = ApiClient._internal();

  late final Dio _dio;
  String _csrfToken = '';
  String _tabSessionId = _generateTabSessionId();

  static String _generateTabSessionId() {
    const chars =
        'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    final rand = Random.secure();
    return List.generate(32, (_) => chars[rand.nextInt(chars.length)]).join();
  }

  Future<Map<String, dynamic>> getJson(String path) async {
    try {
      final response = await _dio.get<Object?>(path);
      final data = response.data;
      if (data is Map<String, dynamic>) {
        return data;
      }
      throw ApiException(
        'Unexpected response format',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      throw _mapDioError(e);
    }
  }

  Future<List<Map<String, dynamic>>> getListJson(String path) async {
    try {
      final response = await _dio.get<Object?>(path);
      final data = response.data;
      if (data is List) {
        return data
            .whereType<Map>()
            .map((item) => Map<String, dynamic>.from(item))
            .toList();
      }
      throw ApiException(
        'Unexpected response format',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      throw _mapDioError(e);
    }
  }

  Future<Map<String, dynamic>> postJson(
    String path,
    Map<String, Object?> body,
  ) async {
    try {
      final response = await _dio.post<Object?>(path, data: body);
      final data = response.data;
      if (data is Map<String, dynamic>) {
        return data;
      }
      throw ApiException(
        'Unexpected response format',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      throw _mapDioError(e);
    }
  }

  Future<Map<String, dynamic>> putJson(
    String path,
    Map<String, Object?> body,
  ) async {
    try {
      final response = await _dio.put<Object?>(path, data: body);
      final data = response.data;
      if (data is Map<String, dynamic>) {
        return data;
      }
      throw ApiException(
        'Unexpected response format',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      throw _mapDioError(e);
    }
  }

  Future<Map<String, dynamic>> deleteJson(String path) async {
    try {
      final response = await _dio.delete<Object?>(path);
      final data = response.data;
      if (data is Map<String, dynamic>) {
        return data;
      }
      throw ApiException(
        'Unexpected response format',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      throw _mapDioError(e);
    }
  }

  void clearAuthContext() {
    _csrfToken = '';
    _tabSessionId = _generateTabSessionId();
  }

  ApiException _mapDioError(DioException e) {
    final response = e.response;
    final statusCode = response?.statusCode;
    final data = response?.data;
    if (data is Map<String, dynamic>) {
      final message = (data['error'] ?? data['message'] ?? 'Request failed')
          .toString();
      final code = data['code']?.toString();
      return ApiException(message, statusCode: statusCode, code: code);
    }
    if (e.type == DioExceptionType.connectionTimeout ||
        e.type == DioExceptionType.sendTimeout ||
        e.type == DioExceptionType.receiveTimeout) {
      return ApiException('Request timed out. Check your connection.');
    }
    return ApiException(e.message ?? 'Request failed', statusCode: statusCode);
  }
}
