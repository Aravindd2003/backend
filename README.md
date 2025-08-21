# Frontend Arena 2025 Backend API

This is the backend API server for the Frontend Arena 2025 registration system.

## Features

- **Registration API**: Handle team registrations with participant details
- **File Upload**: Accept payment screenshot uploads (images/PDFs)
- **Data Validation**: Validate all registration data
- **CORS Support**: Cross-origin resource sharing enabled
- **Error Handling**: Comprehensive error handling and validation

## API Endpoints

### Base URL
```
http://localhost:5000
```

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | API information and documentation |
| GET | `/api/health` | Health check endpoint |
| POST | `/api/register` | Submit team registration |
| GET | `/api/registrations` | Get all registrations (admin) |
| GET | `/api/registrations/:id` | Get specific registration |
| PATCH | `/api/registrations/:id/status` | Update registration status |

## Registration Data Structure

```json
{
  "teamName": "Team Name",
  "teamSize": 2,
  "participants": [
    {
      "name": "Participant Name",
      "email": "email@example.com",
      "phone": "+1234567890",
      "college": "College Name",
      "departmentYear": "Computer Science - 3rd Year",
      "linkedin": "https://linkedin.com/in/username",
      "portfolio": "https://portfolio.com"
    }
  ],
  "portfolioUrl": "https://portfolio-link.com"
}
```

## Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create environment file:
```bash
cp config.env .env
# Edit .env with your configuration
```

4. Start the server:
```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

The server will start on port 5000 by default.

## File Upload

- **Supported formats**: Images (JPEG, PNG, GIF) and PDFs
- **Maximum size**: 5MB
- **Field name**: `paymentScreenshot`

## Development

### Running in Development Mode
```bash
npm run dev
```

### Running Tests
```bash
npm test
```

## Production Deployment

1. Set `NODE_ENV=production` in your environment
2. Configure proper CORS origins
3. Set up a production database
4. Configure email services
5. Set up proper file storage (e.g., AWS S3)

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| PORT | Server port | 5000 |
| NODE_ENV | Environment mode | development |
| CORS_ORIGIN | Allowed CORS origin | http://localhost:3000 |

## Database (Future Implementation)

The current version uses in-memory storage. For production, implement:

- PostgreSQL/MySQL for data persistence
- Redis for caching
- Proper data validation and sanitization

## Security Features

- CORS protection
- File type validation
- File size limits
- Input validation
- Error handling

## Contributing

1. Follow the existing code style
2. Add proper error handling
3. Include validation for new endpoints
4. Update documentation

## License

MIT License
