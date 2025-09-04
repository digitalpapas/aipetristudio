# Code Style & Conventions

## File Structure
- **Pages**: `src/pages/` - Route components (Index.tsx, auth/, dashboard/)
- **Components**: `src/components/` organized by domain (ui/, auth/, dashboard/, marketing/)
- **Contexts**: `src/contexts/` - React contexts (AuthContext.tsx)
- **Libraries**: `src/lib/` - Business logic and utilities
- **Hooks**: `src/hooks/` - Custom React hooks

## Naming Conventions
- **Components**: PascalCase (AuthProvider, SupabaseTest)
- **Files**: PascalCase for components, kebab-case for configs
- **Functions**: camelCase (signInWithEmail, resetPassword)
- **Types**: PascalCase interfaces (AuthContextType)

## TypeScript Style
- Strict TypeScript configuration
- Interface over type aliases
- Explicit return types for complex functions
- Import type syntax for type-only imports

## UI Patterns
- shadcn/ui component library with Radix UI
- Tailwind CSS with custom design tokens
- CSS variables for theming (HSL color system)
- Custom animations and keyframes