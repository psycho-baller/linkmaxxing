# React Starter Kit

A modern, production-ready SaaS starter template for building full-stack React applications using React Router, Convex, and Polar.sh for subscriptions.

![CodeRabbit Pull Request Reviews](https://img.shields.io/coderabbit/prs/github/michaelshimeles/react-convex-starter?utm_source=oss&utm_medium=github&utm_campaign=michaelshimeles%2Freact-convex-starter&labelColor=171717&color=FF570A&link=https%3A%2F%2Fcoderabbit.ai&label=CodeRabbit+Reviews)

## Features

- 🚀 Server-side rendering
- ⚡️ Hot Module Replacement (HMR)
- 📦 Asset bundling and optimization
- 🔄 Data loading and mutations
- 🔒 TypeScript by default
- 🎉 TailwindCSS for styling
- 🔐 Authentication with Clerk
- 💳 Subscription management with Polar.sh
- 🗄️ Real-time database with Convex
- 📊 Dashboard with subscription status
- 🎯 Webhook handling for payment events
- 📖 [React Router docs](https://reactrouter.com/)

## Getting Started

### Prerequisites

- Node.js 18+ 
- Clerk account for authentication
- Convex account for database
- Polar.sh account for subscriptions

### Installation

1. Clone the repository and install dependencies:

```bash
npm install
```

2. Copy the environment file and configure your credentials:

```bash
cp .env.example .env.local
```

3. Set up your environment variables in `.env.local`:

```bash
# Convex Configuration
CONVEX_DEPLOYMENT=your_convex_deployment_here
VITE_CONVEX_URL=your_convex_url_here

# Clerk Authentication
VITE_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key_here
CLERK_SECRET_KEY=your_clerk_secret_key_here

# Polar.sh Configuration
POLAR_ACCESS_TOKEN=your_polar_access_token_here
POLAR_ORGANIZATION_ID=your_polar_organization_id_here
POLAR_WEBHOOK_SECRET=your_polar_webhook_secret_here

# Frontend URL for redirects
FRONTEND_URL=http://localhost:5173
```

4. Initialize Convex:

```bash
npx convex dev
```

5. Set up your Polar.sh webhook endpoint:
   - URL: `{your_domain}/webhook/polar`
   - Events: All subscription events

### Development

Start the development server with HMR:

```bash
npm run dev
```

Your application will be available at `http://localhost:5173`.

## Building for Production

Create a production build:

```bash
npm run build
```

## Deployment

### Docker Deployment

To build and run using Docker:

```bash
docker build -t my-app .

# Run the container
docker run -p 3000:3000 my-app
```

The containerized application can be deployed to any platform that supports Docker, including:

- AWS ECS
- Google Cloud Run
- Azure Container Apps
- Digital Ocean App Platform
- Fly.io
- Railway

### DIY Deployment

If you're familiar with deploying Node applications, the built-in app server is production-ready.

Make sure to deploy the output of `npm run build`

```
├── package.json
├── package-lock.json (or pnpm-lock.yaml, or bun.lockb)
├── build/
│   ├── client/    # Static assets
│   └── server/    # Server-side code
```

## Architecture

### Frontend
- **React Router** - Modern React framework with file-based routing
- **TailwindCSS** - Utility-first CSS framework
- **shadcn/ui** - Modern component library

### Backend
- **Convex** - Real-time database and serverless functions
- **Clerk** - Authentication and user management
- **Polar.sh** - Subscription billing and payments

### Key Components

#### Subscription Integration
- Dynamic pricing cards fetched from Polar.sh
- Secure checkout flow with redirect handling
- Real-time subscription status updates
- Customer portal for subscription management
- Webhook handling for payment events

#### Dashboard
- Protected routes with authentication
- Subscription status display
- User profile management
- Real-time data updates

## API Routes

- `/pricing` - Dynamic pricing page with backend integration
- `/success` - Subscription success page
- `/dashboard` - Protected user dashboard
- `/webhook/polar` - Polar.sh webhook handler

## Deployment

### Environment Variables

Make sure to set all required environment variables in your production environment:

- `CONVEX_DEPLOYMENT` - Your Convex deployment URL
- `VITE_CONVEX_URL` - Your Convex client URL
- `VITE_CLERK_PUBLISHABLE_KEY` - Clerk publishable key
- `CLERK_SECRET_KEY` - Clerk secret key
- `POLAR_ACCESS_TOKEN` - Polar.sh API access token
- `POLAR_ORGANIZATION_ID` - Your Polar.sh organization ID
- `POLAR_WEBHOOK_SECRET` - Polar.sh webhook secret
- `FRONTEND_URL` - Your production frontend URL

### Docker Deployment

To build and run using Docker:

```bash
docker build -t my-app .

# Run the container
docker run -p 3000:3000 my-app
```

The containerized application can be deployed to any platform that supports Docker, including:

- AWS ECS
- Google Cloud Run
- Azure Container Apps
- Digital Ocean App Platform
- Fly.io
- Railway

### DIY Deployment

If you're familiar with deploying Node applications, the built-in app server is production-ready.

Make sure to deploy the output of `npm run build`

```
├── package.json
├── package-lock.json (or pnpm-lock.yaml, or bun.lockb)
├── build/
│   ├── client/    # Static assets
│   └── server/    # Server-side code
```

## Styling

This template comes with [Tailwind CSS](https://tailwindcss.com/) already configured for a simple default starting experience. You can use whatever CSS framework you prefer.

---

Built with ❤️ using React Router, Convex, and Polar.sh.
