// Firebase options for Learning Allied mobile app.
// Source: mentora/.env.local (FIREBASE_* values) — same project as website (mentora-c6dca).
// Platform-specific client IDs (iosClientId, androidClientId, etc.) are only
// required for Google Sign-In. Add them from the Firebase console if you enable
// Google auth on mobile.
import 'package:firebase_core/firebase_core.dart' show FirebaseOptions;

const FirebaseOptions firebaseOptions = FirebaseOptions(
  apiKey: 'AIzaSyC--GsipEZSX-W3-eBFWrLhiEC9McOmrW0',
  appId: '1:388015722291:web:5fd20e48390a96caf13846',
  messagingSenderId: '388015722291',
  projectId: 'mentora-c6dca',
  authDomain: 'mentora-c6dca.firebaseapp.com',
  storageBucket: 'mentora-c6dca.firebasestorage.app',
);
