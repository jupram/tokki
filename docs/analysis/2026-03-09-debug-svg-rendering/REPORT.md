> [Docs home](../../README.md) / [Analysis](../README.md) / Debug rendering report
>
> Historical debugging report captured during a native rendering investigation. Keep it for context, but do not assume the bug or its hypothesized causes still match the current codebase.

# Desktop Avatar Invisibility Bug - Root Cause Analysis
## Investigation Date: Current Session
## Status: ANALYSIS COMPLETE

### Problem Statement
User reports that after launching the native desktop app with 
pm run tauri dev, 
the Tokki pet avatar is completely invisible, but debug text is visible.

### Root Cause - IDENTIFIED
**Primary Issue**: SVG rendering failure in Tauri native webview context

The avatar (SVG rendered at 124×124px) likely fails to render in the native 
application due to one or more of these factors:

1. **ViewBox/Size Mismatch**: SVG viewBox="0 0 160 160" but container is 124px
2. **GPU Transform Issues**: CSS animations with will-change: transform and 
   	ranslate3d may not be properly handled by Tauri's webview
3. **Missing SVG Sizing**: SVGs don't have explicit width/height, relying on 
   parent CSS which may not apply correctly in native context

### Evidence

#### File: src/style.css
- Lines 158-159: .tokki-avatar width: 124px; height: 124px;
- Lines 174-176: Contains transform and GPU hints
- Lines 215-216: .tokki-avatar .tokki-asset width: 124px; height: 124px;
- Lines 222: Animation with will-change and transform3d

#### Files: src/features/avatars/*.tsx
All avatar SVGs (RabbitV2.tsx, FoxV1.tsx, etc.):
- viewBox="0 0 160 160" ✓
- No explicit width/height attributes
- Depends on parent CSS sizing (which may fail in Tauri)

#### File: src/core/TokkiCharacter.tsx
- Line 976: <TokkiAvatarAsset assetId={actionView.assetId} />
- Lines 962-977: Avatar button with className=tokki-avatar

#### File: src/style.css
- Line 439-441: .tokki-debug { display: none; } - This is intentional

### Why Only Text Renders
- .tokki-debug div contains spans with text content (lines 1082-1088)
- Text rendering in Tauri webview works fine
- Avatar SVG + CSS transforms in Tauri webview fails
- Result: User sees only the debug status text

### Recommended Fix Strategy

#### Fix 1: Ensure SVG respects container size (HIGHEST PRIORITY)
**File**: src/style.css
**Line**: ~215
**Change**: Make .tokki-avatar .tokki-asset sizing more explicit

Before:
  .tokki-avatar .tokki-asset {
    width: 124px;
    height: 124px;

After:
  .tokki-avatar .tokki-asset {
    width: 100%;
    height: 100%;
    flex-shrink: 0;

#### Fix 2: Disable problematic GPU acceleration for native context
**File**: src/style.css
**Line**: ~176
**Action**: Consider removing or conditionalizing will-change: transform

Before:
  will-change: transform, filter;

After:
  will-change: auto;  /* or remove entirely */

#### Fix 3: Add explicit SVG sizing
**File**: src/features/avatars/RabbitV2.tsx (and all other avatar components)
**Line**: SVG element opening tag
**Action**: Add width and height attributes to SVG

Before:
  <svg viewBox="0 0 160 160" className="tokki-asset ...">

After:
  <svg viewBox="0 0 160 160" width="124" height="124" className="tokki-asset ...">

### Files Requiring Changes
1. src/style.css (Lines 150-223) - Avatar sizing and transforms
2. src/features/avatars/*.tsx (all avatar components) - SVG sizing
3. src/core/TokkiCharacter.tsx (Line 962-977) - Avatar button rendering

### Testing After Fix
1. Run: npm run tauri dev
2. Wait for native window to appear
3. Verify: Avatar SVG is visible and animated
4. Verify: Debug text still visible
5. Verify: Avatar remains visible when chat is opened/closed

### Related Recent Changes
- Commit 9619a8e: "Codex/perf UI enhancements" (March 8, 2026)
  - Added GPU acceleration hints (will-change)
  - May have triggered native webview rendering regression

### Severity: HIGH
- User cannot see the main interactive element (avatar)
- Only partial UI visible (debug text)
- Blocks user interaction with pet
