<p align="center"><a href="https://laravel.com" target="_blank"><img src="https://raw.githubusercontent.com/laravel/art/master/logo-lockup/5%20SVG/2%20CMYK/1%20Full%20Color/laravel-logolockup-cmyk-red.svg" width="400" alt="Laravel Logo"></a></p>

<p align="center">
<a href="https://github.com/laravel/framework/actions"><img src="https://github.com/laravel/framework/workflows/tests/badge.svg" alt="Build Status"></a>
<a href="https://packagist.org/packages/laravel/framework"><img src="https://img.shields.io/packagist/dt/laravel/framework" alt="Total Downloads"></a>
<a href="https://packagist.org/packages/laravel/framework"><img src="https://img.shields.io/packagist/v/laravel/framework" alt="Latest Stable Version"></a>
<a href="https://packagist.org/packages/laravel/framework"><img src="https://img.shields.io/packagist/l/laravel/framework" alt="License"></a>
</p>

## About This Project

This is a Laravel-based web application with a modern frontend using React (Vite + Inertia.js).  
It includes a project management dashboard with user, project, and task management features.

### Features

- User authentication (register, login, logout)
- Project CRUD (Create, Read, Update, Delete)
- Task CRUD with assignment to users and projects
- Dashboard summary with statistics and timeline
- Responsive UI with Tailwind CSS

## Getting Started

### Requirements

- PHP >= 8.1
- Composer
- Node.js & npm
- MySQL/MariaDB or compatible database
- [Laragon](https://laragon.org/) (recommended for local development)

### Installation

1. **Clone the repository**
   ```sh
   https://github.com/RHWorkspace/RHWorkspace.git
   cd my-laravel-app
   ```

2. **Install PHP dependencies**
   ```sh
   composer install
   ```

3. **Install JS dependencies**
   ```sh
   npm install
   ```

4. **Copy `.env` and set up environment**
   ```sh
   cp .env.example .env
   ```
   Edit `.env` and set your database credentials.

5. **Generate application key**
   ```sh
   php artisan key:generate
   ```

6. **Run migrations and seeders**
   ```sh
   php artisan migrate --seed
   ```

7. **Run the development servers**
   ```sh
   php artisan serve
   npm run dev
   ```

8. **Access the app**  
   Open [http://localhost:8000](http://localhost:8000) in your browser.

## Project Structure

- `app/` - Laravel backend code (models, controllers, etc)
- `resources/js/` - React frontend (pages, components)
- `routes/` - Web and API routes
- `database/` - Migrations and seeders

## Frontend

This project uses [React](https://react.dev/) with [Vite](https://vitejs.dev/) and [Inertia.js](https://inertiajs.com/).

- Main dashboard: `resources/js/Pages/Summary.jsx`
- Layout: `resources/js/Layouts/AuthenticatedLayout.jsx`
- Components: `resources/js/Components/`

## Customization

- To add new features, create new React pages in `resources/js/Pages/` and corresponding Laravel controllers.
- For UI, edit Tailwind CSS classes or add new components.

## Testing

- **PHP Unit tests:**  
  ```sh
  php artisan test
  ```
- **JS/React tests:**  
  Add your tests in `resources/js/__tests__/` and run with your preferred test runner.

## Useful Commands

- `php artisan migrate:fresh --seed` — Reset and reseed the database
- `npm run build` — Build frontend assets for production
- `php artisan route:list` — List all routes

## Learning Resources

- [Laravel Documentation](https://laravel.com/docs)
- [Inertia.js Documentation](https://inertiajs.com/)
- [React Documentation](https://react.dev/)
- [Tailwind CSS Documentation](https://tailwindcss.com/)

## License

The Laravel framework is open-sourced software licensed under the [MIT license](https://opensource.org/licenses/MIT).
