# API Plan: Delhi Metro Ticketing System

> This plan includes your original requirements and adds new modules for **Smart Card Management** and **System Administration** to create a more robust and complete application.

---

## 1. 🔑 Auth Module (User Identity)

Handles user registration, login, and profile management.

* **[IMPLEMENTED]** `POST /api/auth/signup`
    * **Body:** `{ "name": "...", "email": "...", "password": "...", "phone": "..." }`
    * **Action:** Creates a new user. ⚠️ Note: Currently auto-creates smart card with ₹100 balance (to be changed).
    * **Returns:** `{ "token": "...", "user": { ... } }`

* **[IMPLEMENTED]** `POST /api/auth/login`
    * **Body:** `{ "email": "...", "password": "..." }`
    * **Action:** Verifies credentials and issues a JWT.
    * **Returns:** `{ "token": "...", "user": { ... } }`

* **[IMPLEMENTED]** `GET /api/auth/me`
    * **Headers:** `Authorization: Bearer <token>`
    * **Action:** Gets the profile of the currently logged-in user (including their linked smart card, if any).
    * **Returns:** `{ "user": { ..., "smartCard": { ... } } }`

---

## 2. 🚉 Stations & Fares Module (Public Info)

Provides public information about the metro system.

* **[IMPLEMENTED]** `GET /api/stations`
    * **Action:** Fetches all available stations to populate "From" and "To" dropdowns.
    * **Returns:** `[{ "id": "...", "name": "...", "code": "...", "location": "...", "isOperational": true }, ...]`

* **[IMPLEMENTED]** `GET /api/stations/fares`
    * **Query Params:** `?fromStationId=...&toStationId=...`
    * **Action:** Calculates and returns the fare for a specific route using stored procedure.
    * **Returns:** `{ "from": { "id": "...", "name": "...", "code": "..." }, "to": { ... }, "fare": 50.00 }`

---

## 3. 🎟️ Ticketing Module (User Actions)

Handles the booking and retrieval of QR tickets.

* **[IMPLEMENTED]** `POST /api/tickets/book`
    * **Headers:** `Authorization: Bearer <token>`
    * **Body:** `{ "fromStationId": "...", "toStationId": "...", "paymentMethod": "UPI|Credit Card|Debit Card|Net Banking|Wallet" }`
    * **Action:** (Simulates payment) Creates a new QR ticket in the database using stored procedure, links it to the user, and marks it as active.
    * **Returns:** `{ "ticketId": "...", "qrCodeData": "...", "from": { ... }, "to": { ... }, "fare": 50.00, "validFrom": "...", "validUntil": "..." }`

* **[IMPLEMENTED]** `GET /api/tickets/history`
    * **Headers:** `Authorization: Bearer <token>`
    * **Action:** Fetches a combined list of the user's past QR ticket bookings *and* their smart card journey history.
    * **Returns:** `[{ "type": "TICKET", "from": "...", "to": "...", "date": "..." }, { "type": "CARD_JOURNEY", "from": "...", "to": "...", "fare": 30.00, "date": "..." }]`

---

## 4. 💳 Smart Card Module (User Actions)

Manages a user's persistent smart card.

* **[IMPLEMENTED]** `POST /api/cards/register`
    * **Headers:** `Authorization: Bearer <token>`
    * **Body:** `{ "paymentMethod": "UPI|Credit Card|Debit Card|Net Banking|Wallet" }`
    * **Action:** Registers a smart card for the user's account. Charges a registration fee (₹50) and initializes balance at ₹0.
    * **Returns:** `{ "card": { "cardId": "...", "balance": 0.00, "registrationFee": 50.00 } }`

* **[IMPLEMENTED]** `POST /api/cards/recharge`
    * **Headers:** `Authorization: Bearer <token>`
    * **Body:** `{ "amount": 500.00, "paymentMethod": "UPI|Credit Card|Debit Card|Net Banking|Wallet" }`
    * **Action:** (Simulates payment) Adds the specified amount to the user's linked smart card balance using stored procedure.
    * **Returns:** `{ "newBalance": 600.00, "transactionId": "...", "rechargeId": "..." }`

* **[IMPLEMENTED]** `GET /api/cards/balance`
    * **Headers:** `Authorization: Bearer <token>`
    * **Action:** Checks the current balance of the user's smart card.
    * **Returns:** `{ "cardId": "...", "balance": 600.00, "isActive": true, "issuedAt": "...", "lastUsedAt": "..." }`

* **[IMPLEMENTED]** `GET /api/cards`
    * **Headers:** `Authorization: Bearer <token>`
    * **Action:** Gets detailed card information including recent recharge history.
    * **Returns:** `{ "card": { "cardId": "...", "balance": 600.00, ... }, "recentRecharges": [...] }`

---

## 5. 🛂 Journey Validation Module (Scanner Terminals)

These are the endpoints used by the station gates.

* **[IMPLEMENTED]** `POST /api/journey/entry`
    * **Body:** `{ "mediaId": "...", "mediaType": "Ticket" or "Card", "stationId": "..." }`
    * **Action:**
        1.  Validates the station exists and is operational.
        2.  For **Ticket:** Checks if it's not used and validates entry station matches booking.
        3.  For **Card:** Checks if card exists, is active, and has minimum balance (₹10).
        4.  Calls stored procedure to start journey and logs entry point.
    * **Returns:** `{ "success": true, "message": "Entry permitted", "journeyId": "...", "mediaType": "...", "station": "..." }`

