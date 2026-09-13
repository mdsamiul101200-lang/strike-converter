# SX CONVERTER

Production-oriented real file conversion service for PDF, HTML, APK, ZIP, DOCX and TXT.

## Run with Docker

```bash
docker compose up --build
```
Open `http://localhost:8080`.

## Run locally

Install Node.js 22 and the system engines used by the conversion service: Chromium, LibreOffice, Pandoc, Poppler, Gradle, JDK 17 and Android SDK/build-tools 35. Then:

```bash
npm install
node server/src/workers/worker.js &
npm start
```

## Notes

- Uploads are treated as untrusted data.
- ZIP/APK extraction rejects absolute paths and `..` traversal.
- Uploaded APKs are never installed or executed.
- HTML/ZIP to APK uses a generated Android WebView project and a real Gradle build.
- APK to HTML only succeeds when recoverable HTML/XHTML assets exist.
- Unsupported or semantically meaningless transformations fail instead of fabricating output.
- Job state is in-memory; for multi-instance deployments replace the job store with Redis/PostgreSQL and put workers behind a queue.
