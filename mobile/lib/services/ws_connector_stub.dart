import 'dart:async';

abstract class SimpleWebSocket {
  Stream<dynamic> get stream;
  void send(String data);
  Future<void> close();
}

Future<SimpleWebSocket> connectWebSocket(String url) =>
    throw UnsupportedError('WebSocket is not supported on this platform');
