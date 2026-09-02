# Roadmap

- [x] Profile remaining slow backend queries; add targeted indexes / rewrites to keep CPU low
- [x] Mobile optimisation for /directory and /companies/a-z listings (narrower layout, faster scroll, instant-load caching like district pages)

- [x] Fix stalled OFAC SDN import (background worker + heartbeat + DB watchdog, 2026-09-01)
- [x] Replace request-bound OFAC import with bounded, database-checkpointed slices
