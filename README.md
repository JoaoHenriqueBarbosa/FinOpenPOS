# POS and Inventory Management System

This is a Point of Sale (POS) and Inventory Management System built with Next.js, React, and Supabase. It provides a comprehensive solution for managing products, customers, orders, and transactions in a retail or small business setting.

As a developer with extensive experience in creating similar applications, this project represents the culmination of years of expertise in building POS systems. Of course, in the beginning the project seem a little raw, but with time and hopefully with the help of the community, it will become a robust and feature-rich solution for businesses of all sizes.

This particular iteration embraces the spirit of open-source development, making it freely available for the community to use, modify, and improve upon.

## Features

- **Dashboard**: Overview of key metrics and charts
- **Products Management**: Add, edit, delete, and view products
- **Customer Management**: Manage customer information and status
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

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Set up your Supabase project and add the necessary environment variables:
   - Create a `.env.local` file in the root of your project
   - Add the following lines to the file:
     ```
     NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
     NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
     ```
   - Replace `your_supabase_project_url` and `your_supabase_anon_key` with your actual Supabase project URL and anon key
4. Run the development server:
   ```
   npm run dev
   ```
5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

- `src/app/`: Next.js app router pages
- `src/components/`: Reusable React components
- `src/lib/`: Utility functions and Supabase client
- `schema.sql`: Database schema

## Key Pages

- `/admin`: Main dashboard
- `/admin/products`: Product management
- `/admin/customers`: Customer management
- `/admin/orders`: Order management
- `/admin/pos`: Point of Sale interface

## Database Schema

The project uses a PostgreSQL database with the following main tables:

- `products`: Store product information
- `customers`: Customer details
- `orders`: Order information
- `order_items`: Items within each order
- `transactions`: Financial transactions
- `payment_methods`: Available payment methods

For the complete schema, refer to `schema.sql`.

## Authentication

User authentication is handled through Supabase. The login page is available at `/login`.

## Error Handling

A basic error page is implemented at `/error` to handle and display any errors that occur during runtime.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is open source and available under the [MIT License](LICENSE).
