# Task 4 — API Builder Work Record

## Files Created

### Specs API
- `src/app/api/specs/route.ts` — GET (list by novelId + category filter), POST (create)
- `src/app/api/specs/[id]/route.ts` — GET (with specDeltas), PUT (auto version bump), DELETE

### Proposals API
- `src/app/api/proposals/route.ts` — GET (list by novelId + status filter), POST (create)
- `src/app/api/proposals/[id]/route.ts` — GET (with specDeltas), PUT (enforced state machine), DELETE

### Snapshots API
- `src/app/api/snapshots/route.ts` — GET (list by novelId + type), POST (create)
- `src/app/api/snapshots/[id]/route.ts` — GET, DELETE

### Branches API
- `src/app/api/branches/route.ts` — GET (list by novelId + status), POST (create with validations)
- `src/app/api/branches/[id]/route.ts` — GET, PUT (enforced transitions), DELETE (main protected)

## Key Design Decisions

1. **Status State Machines**: Proposals use a strict transition map (draft→validated→in_progress→completed→archived). Branches use active→merged/abandoned. Invalid transitions return 400 with allowed options.

2. **Auto Version Bump**: Specs only bump version when content actually changes (compared to existing), preventing phantom bumps from no-op updates.

3. **Timestamp Management**: Proposals automatically set/unset `completedAt` and `archivedAt` based on status transitions.

4. **Input Validation**: Category, status, snapshotType all validated against allowed enums. NovelId and title required with trim.

5. **Safety Guards**: Main branch cannot be deleted. Duplicate active branch names per novel are rejected (409).

6. **JSON Fields**: Snapshots store `chapterContent`, `specSnapshot`, and `metadata` as strings (accept both string and object input, serialize consistently).

7. **Relational Includes**: Single-spec GET includes specDeltas with proposal references. Single-proposal GET includes specDeltas with spec references.

## Lint Status: ✅ Clean
