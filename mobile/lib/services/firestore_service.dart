import 'dart:convert';
import 'package:http/http.dart' as http;
import 'auth_service.dart';
import 'firebase_config_service.dart';

/// Firestore REST API v1 client that shares the exact same Firestore
/// database and security rules as the Learning Allied website.
class FirestoreService {
  final AuthService auth;

  FirestoreService(this.auth);

  Future<String> _baseUrl() async {
    final cfg = await FirebaseConfigService.getConfig();
    return 'https://firestore.googleapis.com/v1/projects/${cfg.projectId}/databases/(default)/documents';
  }

  Future<Map<String, String>> _headers({bool forceRefresh = false}) async {
    final token = await auth.getValidIdToken(forceRefresh: forceRefresh);
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': 'Bearer $token',
    };
  }

  Future<Map<String, dynamic>?> getDoc(String docPath) async {
    final base = await _baseUrl();
    var headers = await _headers();
    var resp = await http
        .get(Uri.parse('$base/$docPath'), headers: headers)
        .timeout(const Duration(seconds: 15));

    if (resp.statusCode == 401) {
      headers = await _headers(forceRefresh: true);
      resp = await http
          .get(Uri.parse('$base/$docPath'), headers: headers)
          .timeout(const Duration(seconds: 15));
    }

    if (resp.statusCode == 404) return null;
    if (resp.statusCode >= 400) {
      throw Exception('Firestore read error (${resp.statusCode})');
    }

    final j = jsonDecode(resp.body) as Map<String, dynamic>;
    return _decodeDoc(j);
  }

  Future<void> setDoc(
    String docPath,
    Map<String, dynamic> data, {
    bool merge = true,
  }) async {
    final base = await _baseUrl();
    final mask = merge
        ? data.keys
            .map((k) => 'updateMask.fieldPaths=${Uri.encodeQueryComponent(k)}')
            .join('&')
        : '';
    final url = mask.isEmpty ? '$base/$docPath' : '$base/$docPath?$mask';

    final body = jsonEncode({'fields': _encodeFields(data)});
    var headers = await _headers();
    var resp = await http
        .patch(Uri.parse(url), headers: headers, body: body)
        .timeout(const Duration(seconds: 15));

    if (resp.statusCode == 401) {
      headers = await _headers(forceRefresh: true);
      resp = await http
          .patch(Uri.parse(url), headers: headers, body: body)
          .timeout(const Duration(seconds: 15));
    }

    if (resp.statusCode >= 400) {
      throw Exception('Firestore write error (${resp.statusCode}): ${resp.body}');
    }
  }

  Future<void> createDoc(
    String collectionPath,
    Map<String, dynamic> data, {
    String? documentId,
  }) async {
    final base = await _baseUrl();
    final q = documentId != null
        ? '?documentId=${Uri.encodeQueryComponent(documentId)}'
        : '';
    final url = '$base/$collectionPath$q';
    final body = jsonEncode({'fields': _encodeFields(data)});
    var headers = await _headers();
    var resp = await http
        .post(Uri.parse(url), headers: headers, body: body)
        .timeout(const Duration(seconds: 15));

    if (resp.statusCode == 401) {
      headers = await _headers(forceRefresh: true);
      resp = await http
          .post(Uri.parse(url), headers: headers, body: body)
          .timeout(const Duration(seconds: 15));
    }

    if (resp.statusCode >= 400) {
      throw Exception('Firestore create error (${resp.statusCode}): ${resp.body}');
    }
  }

  Future<void> deleteDoc(String docPath) async {
    final base = await _baseUrl();
    var headers = await _headers();
    var resp = await http
        .delete(Uri.parse('$base/$docPath'), headers: headers)
        .timeout(const Duration(seconds: 15));

    if (resp.statusCode == 401) {
      headers = await _headers(forceRefresh: true);
      resp = await http
          .delete(Uri.parse('$base/$docPath'), headers: headers)
          .timeout(const Duration(seconds: 15));
    }

    if (resp.statusCode >= 400 && resp.statusCode != 404) {
      throw Exception('Firestore delete error (${resp.statusCode})');
    }
  }

  Future<List<Map<String, dynamic>>> listDocs(
    String collectionPath, {
    int pageSize = 50,
    String? orderBy,
  }) async {
    final base = await _baseUrl();
    final params = <String>['pageSize=$pageSize'];
    if (orderBy != null && orderBy.isNotEmpty) {
      params.add('orderBy=${Uri.encodeQueryComponent(orderBy)}');
    }
    final url = '$base/$collectionPath?${params.join('&')}';
    var headers = await _headers();
    var resp = await http
        .get(Uri.parse(url), headers: headers)
        .timeout(const Duration(seconds: 15));

    if (resp.statusCode == 401) {
      headers = await _headers(forceRefresh: true);
      resp = await http
          .get(Uri.parse(url), headers: headers)
          .timeout(const Duration(seconds: 15));
    }

    if (resp.statusCode == 404) return [];
    if (resp.statusCode >= 400) {
      throw Exception('Firestore list error (${resp.statusCode})');
    }

    final j = jsonDecode(resp.body) as Map<String, dynamic>;
    final docs = (j['documents'] as List<dynamic>?) ?? [];
    return docs.map((d) => _decodeDoc(d as Map<String, dynamic>)).toList();
  }

  Future<List<Map<String, dynamic>>> queryCollection({
    String parentPath = '',
    required String collectionId,
    String? whereField,
    dynamic whereEquals,
    String? orderByField,
    bool descending = true,
    int limit = 50,
  }) async {
    final base = await _baseUrl();
    final url = parentPath.isEmpty ? '$base:runQuery' : '$base/$parentPath:runQuery';

    final query = <String, dynamic>{
      'from': [
        {'collectionId': collectionId},
      ],
      'limit': limit,
    };

    if (whereField != null && whereEquals != null) {
      query['where'] = {
        'fieldFilter': {
          'field': {'fieldPath': whereField},
          'op': 'EQUAL',
          'value': _encodeValue(whereEquals),
        },
      };
    }

    if (orderByField != null) {
      query['orderBy'] = [
        {
          'field': {'fieldPath': orderByField},
          'direction': descending ? 'DESCENDING' : 'ASCENDING',
        },
      ];
    }

    final body = jsonEncode({'structuredQuery': query});
    var headers = await _headers();
    var resp = await http
        .post(Uri.parse(url), headers: headers, body: body)
        .timeout(const Duration(seconds: 15));

    if (resp.statusCode == 401) {
      headers = await _headers(forceRefresh: true);
      resp = await http
          .post(Uri.parse(url), headers: headers, body: body)
          .timeout(const Duration(seconds: 15));
    }

    if (resp.statusCode >= 400) {
      throw Exception('Firestore query error (${resp.statusCode})');
    }

    final list = jsonDecode(resp.body) as List<dynamic>;
    final out = <Map<String, dynamic>>[];
    for (final item in list) {
      if (item is Map<String, dynamic> && item['document'] is Map<String, dynamic>) {
        out.add(_decodeDoc(item['document'] as Map<String, dynamic>));
      }
    }
    return out;
  }

  static Map<String, dynamic> _decodeDoc(Map<String, dynamic> doc) {
    final name = (doc['name'] ?? '') as String;
    final id = name.isNotEmpty ? name.split('/').last : '';
    final fields = (doc['fields'] as Map<String, dynamic>?) ?? {};
    final out = <String, dynamic>{'_id': id};
    fields.forEach((k, v) {
      out[k] = _decodeValue(v as Map<String, dynamic>);
    });
    return out;
  }

  static dynamic _decodeValue(Map<String, dynamic> v) {
    if (v.containsKey('stringValue')) return v['stringValue'];
    if (v.containsKey('integerValue')) return int.tryParse(v['integerValue'].toString()) ?? 0;
    if (v.containsKey('doubleValue')) return (v['doubleValue'] as num).toDouble();
    if (v.containsKey('booleanValue')) return v['booleanValue'] == true;
    if (v.containsKey('nullValue')) return null;
    if (v.containsKey('timestampValue')) return v['timestampValue'];
    if (v.containsKey('arrayValue')) {
      final arr = (v['arrayValue']?['values'] as List<dynamic>?) ?? [];
      return arr.map((e) => _decodeValue(e as Map<String, dynamic>)).toList();
    }
    if (v.containsKey('mapValue')) {
      final m = (v['mapValue']?['fields'] as Map<String, dynamic>?) ?? {};
      final out = <String, dynamic>{};
      m.forEach((k, val) {
        out[k] = _decodeValue(val as Map<String, dynamic>);
      });
      return out;
    }
    return null;
  }

  static Map<String, dynamic> _encodeFields(Map<String, dynamic> data) {
    final out = <String, dynamic>{};
    data.forEach((k, v) {
      if (k.startsWith('_')) return;
      out[k] = _encodeValue(v);
    });
    return out;
  }

  static Map<String, dynamic> _encodeValue(dynamic v) {
    if (v == null) return {'nullValue': null};
    if (v is bool) return {'booleanValue': v};
    if (v is int) return {'integerValue': v.toString()};
    if (v is double) return {'doubleValue': v};
    if (v is num) return {'doubleValue': v.toDouble()};
    if (v is DateTime) return {'timestampValue': v.toUtc().toIso8601String()};
    if (v is String) return {'stringValue': v};
    if (v is List) {
      return {
        'arrayValue': {
          'values': v.map(_encodeValue).toList(),
        },
      };
    }
    if (v is Map) {
      final fields = <String, dynamic>{};
      v.forEach((k, val) {
        fields[k.toString()] = _encodeValue(val);
      });
      return {
        'mapValue': {'fields': fields},
      };
    }
    return {'stringValue': v.toString()};
  }
}
