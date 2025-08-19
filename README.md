# Flatsby

**Manage your daily life with your flatmates.**

Flatsby is a collaborative shopping list and household management application designed for people living together. Whether you're sharing a flat, house, or just managing household tasks with others, Flatsby helps you stay organized and in sync.

## ✨ Features

### 🛒 **Collaborative Shopping Lists**

- Create and manage shared shopping lists with your flatmates
- Add items with categories for better organization
- Real-time synchronization across all devices
- Mark items as completed with contributor tracking
- Separate view for purchased vs. unpurchased items

### 👥 **Group Management**

- Create household groups for your flat or living situation
- Invite flatmates via secure authentication
- Role-based permissions for group management
- Profile management and settings

### 📱 **Cross-Platform Experience**

- Native mobile app (iOS & Android) built with React Native/Expo
- Progressive web application for desktop and mobile browsers
- Seamless synchronization across all platforms
- Optimized UI for each platform

### 🔐 **Secure Authentication**

- OAuth integration (Google, Apple)
- Secure session management
- Privacy-focused design

## 🛠 Tech Stack

This is a modern full-stack TypeScript monorepo built with the T3 stack and enhanced for mobile development:

### **Frontend**

- **Next.js 15** - React-based web framework with React 19
- **Expo/React Native** - Cross-platform mobile development
- **TypeScript** - Type-safe development across the stack
- **Tailwind CSS** - Utility-first CSS framework
- **NativeWind** - Tailwind CSS for React Native
- **Expo Router** - File-based routing for mobile navigation

### **Backend & API**

- **tRPC v11** - End-to-end typesafe APIs
- **Drizzle ORM** - Type-safe database toolkit
- **PostgreSQL** - Primary database (Neon)
- **Better Auth** - Modern authentication system

### **UI & Design**

- **shadcn/ui** - Re-usable component library
- **Radix UI** - Unstyled, accessible UI primitives
- **Lucide Icons** - Beautiful, customizable icons
- **Dark/Light Theme** - System-aware theme switching

### **Development & Tooling**

- **Turborepo** - High-performance build system
- **pnpm** - Fast, disk space efficient package manager
- **ESLint & Prettier** - Code formatting and linting
- **TypeScript** - Static type checking

### **Deployment & Infrastructure**

- **Vercel** - Web app deployment and hosting
- **Expo Application Services** - Mobile app building and distribution
- **Neon** - Serverless PostgreSQL database

## 📁 Project Structure

```text
flatsby/
├── apps/
│   ├── expo/                    # React Native mobile app
│   │   ├── src/app/            # File-based routing (Expo Router)
│   │   ├── src/components/     # Reusable UI components
│   │   └── src/utils/          # Utilities and API clients
│   └── nextjs/                 # Next.js web application
│       ├── src/app/            # App router pages and components
│       └── src/trpc/           # tRPC client configuration
├── packages/
│   ├── api/                    # tRPC API definitions and routers
│   ├── auth/                   # Authentication configuration
│   ├── db/                     # Database schema and client
│   ├── ui/                     # Shared UI components
│   └── validators/             # Shared validation schemas
└── tooling/                    # Shared development configuration
    ├── eslint/                 # ESLint configurations
    ├── prettier/               # Prettier configuration
    ├── tailwind/               # Tailwind CSS configuration
    └── typescript/             # TypeScript configurations
```

## 🚀 Quick Start

### Prerequisites

- **Node.js 18+** (check `package.json#engines` for exact requirements)
- **pnpm** (recommended package manager)
- **PostgreSQL database** (Neon recommended)

### 1. Clone and Setup

```bash
# Clone the repository
git clone <your-repo-url>
cd flatsby

# Install dependencies
pnpm install

# Configure environment variables
cp .env.example .env
```

### 2. Environment Configuration

Update your `.env` file with the following required variables:

```env
# Database
DATABASE_URL="postgresql://..."

# Authentication
AUTH_SECRET="your-auth-secret"
AUTH_GOOGLE_ID="your-google-oauth-id"
AUTH_GOOGLE_SECRET="your-google-oauth-secret"
AUTH_APPLE_ID="your-apple-service-id"
AUTH_APPLE_SECRET="your-apple-private-key"

# App URLs
NEXTAUTH_URL="http://localhost:3000"
```

### 3. Database Setup

```bash
# Push database schema
pnpm db:push

# Note: db:seed script may not be available - check package.json
```

### 4. Start Development Servers

```bash
# Start all development servers (web + mobile)
pnpm dev
```

This will start:

- Next.js web app at `http://localhost:3000`
- Expo development server for mobile

```bash
# Or start only the Next.js web application
pnpm dev:next
```

### 5. Mobile Development Setup

#### Physical Device (Recommended)

1. **Install Expo Go** app on your iOS or Android device
2. **Start the dev server**: `pnpm dev`
3. **Scan the QR code** shown in the terminal with your device
4. Your app will load directly on your physical device

#### Simulators/Emulators (Optional)

- **iOS**: Install Xcode for iOS Simulator access
- **Android**: Install Android Studio for Android Emulator access

The Expo CLI will guide you through platform-specific setup when you run `pnpm dev`.

## 🔧 Development

### Scripts