* **[IMPLEMENTED]** `POST /api/journey/exit`
    * **Body:** `{ "mediaId": "...", "mediaType": "Ticket" or "Card", "stationId": "..." }`
    * **Action:**
        1.  Retrieves the active journey for the media.
        2.  Validates station exists and is operational.
        3.  Calculates `actualFare = fare(entryStation, exitStation)`.
        4.  For **Ticket:** Validates fare and marks journey complete.
        5.  For **Card:** Deducts fare from balance and marks journey complete.
        6.  Uses stored procedure for transaction management.
    * **Returns:** `{ "success": true, "message": "Exit permitted", "fareCharged": 30.00, "newBalance": 570.00 (for card) }`
---

## 6. ⚙️ Admin Module (System Management)

Protected endpoints for managing the metro system itself. (Requires an `admin` user role).

* **[TO IMPLEMENT]** `POST /api/admin/stations`
    * **Headers:** `Authorization: Bearer <token>` (admin role required)
    * **Body:** `{ "name": "New Station Name", "code": "NST", "location": "Sector 18, Noida" }`
    * **Action:** Adds a new station to the `station` table.
    * **Returns:** `{ "success": true, "station": { "id": "...", "name": "...", "code": "...", "location": "..." } }`

* **[TO IMPLEMENT]** `PUT /api/admin/stations/:id`
    * **Headers:** `Authorization: Bearer <token>` (admin role required)
    * **Body:** `{ "name": "...", "code": "...", "location": "...", "isOperational": true }`
    * **Action:** Updates an existing station's details.
    * **Returns:** `{ "success": true, "station": { ... } }`

* **[TO IMPLEMENT]** `POST /api/admin/fares`
    * **Headers:** `Authorization: Bearer <token>` (admin role required)
    * **Body:** `{ "fromStationId": "...", "toStationId": "...", "fare": 60.00 }`
    * **Action:** Updates or inserts a new fare into the `fare` table.
    * **Returns:** `{ "success": true, "fare": { "from": "...", "to": "...", "fare": 60.00 } }`

* **[TO IMPLEMENT]** `GET /api/admin/users`
    * **Headers:** `Authorization: Bearer <token>` (admin role required)
    * **Query Params:** `?page=1&limit=50&search=...`
    * **Action:** Retrieves a paginated list of all registered users with their card status.
    * **Returns:** `{ "users": [...], "pagination": { "total": 100, "page": 1, "pages": 2 } }`

* **[TO IMPLEMENT]** `GET /api/admin/journeys`
    * **Headers:** `Authorization: Bearer <token>` (admin role required)
    * **Query Params:** `?page=1&limit=50&date=2025-11-05&status=Active|Completed`
    * **Action:** Retrieves a paginated log of all journeys (from both tickets and cards).
    * **Returns:** `{ "journeys": [...], "pagination": { "total": 500, "page": 1, "pages": 10 } }`

* **[TO IMPLEMENT]** `GET /api/admin/statistics`
    * **Headers:** `Authorization: Bearer <token>` (admin role required)
    * **Action:** Retrieves system-wide statistics (total users, active journeys, revenue, etc.).
    * **Returns:** `{ "totalUsers": 1000, "activeJourneys": 50, "totalRevenue": 500000.00, "todayBookings": 200 }`

---

## 7. 📡 Live Logging Module (Real-Time Event Streaming)

Provides real-time database event logs to a dashboard via WebSocket.

* **[IMPLEMENTED]** `WS /api/logs/subscribe`
    * **Protocol:** WebSocket
    * **Query Params:** `?token=<jwt_token>`
    * **Action:** The client connects to this endpoint. The backend server (using Node.js EventEmitter) pushes JSON payloads for new events in real-time whenever any significant action occurs in the system.
    * **Connection:** `ws://localhost:3000/api/logs/subscribe?token=<jwt_token>`
    * **Events Pushed:**
        * `{ "event": "NEW_USER", "timestamp": "...", "data": { "userId": "...", "name": "...", "email": "..." } }` - When a new user registers
        * `{ "event": "TICKET_BOOKED", "timestamp": "...", "data": { "ticketId": "...", "userId": "...", "from": "...", "to": "...", "fare": 50.00 } }` - When a ticket is booked
        * `{ "event": "CARD_REGISTERED", "timestamp": "...", "data": { "cardId": "...", "userId": "...", "fee": 50.00 } }` - When a smart card is registered
        * `{ "event": "CARD_RECHARGED", "timestamp": "...", "data": { "cardId": "...", "amount": 500.00, "newBalance": 600.00 } }` - When a card is recharged
        * `{ "event": "JOURNEY_ENTRY", "timestamp": "...", "data": { "journeyId": "...", "mediaType": "Ticket|Card", "mediaId": "...", "station": "...", "stationName": "..." } }` - When entry is scanned
        * `{ "event": "JOURNEY_EXIT", "timestamp": "...", "data": { "journeyId": "...", "mediaType": "Ticket|Card", "mediaId": "...", "station": "...", "fareCharged": 30.00 } }` - When exit is scanned

* **[IMPLEMENTED]** `POST /api/test/start-simulator` (Development Only)
    * **Action:** Starts an event simulator that generates random events every few seconds for testing the WebSocket live logging functionality.
    * **Environment:** Only available in development mode (not production).
    * **Returns:** `{ "success": true, "message": "Event simulator started" }`