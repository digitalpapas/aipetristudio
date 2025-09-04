# Architecture Structure

## Application Flow
1. **Entry Point**: `src/main.tsx` → `src/App.tsx`
2. **Auth Wrapper**: AuthProvider context wraps entire app
3. **Router**: BrowserRouter with protected/public route separation
4. **Layout**: DashboardLayout for authenticated pages

## Key Architectural Components

### Authentication System
- **Context**: `src/contexts/AuthContext.tsx` - Supabase auth management
- **Client**: `src/lib/supabase.ts` - Supabase client configuration
- **Routes**: Auth pages in `src/pages/auth/` (Login, Register, VerifyEmail)
- **Protection**: ProtectedRoute component guards dashboard

### Dashboard Architecture
- **Layout**: `src/pages/dashboard/Layout.tsx` - Main dashboard wrapper
- **Pages**: Research workflow (ResearchNew, ResearchResult, ResearchSegment)
- **Components**: Domain-specific components in `src/components/dashboard/`

### Research Workflow
- **New Research**: File upload and analysis initiation
- **Results**: Display analysis results and segments
- **Segments**: Detailed segment analysis with bookmarks
- **Diagnostics**: System health and performance monitoring

## External Services
- **Supabase**: Authentication, database, storage
- **OpenAI**: AI assistant integration for research analysis
- **CloudConvert**: File conversion services