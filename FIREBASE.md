# Firebase Authentication Setup

This guide explains how to enable Google OAuth login in GrooveLab using Firebase Authentication.

## Prerequisites

- A Google account
- Access to [Firebase Console](https://console.firebase.google.com/)

## Setup Steps

### 1. Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project"
3. Enter a project name (e.g., "GrooveLab")
4. Choose whether to enable Google Analytics (optional)
5. Click "Create project"

### 2. Enable Google Authentication

1. In your Firebase project, go to **Build > Authentication**
2. Click "Get started"
3. Go to the **Sign-in method** tab
4. Click on **Google** in the provider list
5. Toggle the **Enable** switch
6. Select a support email address
7. Click **Save**

### 3. Register Your Web App

1. In the Firebase Console, click the gear icon and select **Project settings**
2. Scroll down to "Your apps" section
3. Click the web icon (`</>`) to add a web app
4. Enter an app nickname (e.g., "GrooveLab Web")
5. Click **Register app**
6. Copy the Firebase configuration object shown

### 4. Add Firebase to GrooveLab

1. Open `index.html` in your editor

2. Find the commented Firebase SDK section (near line 214) and uncomment it:

```html
<script src="https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.7.0/firebase-auth-compat.js"></script>
<script>
  window.firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
  };
</script>
```

3. Replace the placeholder values with your actual Firebase config from step 3

### 5. Configure Authorized Domains

1. In Firebase Console, go to **Build > Authentication > Settings**
2. Under **Authorized domains**, add any domains where you'll host GrooveLab:
   - `localhost` (already included by default)
   - Your production domain (e.g., `your-app.vercel.app`)

## Testing

1. Start the local server: `node serve.js`
2. Open `http://localhost:8080` in your browser
3. You should see a "Sign In" button in the header
4. Click it to sign in with your Google account

## Troubleshooting

### Sign In button not appearing
- Ensure Firebase SDK scripts are uncommented
- Check browser console for errors
- Verify the Firebase config values are correct

### "Auth domain not authorized" error
- Add your domain to the authorized domains list in Firebase Console

### "Popup blocked" error
- Ensure popups are allowed for your domain
- Try clicking the Sign In button again (some browsers require user interaction)

## Security Notes

- Never commit your Firebase config to a public repository if your API key has restrictions
- For production, consider setting up App Check for additional security
- The API key in the config is safe to expose as Firebase security rules control access
