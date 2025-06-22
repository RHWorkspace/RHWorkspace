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

---

## Screenshots

| Dashboard | Timeline (Gantt) | Project Detail |
|-----------|------------------|---------------|
| ![Dashboard](docs/screens/dashboard.png) | ![Timeline](docs/screens/timeline.png) | ![Project](docs/screens/project.png) |

---

## API Endpoints

- **Projects:**  
  - `GET /projects` — List all projects  
  - `POST /projects` — Create new project  
  - `PUT /projects/{id}` — Update project  
  - `DELETE /projects/{id}` — Delete project  

- **Tasks:**  
  - `GET /tasks` — List all tasks  
  - `POST /tasks` — Create new task  
  - `PUT /tasks/{id}` — Update task  
  - `DELETE /tasks/{id}` — Delete task  

- **Users:**  
  - `GET /users` — List users  
  - `POST /register` — Register  
  - `POST /login` — Login  
  - `POST /logout` — Logout  

---

## Gantt Timeline

The Gantt Timeline page (`/timeline`) visualizes project and task schedules with:
- **Weekly, Monthly, Quarterly views**
- **Progress bars** for each project
- **Color-coded task bars** by status (To Do, In Progress, Done)
- **Assignee initials** on task bars
- **Interactive tooltips** with task details
- **Responsive and scrollable table**

---

## User Roles & Permissions

- **Admin:** Manage all users, projects, and tasks
- **Project Manager:** Manage assigned projects and tasks
- **Member:** View and update assigned tasks

_Roles can be customized in the database or via the admin panel._

---

## Environment Variables

Key `.env` settings:
```
APP_NAME=
APP_ENV=local
APP_KEY=base64:...
DB_CONNECTION=
DB_HOST=
DB_PORT=3306
DB_DATABASE=
DB_USERNAME=
DB_PASSWORD=
```
_See `.env.example` for more._

---

## Troubleshooting

- **Port already in use:**  
  Change the port with `php artisan serve --port=8080`
- **Frontend not updating:**  
  Try `npm run dev -- --force`
- **Database errors:**  
  Check your `.env` and run `php artisan migrate:fresh --seed`

---

## Contribution

Pull requests are welcome!  
Please open an issue first to discuss major changes.

---

## Credits

- Laravel by [Taylor Otwell](https://github.com/taylorotwell)
- Inertia.js by [Jonathan Reinink](https://github.com/reinink)
- React by [Meta](https://react.dev/)
- Tailwind CSS by [Tailwind Labs](https://tailwindcss.com/)

---

## License

This project is open-sourced under the [MIT license](https://opensource.org/licenses/MIT).
