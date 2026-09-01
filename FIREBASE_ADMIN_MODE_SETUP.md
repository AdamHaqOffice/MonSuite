# MonSuite Admin Mode publishing setup

MonSuite V36 includes real admin publishing hooks. If Firebase and Firestore are configured, admin-added News, Downloads, and Firmware History are saved to Firestore and published for all users. If Firestore is not configured or blocked by rules, the app falls back to local browser staging.

## Collections used

- `monsuiteNews`
- `monsuiteDownloads`
- `monsuiteFirmwareHistory`

## Admin allowlist

Set this in Netlify environment variables:

```env
VITE_ADMIN_EMAILS=adamhaqoffice@gmail.com,second.admin@abatement.com
```

The signed-in user's Google email must be on that list to turn on Admin Mode in Settings.

## Suggested Firestore rules

Use rules appropriate for your company environment. A simple starting point is shown below. Replace the email list with approved admin accounts.

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function signedIn() {
      return request.auth != null;
    }

    function isAdmin() {
      return signedIn() && request.auth.token.email in [
        'adamhaqoffice@gmail.com'
      ];
    }

    match /monsuiteNews/{docId} {
      allow read: if signedIn();
      allow create, update, delete: if isAdmin();
    }

    match /monsuiteDownloads/{docId} {
      allow read: if signedIn();
      allow create, update, delete: if isAdmin();
    }

    match /monsuiteFirmwareHistory/{docId} {
      allow read: if signedIn();
      allow create, update, delete: if isAdmin();
    }
  }
}
```

## Publishing behavior

Admin forms include a "Publish to users" checkbox.

- Checked: visible to everyone who can access MonSuite.
- Unchecked: visible only while Admin Mode is on.

Admins can hide/publish or delete admin-added items from the page where they were created.
