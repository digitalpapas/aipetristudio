# Task Completion Checklist

## Before Committing Code
1. **Run lint**: `npm run lint` - ESLint with TypeScript rules
2. **Type check**: `npx tsc --noEmit` - TypeScript type checking
3. **Build test**: `npm run build` - Ensure production build works

## Development Workflow
- **Environment**: Copy `.env.example` to `.env` with Supabase credentials
- **Hot reload**: Development server auto-reloads on file changes
- **Component testing**: Use `/test-supabase` route for connection testing

## Supabase Integration Requirements
- **Environment vars**: VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY required
- **MCP setup**: Configure `.mcp.json` with project ref and access token
- **Auth flow**: All auth operations go through AuthContext

## Code Quality Standards
- TypeScript strict mode enabled
- ESLint with React hooks and refresh plugins
- Unused variables warnings disabled (@typescript-eslint/no-unused-vars: off)
- React component export validation enabled