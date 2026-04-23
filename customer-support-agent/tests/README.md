# Tests

## Struktur

- `tests/unit/` — unit test untuk utilitas di `app/lib/`. Cepat, no IO.
- `tests/integration/` — test yang memakai helper dengan mock Prisma/SDK. (belum diisi)

## Menjalankan

```bash
npm run test        # watch mode
npm run test:run    # single pass
npm run test:ci     # single pass + coverage
```

Coverage target modul kritis (`app/lib/*`, auth & payment routes): 60%.

## Pola

- Mock modul eksternal (prisma, anthropic SDK, error-monitor, logger) di baris pertama dengan `vi.mock(...)` SEBELUM import modul yang diuji.
- Import helper via alias `@/` sesuai `tsconfig.json`.
