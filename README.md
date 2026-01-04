# POS and Inventory Management System

This is a Point of Sale (POS) and Inventory Management System built with Next.js, React, and Supabase. It provides a comprehensive solution for managing products, players, orders, and transactions in a retail or small business setting.

As a developer with extensive experience in creating similar applications, this project represents the culmination of years of expertise in building POS systems. Of course, in the beginning the project seem a little raw, but with time and hopefully with the help of the community, it will become a robust and feature-rich solution for businesses of all sizes.

This particular iteration embraces the spirit of open-source development, making it freely available for the community to use, modify, and improve upon.

## Features

- **Dashboard**: Overview of key metrics and charts
- **Products Management**: Add, edit, delete, and view products
- **Player Management**: Manage player information and status
- **Order Management**: Create and manage orders
- **Point of Sale (POS)**: Quick and easy sales processing
- **User Authentication**: Secure login system

## Tech Stack

- **Frontend**: Next.js, React, Tailwind CSS
- **Backend**: Supabase (PostgreSQL database)
- **State Management**: React Hooks
- **UI Components**: Custom components and Shadcn UI
- **Charts**: Recharts

## Getting Started

### Local Development

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up your Supabase project for development:
   - Create a project in [Supabase Dashboard](https://supabase.com/dashboard)
   - Copy `env.local.template` to `.env.local`:
     ```bash
     cp env.local.template .env.local
     ```
   - Edit `.env.local` and add your Supabase credentials:
     ```env
     NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
     NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=your_supabase_publishable_key
     ```
4. Verify your environment configuration:
   ```bash
   npm run check-env:local
   ```
5. Run the development server:
   ```bash
   npm run dev
   ```
6. Open [http://localhost:3000](http://localhost:3000) in your browser

### Production Deployment

For detailed deployment instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md).

**Quick Setup:**
- **Frontend + API**: Deploy to [Vercel](https://vercel.com) (recommended)
- **Database**: Use Supabase (separate project for production)
- **Authentication**: Supabase Auth

The application supports multiple environments:
- **Local**: Development with local Next.js + Supabase cloud
- **Production**: Everything in the cloud (Vercel + Supabase)

## Project Structure

- `src/app/`: Next.js app router pages
- `src/components/`: Reusable React components
- `src/lib/`: Utility functions and Supabase client
- `schema.sql`: Database schema

## Key Pages

- `/admin`: Main dashboard
- `/admin/products`: Product management
- `/admin/players`: Player management
- `/admin/orders`: Order management
- `/admin/pos`: Point of Sale interface

## Database Schema

The project uses a PostgreSQL database with the following main tables:

- `products`: Store product information
- `players`: Player details
- `orders`: Order information
- `order_items`: Items within each order
- `transactions`: Financial transactions
- `payment_methods`: Available payment methods

For the complete schema, refer to `schema.sql`.

## Authentication

User authentication is handled through Supabase. The login page is available at `/login`.

## Error Handling

A basic error page is implemented at `/error` to handle and display any errors that occur during runtime.

## Environment Configuration

The project supports multiple environments:

- **Local Development**: Uses `.env.local` (see `.env.local.example`)
- **Production**: Uses environment variables configured in Vercel (see `.env.production.example`)

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run check-env` - Check environment variables (defaults to local)
- `npm run check-env:local` - Check local environment variables
- `npm run check-env:prod` - Check production environment variables

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

**Architecture:**
- Frontend + API Routes: Vercel (Next.js)
- Database: Supabase
- Authentication: Supabase Auth

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is open source and available under the [MIT License](LICENSE).
