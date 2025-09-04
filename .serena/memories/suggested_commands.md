# Suggested Commands

## Development
- `npm run dev` - Start development server (http://localhost:8080)
- `npm run build` - Production build
- `npm run build:dev` - Development build
- `npm run preview` - Preview production build

## Code Quality
- `npm run lint` - ESLint with TypeScript rules
- No test script configured (tests need setup)
- No format script (consider adding prettier)

## Supabase Integration
- Uses Supabase client in `src/lib/supabase.ts`
- MCP configuration in `.mcp.json` for database access
- Environment variables in `.env` (VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY)

## Build System
- Vite with React SWC plugin
- TypeScript strict mode
- Hot module replacement enabled
- Component tagging for development mode