```bash
# Development
pnpm dev              # Start all apps in development mode (watch mode)
pnpm dev:next         # Start only Next.js web app in watch mode

# Building
pnpm build            # Build all apps for production

# Database
pnpm db:push          # Push Drizzle schema changes to database
pnpm db:studio        # Open Drizzle Studio database browser

# Code Quality
pnpm lint             # Run ESLint across all packages
pnpm lint:fix         # Fix ESLint errors automatically
pnpm lint:ws          # Check workspace dependencies with sherif
pnpm typecheck        # Run TypeScript type checking
pnpm format           # Check code formatting with Prettier
pnpm format:fix       # Fix code formatting with Prettier

# UI Components
pnpm ui-add           # Add new shadcn/ui components

# Package Management
pnpm clean            # Clean git-ignored files in node_modules
pnpm clean:workspaces # Clean all workspace build artifacts
```

### Working with the Monorepo

This project uses Turborepo for efficient monorepo management:

```bash
# Run commands in specific workspaces
pnpm -F @flatsby/nextjs dev     # Run Next.js web app only
pnpm -F @flatsby/expo start    # Run Expo mobile app only
pnpm -F @flatsby/ui build      # Build UI package only

# Add dependencies to specific packages
pnpm -F @flatsby/nextjs add lodash
pnpm -F @flatsby/expo add react-native-xyz
```

### Adding UI Components

Add new shadcn/ui components using the interactive CLI:

```bash
pnpm ui:add
```

This will prompt you to select components and automatically install them in the appropriate packages.

### Creating New Packages

Generate new packages with proper tooling configuration:

```bash
pnpm turbo gen init
```

This creates a new package with:

- Proper `package.json` configuration
- TypeScript setup
- ESLint and Prettier configuration
- Basic file structure

### Authentication Setup

The application uses Better Auth with OAuth providers. For local development:

1. **Set up OAuth providers:**
   - Google: Create OAuth credentials in Google Cloud Console
   - Apple: Set up Sign in with Apple in Apple Developer Console

2. **Configure environment variables** as shown in the Quick Start section

3. **For production deployment**, consider using an auth proxy for stable OAuth callbacks

## 🚀 Deployment

### Web Application (Next.js)

#### Deploy to Vercel (Recommended)

1. **Connect your repository** to Vercel
2. **Configure build settings:**
   - Framework Preset: Next.js
   - Root Directory: `apps/nextjs`
   - Build Command: `cd ../.. && pnpm build:web`
   - Install Command: `cd ../.. && pnpm install`

3. **Set environment variables** in Vercel dashboard:

   ```env
   DATABASE_URL=your_database_url
   AUTH_SECRET=your_auth_secret
   AUTH_GOOGLE_ID=your_google_id
   AUTH_GOOGLE_SECRET=your_google_secret
   AUTH_APPLE_ID=your_apple_id
   AUTH_APPLE_SECRET=your_apple_secret
   NEXTAUTH_URL=https://your-domain.vercel.app
   ```

4. **Deploy** - Vercel will automatically build and deploy your app

#### Alternative Deployment Options

- **Docker**: Use the included Dockerfile
- **Self-hosted**: Any Node.js hosting provider
- **Railway**: Railway.app with automatic deployments

### Mobile Application (Expo)

#### Prerequisites

1. **Create Expo account** at [expo.dev](https://expo.dev)
2. **Install EAS CLI:**
   ```bash
   pnpm add -g eas-cli
   eas login
   ```

#### Configure for Deployment

1. **Update app configuration** in `apps/expo/app.config.ts`:
   - Set your own `name`, `slug`, and `owner`
   - Update bundle identifiers for iOS and Android

2. **Configure EAS Build:**
   ```bash
   cd apps/expo
   eas build:configure
   ```

#### Build and Submit

```bash
# Build for iOS
eas build --platform ios --profile production

# Build for Android
eas build --platform android --profile production

# Submit to app stores
eas submit --platform ios --latest
eas submit --platform android --latest
```

### Database Setup

#### Production Database (Neon)

1. **Create a Neon project** at [neon.tech](https://neon.tech)
2. **Copy the database URL** from your Neon dashboard
3. **Update environment variables** in your deployment platform
4. **Run database migrations:**
   ```bash
   pnpm db:push
   ```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING.md) for details.

### Quick Contribution Steps

1. **Fork the repository**
2. **Create a feature branch:** `git checkout -b feature/amazing-feature`
3. **Make your changes** following our coding standards
4. **Run tests and linting:** `pnpm lint && pnpm typecheck`
5. **Commit your changes:** `git commit -m 'Add amazing feature'`
6. **Push to the branch:** `git push origin feature/amazing-feature`
7. **Open a Pull Request**

### Code Standards

- Follow TypeScript best practices
- Use ESLint and Prettier configurations
- Write meaningful commit messages
- Add tests for new features
- Update documentation as needed

## 📚 Learning Resources

- **T3 Stack Documentation**: [create.t3.gg](https://create.t3.gg/)
- **Expo Documentation**: [docs.expo.dev](https://docs.expo.dev/)
- **Next.js Documentation**: [nextjs.org/docs](https://nextjs.org/docs)
- **tRPC Documentation**: [trpc.io](https://trpc.io/)
- **Drizzle ORM**: [orm.drizzle.team](https://orm.drizzle.team/)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

## 🙏 Acknowledgments

- Built on the amazing [T3 Stack](https://create.t3.gg/)
- Inspired by the [create-t3-turbo](https://github.com/t3-oss/create-t3-turbo) template
- UI components from [shadcn/ui](https://ui.shadcn.com/)

---

**Happy coding! 🎉**

For questions or support, please open an issue or contact the maintainers.
