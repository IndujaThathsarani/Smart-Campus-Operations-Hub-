Smart Campus Operations Hub — Spring Boot REST API + React (Vite).

## Layout

- **`backend/`** — Spring Boot app (`pom.xml`, `mvnw.cmd`). Run commands from this folder.
- **`frontend/`** — React client. Run commands from this folder.

## Run locally

1. **MongoDB**
   - **Atlas:** set **`SPRING_MONGODB_URI`** (Spring Boot 4) to your full SRV string **including** `/SmartCampus` before the `?`. Example (PowerShell, same window as `mvnw`):
     ```powershell
     $env:SPRING_MONGODB_URI = "mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/SmartCampus?retryWrites=true&w=majority&appName=Cluster0"
     ```
     **`SPRING_DATA_MONGODB_URI`** still works if you prefer the old name (the app maps it). Or copy **`backend/run-atlas.ps1.example`** to **`run-atlas.ps1`**, edit the URI, then run **`.\run-atlas.ps1`** from `backend/` (`run-atlas.ps1` is gitignored so passwords are not committed).
   - **Why env var:** `application-local.properties` is easy to miss on the classpath (gitignored / IDE). **`SPRING_MONGODB_URI`** is picked up by Spring Boot. Connection settings use **`spring.mongodb.*`** in Boot 4 (not `spring.data.mongodb.uri` for the client).
   - On startup, logs should show **`MongoDB active database: [SmartCampus]`** and driver hosts should be your **Atlas** host, not **`localhost:27017`**.
   - **Local MongoDB only:** do **not** set `SPRING_MONGODB_URI` or `SPRING_DATA_MONGODB_URI`; the default `mongodb://localhost:27017/SmartCampus` in `application.properties` is used.
   - In Atlas: **Network Access** → allow your IP; **Database Access** → user with read/write.

2. **API** (PowerShell):

   ```powershell
   cd "c:\Users\indut\Desktop\PAFProject\backend"
   .\mvnw.cmd spring-boot:run
   ```

   The API listens on **`server.port`** in `application.properties` (currently **8081**). The React app uses the same host/port by default via `frontend/src/services/apiClient.js`. If you change the backend port, set **`VITE_API_BASE_URL`** (e.g. in `frontend/.env.local`) to match, then restart `npm run dev`.

3. **UI** (second terminal):

   ```powershell
   cd "c:\Users\indut\Desktop\PAFProject\frontend"
   npm install
   npm run dev
   ```

   Open the URL Vite prints (usually `http://localhost:5173`).

## Port 8080 already in use

Spring Boot failed to start because something else is listening on **8080** (often a previous `spring-boot:run` you did not stop, or another tool).

**Option A — free the port (recommended)**

In PowerShell (as Administrator if `taskkill` is denied):

```powershell
netstat -ano | findstr :8080
```

Note the **PID** in the last column for the line with `LISTENING`, then:

```powershell
taskkill /PID <PID> /F
```

Start the backend again.

**Option B — use another port**

Run the API on **8081** (example):

```powershell
cd "c:\Users\indut\Desktop\PAFProject\backend"
.\mvnw.cmd spring-boot:run -Dspring-boot.run.arguments="--server.port=8081"
```

Create `frontend/.env.local` with:

```
VITE_API_BASE_URL=http://localhost:8081
```

Restart `npm run dev` so Vite picks up the env file.

## Optional cleanup

If an empty folder `Smart-Campus-Operations-Hub-` remains with only `backend/smartcampus/target` inside, close IDEs/terminals using it and delete that folder manually.
