Smart Campus Operations Hub — Spring Boot REST API + React (Vite).

## Layout

- **`backend/`** — Spring Boot app (`pom.xml`, `mvnw.cmd`). Run commands from this folder.
- **`frontend/`** — React client. Run commands from this folder.

## Run locally

1. Start **MongoDB** on `localhost:27017` (or change `backend/src/main/resources/application.properties`).
2. **API** (PowerShell):

   ```powershell
   cd "c:\Users\indut\Desktop\PAFProject\backend"
   .\mvnw.cmd spring-boot:run
   ```

3. **UI** (second terminal):

   ```powershell
   cd "c:\Users\indut\Desktop\PAFProject\frontend"
   npm install
   npm run dev
   ```

   Open the URL Vite prints (usually `http://localhost:5173`).

## Optional cleanup

If an empty folder `Smart-Campus-Operations-Hub-` remains with only `backend/smartcampus/target` inside, close IDEs/terminals using it and delete that folder manually.
