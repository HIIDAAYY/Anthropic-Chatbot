# Automated Testing Report

**Generated**: 30/1/2026, 04.11.14

## Summary

- **Total Tests**: 6
- **Passed**: 1 ✅
- **Failed**: 5 ❌
- **Pass Rate**: 17%

> [!WARNING]
> ⚠️ **NEEDS IMPROVEMENT**: Pass rate below 80% threshold.

## Detailed Results

### Basic UI

| Test | Status | Notes | Screenshot |
|------|--------|-------|------------|
| Chat interface visible | ❌ | Missing input or button | [View](./screenshots/01-initial-page.png) |
| Can type and send message | ✅ | Sent: "Halo, apa saja treatment yang tersedia?" | - |
| Bot responds | ❌ | No response received | [View](./screenshots/02-first-response.png) |
| Message history visible | ❌ | History not visible | - |
| Suggested questions appear | ❌ | No suggestions visible | - |

### System

| Test | Status | Notes | Screenshot |
|------|--------|-------|------------|
| Testing execution | ❌ | Fatal error: page.waitForTimeout is not a function | - |

## Screenshots

All screenshots are available in the [`screenshots`](./screenshots/) directory.

## Recommendations

### Issues to Address

1. **[Basic UI] Chat interface visible**: Missing input or button
2. **[Basic UI] Bot responds**: No response received
3. **[Basic UI] Message history visible**: History not visible
4. **[Basic UI] Suggested questions appear**: No suggestions visible
5. **[System] Testing execution**: Fatal error: page.waitForTimeout is not a function
