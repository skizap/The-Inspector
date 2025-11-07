# Semver Range Resolution Fix

## Problem
Direct dependencies could be sent to OSV as semver ranges (e.g., `^1.0.0`, `~2.3.4`) instead of exact versions when their depth-1 fetch failed in `fetchTransitiveDependencies()`. This caused OSV to fail to match vulnerabilities since it expects exact versions like `package@1.0.0`.

## Root Cause
In `inspector.js`, the normalization logic looked up direct dependencies in `transitiveDepsMap` at depth 1. If a fetch failed for that dependency, there was no entry in the map, and the original fallback still allowed semver ranges to reach OSV.

## Solution
Implemented a three-tier resolution strategy with guaranteed exact-version output:

1. **Primary**: Look up resolved version in `transitiveDepsMap` (depth 1) - fast path when transitive fetch succeeds
2. **Fallback 1**: Call `resolveVersionFromRange()` to fetch package metadata and resolve the semver range to an exact version
3. **Fallback 2**: Call `fetchPackageData()` to get the latest version as an exact version
4. **Skip**: If all resolution attempts fail, skip the dependency entirely (do not include in OSV request)

## Changes Made

### 1. New Function in `src/api/npm.js`
Added `resolveVersionFromRange(packageName, range, timeout)`:
- Fetches package metadata to get available versions
- Uses `_resolveSemverRange()` to match the range to an exact version
- Falls back to `latest` if resolution fails
- Returns exact version string (e.g., `4.17.21`)
- Throws error if metadata cannot be obtained

### 2. Updated `src/utils/inspector.js`
Modified direct dependency normalization logic with strict exact-version guarantee:
- Changed from `forEach` to `for...of` loop to support async operations
- When a direct dep is not in `transitiveDepsMap`:
  1. First attempts `resolveVersionFromRange()` to resolve the semver range
  2. If that fails, attempts `fetchPackageData()` to get latest version
  3. If both fail, skips the dependency entirely (uses `continue` to not add to `normalizedDirectDeps`)
- Comprehensive logging at each resolution stage
- **Never** passes semver ranges to OSV - only exact versions or skip

## Validation

### Test Results
Created and ran test script that verified:
- `lodash@^4.17.0` → `4.17.21` ✓
- `react@~18.0.0` → `18.0.0` ✓
- `axios@>=1.0.0` → `1.13.2` ✓

All ranges correctly resolved to exact versions with no semver operators.

### Behavior Guarantees
- ✓ **All dependencies sent to OSV are exact versions (no ranges)** - GUARANTEED
- ✓ Maintains error tolerance (doesn't fail entire analysis if some fetches fail)
- ✓ Dependencies that cannot be resolved to exact versions are skipped from OSV check
- ✓ Root package still excluded from dependency list
- ✓ Depth limit (3) and cycle detection remain intact
- ✓ Logs clearly indicate resolution path and any skipped dependencies

## Edge Cases Handled
1. **Transitive fetch succeeds**: Uses cached result from `transitiveDepsMap` (no extra API calls)
2. **Transitive fetch fails, metadata available**: Calls `resolveVersionFromRange()` to get exact version
3. **Metadata resolution fails**: Falls back to `fetchPackageData()` to get latest version
4. **All resolution attempts fail**: Skips dependency from OSV check (logs warning) - **never passes range to OSV**

## Performance Impact
- Minimal: Only makes additional API calls when transitive fetch fails
- Metadata requests are cached (1-hour TTL)
- Concurrent fetch limit (10) prevents overwhelming npm registry

## Implementation Flow

```
Direct Dependency Normalization:
┌─────────────────────────────────────────────────────────────┐
│ For each direct dependency:                                  │
│                                                               │
│ 1. Check transitiveDepsMap (depth === 1)                    │
│    ├─ Found? → Use exact version ✓                          │
│    └─ Not found? → Continue to step 2                       │
│                                                               │
│ 2. Try resolveVersionFromRange(name, range)                 │
│    ├─ Success? → Use resolved exact version ✓               │
│    └─ Failed? → Continue to step 3                          │
│                                                               │
│ 3. Try fetchPackageData(name) for latest                    │
│    ├─ Success? → Use latest exact version ✓                 │
│    └─ Failed? → Continue to step 4                          │
│                                                               │
│ 4. Skip dependency entirely (do not add to OSV payload)     │
│    └─ Log warning about skipped dependency                  │
│                                                               │
│ Result: normalizedDirectDeps contains ONLY exact versions   │
└─────────────────────────────────────────────────────────────┘

OSV Payload Construction:
┌─────────────────────────────────────────────────────────────┐
│ allDependencies = {                                          │
│   ...normalizedDirectDeps,  // Only exact versions          │
│   ...transitiveDependencies // Only exact versions          │
│ }                                                            │
│                                                               │
│ OSV receives: { package: "name", version: "1.2.3" }         │
│ Never receives: { package: "name", version: "^1.2.0" }      │
└─────────────────────────────────────────────────────────────┘
```

## Compliance
- ✓ Follows api-standards.md (timeout, retry, error handling)
- ✓ Follows code-conventions.md (JSDoc, naming, error handling)
- ✓ Follows security-policies.md (input validation, HTTPS)
- ✓ No breaking changes to existing API
- ✓ Maintains backward compatibility with existing reports
