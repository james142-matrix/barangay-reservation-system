import 'api_client.dart';

String uiErrorMessage(Object error) {
  if (error is ApiException) {
    return error.message;
  }
  final raw = error.toString();
  const prefix = 'Exception:';
  if (raw.startsWith(prefix)) {
    return raw.substring(prefix.length).trim();
  }
  return raw;
}
