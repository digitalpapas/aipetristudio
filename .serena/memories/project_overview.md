# Deep Scope AI - Project Overview

## Purpose
React/TypeScript application for AI-powered research and analysis platform. Uses Supabase backend with authentication, dashboard interface, and research workflow features.

## Tech Stack
- **Frontend**: React 18.3.1, TypeScript 5.8.3
- **Build Tool**: Vite 5.4.19 with SWC
- **UI Framework**: shadcn/ui + Radix UI components
- **Styling**: Tailwind CSS 3.4.17 with custom design system
- **Backend**: Supabase (auth, database, storage)
- **State Management**: @tanstack/react-query 5.83.0
- **Routing**: react-router-dom 6.30.1
- **Forms**: react-hook-form 7.61.1 + hookform/resolvers
- **AI Integration**: OpenAI Assistant API

## Architecture Pattern
- **Context-based auth**: AuthProvider wraps entire app
- **Protected routes**: Dashboard requires authentication
- **Component-driven**: shadcn/ui design system
- **Service layer**: lib/ contains business logic utilities
- **Page-based routing**: Separate auth and dashboard sections