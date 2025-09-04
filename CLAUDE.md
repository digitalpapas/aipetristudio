# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Deep Scope AI** - React/TypeScript research analysis platform with Supabase backend. AI-powered document analysis with dashboard interface for managing research workflows.

## Development Commands

```bash
# Development
npm run dev          # Start dev server (localhost:8080)
npm run build        # Production build
npm run build:dev    # Development build
npm run preview      # Preview production build

# Code Quality
npm run lint         # ESLint with TypeScript rules
npx tsc --noEmit     # TypeScript type checking
```

## Architecture Overview

### Tech Stack
- **React 18.3** + **TypeScript 5.8** + **Vite 5.4**
- **shadcn/ui** + **Radix UI** + **Tailwind CSS**
- **Supabase** (auth/database) + **TanStack Query**
- **React Router 6.30** + **React Hook Form**

### Application Flow
```
main.tsx → App.tsx → AuthProvider → BrowserRouter → Routes
├── Public routes: /, /login, /register, /pricing
└── Protected routes: /dashboard/* (wrapped in ProtectedRoute)
```

### Key Directories
- `src/contexts/` - React contexts (AuthContext for Supabase auth)
- `src/lib/` - Business logic and utilities (supabase.ts, openai-assistant.ts)
- `src/components/dashboard/` - Dashboard-specific components
- `src/pages/dashboard/` - Research workflow pages
- `src/components/ui/` - shadcn/ui component library

## Supabase Integration

### Configuration
- **Client**: `src/lib/supabase.ts` (uses VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY)
- **Auth**: `src/contexts/AuthContext.tsx` (signIn, signUp, Google OAuth)
- **MCP**: `.mcp.json` configured for database access
- **Test route**: `/test-supabase` for connection verification

### Environment Setup
```bash
# Copy example and fill with your Supabase credentials
cp .env.example .env
```

## Research Workflow Architecture

### Core Flow
1. **ResearchNew** - File upload and analysis initiation
2. **ResearchResult** - Display analysis results and segments  
3. **ResearchSegment** - Detailed segment analysis with bookmarks
4. **Diagnostics** - System health monitoring

### AI Integration
- OpenAI Assistant API integration in `src/lib/openai-assistant.ts`
- File conversion via CloudConvert in `src/lib/cloudconvert.ts`
- Research diagnostics in `src/lib/research-diagnostics.ts`

## Code Conventions

### TypeScript
- Strict mode enabled
- Interface over type aliases
- Explicit return types for complex functions
- Import type syntax for type-only imports

### Component Structure
- PascalCase for components and interfaces
- camelCase for functions and variables
- Functional components with hooks
- Context providers for shared state

### UI Patterns
- shadcn/ui components with Tailwind classes
- CSS variables for theming (HSL color system)
- Responsive design with mobile-first approach
- Custom animations via Tailwind config

## Task Completion Requirements

1. **Lint check**: `npm run lint` must pass
2. **Type check**: `npx tsc --noEmit` must pass  
3. **Build test**: `npm run build` must succeed
4. **Supabase connection**: Verify with `/test-supabase` route when making auth changes