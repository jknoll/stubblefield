// Authentication Manager using Firebase Auth
// NOTE: Firebase config needs to be set up for production use
// See: https://firebase.google.com/docs/web/setup

export class AuthManager {
  constructor() {
    this.user = null;
    this.onAuthStateChanged = null;
    this.firebaseConfig = null;
    this.initialized = false;
  }

  /**
   * Initialize Firebase Auth
   * @param {Object} config - Firebase configuration object
   */
  async initialize(config) {
    if (this.initialized) return true;

    // Check if Firebase is available
    if (typeof firebase === 'undefined') {
      console.warn('Firebase SDK not loaded. Auth features disabled.');
      console.log('To enable auth, add Firebase SDK to index.html:');
      console.log('<script src="https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js"></script>');
      console.log('<script src="https://www.gstatic.com/firebasejs/10.7.0/firebase-auth-compat.js"></script>');
      return false;
    }

    if (!config || !config.apiKey) {
      console.warn('Firebase config not provided. Auth features disabled.');
      console.log('To enable auth, create a Firebase project and add config.');
      return false;
    }

    try {
      // Initialize Firebase
      if (!firebase.apps.length) {
        firebase.initializeApp(config);
      }

      // Listen for auth state changes
      firebase.auth().onAuthStateChanged((user) => {
        this.user = user;
        if (this.onAuthStateChanged) {
          this.onAuthStateChanged(user);
        }
        if (user) {
          console.log('User signed in:', user.displayName || user.email);
        } else {
          console.log('User signed out');
        }
      });

      this.initialized = true;
      console.log('Firebase Auth initialized');
      return true;
    } catch (error) {
      console.error('Failed to initialize Firebase Auth:', error);
      return false;
    }
  }

  /**
   * Sign in with Google popup
   */
  async signInWithGoogle() {
    if (!this.initialized) {
      console.warn('Auth not initialized');
      return null;
    }

    try {
      const provider = new firebase.auth.GoogleAuthProvider();
      const result = await firebase.auth().signInWithPopup(provider);
      return result.user;
    } catch (error) {
      console.error('Google sign-in failed:', error);
      throw error;
    }
  }

  /**
   * Sign out the current user
   */
  async signOut() {
    if (!this.initialized) {
      console.warn('Auth not initialized');
      return;
    }

    try {
      await firebase.auth().signOut();
    } catch (error) {
      console.error('Sign out failed:', error);
      throw error;
    }
  }

  /**
   * Get the current user
   * @returns {Object|null}
   */
  getCurrentUser() {
    return this.user;
  }

  /**
   * Check if a user is signed in
   * @returns {boolean}
   */
  isSignedIn() {
    return this.user !== null;
  }

  /**
   * Get user ID for storage purposes
   * @returns {string|null}
   */
  getUserId() {
    return this.user ? this.user.uid : null;
  }

  /**
   * Get user display name
   * @returns {string}
   */
  getDisplayName() {
    if (!this.user) return 'Guest';
    return this.user.displayName || this.user.email || 'User';
  }

  /**
   * Get user photo URL
   * @returns {string|null}
   */
  getPhotoURL() {
    return this.user ? this.user.photoURL : null;
  }

  /**
   * Register a callback for auth state changes
   * @param {Function} callback - Function(user)
   */
  registerAuthStateCallback(callback) {
    this.onAuthStateChanged = callback;
    // Call immediately with current state
    if (callback) {
      callback(this.user);
    }
  }
}

// Export singleton instance
export const authManager = new AuthManager();
