export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "reservation-system-7f132.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "reservation-system-7f132",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "reservation-system-7f132.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "733972352801",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "1:733972352801:web:94f77b4e829dbf08793860",
};

export const firebaseProjectNumber = "733972352801";
