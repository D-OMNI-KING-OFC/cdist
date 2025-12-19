# Collab Connect

## Overview

Collab Connect is a platform that connects brands with influencers for marketing campaigns. Brands can discover content creators by industry or niche, create advertising campaigns with social tasks, and manage payments. Influencers can find campaigns, submit content, and earn rewards. The platform supports multi-language localization (English, Korean, French) and features a modern glass-morphism UI design.

## Recent Changes (December 2025)

- Redesigned entire UI with glassy blue-black gradient theme
- Added glass-morphism effects with backdrop-filter blur
- Implemented animated hero backgrounds with radial gradients
- Updated color scheme: primary blue (#0b66ff), dark background (#030414)
- Added interactive hover effects and Framer Motion animations
- Made responsive design improvements for all screen sizes
- Fixed Supabase client to gracefully handle missing environment variables

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 19 with TypeScript, built using Vite 7
- **Styling**: Tailwind CSS 4 with CSS Modules for component-specific styles
- **Routing**: React Router DOM v7 for client-side navigation
- **Animations**: Framer Motion for UI animations and transitions
- **Internationalization**: i18next with react-i18next for multi-language support (EN/KO/FR)
- **PWA**: vite-plugin-pwa for Progressive Web App capabilities

### Application Structure
- **Landing Page**: Public-facing page with hero section, features, and video showcase
- **Authentication**: Email/password auth with role-based access (brand vs influencer)
- **Dashboards**: Separate dashboards for brands and influencers with different feature sets
  - Brand Dashboard: Campaign creation, submission review, influencer search, wallet
  - Influencer Dashboard: Active campaigns, submissions, earnings wallet, profile
- **Role Selection**: One-time role selection (brand or influencer) that locks after initial choice

### State Management
- Local React state with useState/useEffect hooks
- Session state managed through Supabase auth listeners
- No external state management library (Redux/Zustand)

### Visual CMS Integration
- Builder.io integration for visual page editing
- Custom component wrappers registered for Builder.io drag-and-drop

### Design Patterns
- Component-based architecture with modular CSS
- Custom hooks for intersection observers and reusable logic
- Centralized translation function `t(key, lang)` for i18n
- Mock client pattern for Supabase when environment variables are missing

## External Dependencies

### Backend & Database
- **Supabase**: Authentication, PostgreSQL database, and real-time subscriptions
  - Tables: `profiles` (user roles, platforms, industries), `ad_requests` (campaigns), `campaign_submissions`, `user_points`
  - Environment variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

### Third-Party APIs (Influencer Search)
- **YouTube Data API v3**: Channel search and statistics (requires API key)
- **RapidAPI Services**:
  - Twitter/X search (`twitter-x.p.rapidapi.com`)
  - TikTok search (`tiktok-api23.p.rapidapi.com`)
  - Facebook Pages (`facebook-scraper3.p.rapidapi.com`)
  - Instagram search (`instagram-social-api.p.rapidapi.com`)

### Visual CMS
- **Builder.io**: Visual page builder integration
  - Environment variable: `VITE_BUILDER_PUBLIC_API_KEY`

### Other Integrations
- **Firebase**: Included in dependencies (configuration not fully visible in codebase)
- **Lottie**: Animation player for loading states and decorative elements
- **Heroicons**: Icon library for UI elements

### Deployment
- GitHub Pages deployment configured via `gh-pages` package
- Base URL configured as relative (`./`) for static hosting compatibility