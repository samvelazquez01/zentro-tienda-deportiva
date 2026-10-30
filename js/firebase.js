/* ============================================================
   Firebase - Conexión Activa para ZENTRO Tienda Deportiva
   ------------------------------------------------------------
   Proyecto: zentro-581ec
   Sincroniza: Productos, Vendedores, Pedidos e Inventario
   en tiempo real entre todos tus dispositivos.
   ============================================================ */

const firebaseConfig = {
  apiKey: "AIzaSyC7TxCS84R0RW1GoubbbTpB8lB-dWwPw-o",
  authDomain: "zentro-581ec.firebaseapp.com",
  projectId: "zentro-581ec",
  storageBucket: "zentro-581ec.firebasestorage.app",
  messagingSenderId: "1098167268658",
  appId: "1:1098167268658:web:0eda15a49cf9d978cc132b",
  measurementId: "G-C86W6M1BSX"
};

let db = null;

if (typeof firebase !== "undefined") {
  try {
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }
    db = firebase.firestore();
  } catch (e) {
    console.warn("Aviso al inicializar Firebase Firestore:", e);
  }
}

window.FIREBASE = {
  config: firebaseConfig,
  ready: !!db,
  db: db,
};
