import 'dart:async';
import 'dart:io';
import 'ws_connector_stub.dart';

class _IoWebSocket implements SimpleWebSocket {
  final WebSocket _ws;
  _IoWebSocket(this._ws);

  @override
  Stream<dynamic> get stream => _ws;

  @override
  void send(String data) => _ws.add(data);

  @override
  Future<void> close() => _ws.close();
}

Future<SimpleWebSocket> connectWebSocket(String url) async {
  final ws = await WebSocket.connect(url).timeout(const Duration(seconds: 15));
  return _IoWebSocket(ws);
}
