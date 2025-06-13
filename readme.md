Chat API
A real-time chat API with group chat, typing indicators, and Android push notifications using FCM HTTP v1, built with Fastify, MongoDB, Cloudinary, and Redis.
Setup

Clone Repository:
git clone <repository-url>
cd chat-api


Install Dependencies:
npm install


Configure Environment Variables:Create a .env file with:
MONGO_URI=mongodb://localhost:27017/chat-app
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
JWT_SECRET=your_jwt_secret
PORT=3000
REDIS_URL=redis://localhost:6379
GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json


Set Up Firebase:

Download the service account JSON from Firebase Console > Project Settings > Service Accounts.
Save it as serviceAccountKey.json in the project root.
Enable "Firebase Cloud Messaging API (V1)" in Google Cloud Console.


Run Server:
node src/server.js



API Endpoints
Authentication

POST /api/auth/register
Body: { "username": "string", "email": "string", "password": "string" } (optional file: profilePicture)
Response: { token, user: { id, username, email, profilePicture } }


POST /api/auth/login
Body: { "email": "string", "password": "string" }
Response: { token, user: { id, username, email, profilePicture } }



Users

GET /api/users/:id
Headers: Authorization: Bearer <token>
Response: { id, username, email, profilePicture }


PUT /api/users/:id
Headers: Authorization: Bearer <token>
Body: { "username": "string", "email": "string" } (optional file: profilePicture)
Response: { id, username, email, profilePicture }



Chats

POST /api/chats
Headers: Authorization: Bearer <token>
Body: { "participantIds": ["userId1", "userId2"], "isGroup": boolean, "groupName": "string" }
Response: { id, participants, isGroup, groupName, createdAt }


PUT /api/chats/:chatId
Headers: Authorization: Bearer <token>
Body: { "groupName": "string", "participantIds": ["userId1", "userId2"] }
Response: { id, participants, isGroup, groupName, createdAt }


GET /api/chats/:userId
Headers: Authorization: Bearer <token>
Response: [{ id, participants, isGroup, groupName, createdAt }]



Messages

POST /api/messages
Headers: Authorization: Bearer <token>
Body: { "chatId": "string", "content": "string" } (optional file: media)
Response: { id, chatId, senderId, content, mediaUrl, createdAt }


GET /api/messages/:chatId?page=1&limit=20
Headers: Authorization: Bearer <token>
Response: [{ id, chatId, senderId, content, mediaUrl, createdAt }]



Push Notifications (Android)

POST /api/push/subscribe
Headers: Authorization: Bearer <token>
Body: { "fcmToken": "string" }
Response: { message: "FCM token saved" }



WebSocket

Connect: /ws?token=<JWT>
Join Chat: Send {"type":"join","chatId":"string"}
Typing Indicator: Send {"type":"typing","chatId":"string","isTyping":boolean}
Receive Messages: Messages are broadcasted as {"type":"message","message":{...}}
Receive Typing: Typing events are broadcasted as {"type":"typing","message":{chatId,userId,username,isTyping}}

Android Client Integration

Firebase Setup:

Add google-services.json to your Android app.
Add Firebase dependencies to build.gradle:apply plugin: 'com.google.gms.google-services'
dependencies {
    implementation platform('com.google.firebase:firebase-bom:33.11.0')
    implementation 'com.google.firebase:firebase-messaging-ktx'
}




Register FCM Token:

Use FirebaseMessaging.getInstance().getToken() to get the token.
Send it to POST /api/push/subscribe with the JWT.


Handle Notifications:

Implement FirebaseMessagingService to handle incoming notifications.
Use the chatId from the notification data to navigate to the chat.



Deployment

Render/Heroku:
Push code to a Git repository.
Deploy to Render or Heroku.
Set environment variables, including GOOGLE_APPLICATION_CREDENTIALS with the service account JSON content.


MongoDB: Use MongoDB Atlas.
Redis: Use Redis Labs or a local instance.
Cloudinary: Ensure API credentials are set.
FCM: Ensure the HTTP v1 API is enabled and the service account is configured.

