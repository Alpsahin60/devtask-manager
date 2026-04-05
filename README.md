# DevTask Manager

A full-stack task management application with JWT authentication, drag & drop functionality, and a RESTful API — built to demonstrate modern web development practices.

![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)
![Node.js](https://img.shields.io/badge/Node.js-20-green?style=flat-square&logo=node.js)
![MongoDB](https://img.shields.io/badge/MongoDB-7-green?style=flat-square&logo=mongodb)

## Features

- JWT Authentication (Register, Login, Refresh Tokens)
- Kanban Board with Drag & Drop (Todo → In Progress → Done)
- Task priorities (High, Medium, Low) with deadlines
- Full RESTful API with Swagger documentation
- Responsive design — mobile & desktop
- Dark mode support

## Tech Stack

**Frontend**
- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS
- Framer Motion (Drag & Drop)

**Backend**
- Node.js + Express.js
- MongoDB + Mongoose
- JWT Authentication
- REST API

## Getting Started

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)

### Installation
```bash
# Clone the repository
git clone https://github.com/Alpsahin60/devtask-manager.git
cd devtask-manager

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Add your MongoDB URI and JWT secret

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Register new user |
| POST | /api/auth/login | Login user |
| GET | /api/tasks | Get all tasks |
| POST | /api/tasks | Create task |
| PUT | /api/tasks/:id | Update task |
| DELETE | /api/tasks/:id | Delete task |

## Project Structure

```
devtask-manager/
├── src/
│   ├── app/
│   │   ├── api/          # API routes
│   │   ├── dashboard/    # Task board
│   │   └── auth/         # Login & Register
│   ├── components/       # React components
│   └── lib/              # DB connection, helpers
├── .env.example
└── README.md
```

## Author

**Alp Sahin** — Software Developer
- GitHub: [@Alpsahin60](https://github.com/Alpsahin60)
- LinkedIn: [linkedin.com/in/alpsahin](https://linkedin.com/in/alpsahin)
- Portfolio: [alpsahin.dev](https://alpsahin.dev)

## License

MIT License
