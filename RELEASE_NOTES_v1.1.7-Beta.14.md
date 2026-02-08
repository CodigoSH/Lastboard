# Release Notes: v1.1.7-Beta.14

## 🔧 Core Bootstrap Refinement
- **Entry Point Update (`index.ts`)**:
  - Enhanced detailed debug logging during bootstrap (`dbg` helper).
  - Strict user session isolation: Ensures `dashboardStore` is explicitly scoped to the authenticated user ID immediately after fetch.
  - Improved synchronization of user preferences (Language, Theme, Grid Columns) to prevent "flash of default content".
- **Stability**: Includes all previous mobile and storage fixes.
