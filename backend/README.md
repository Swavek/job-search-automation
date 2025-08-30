# Job Search Automation Backend

Flask API backend for the job search automation system.

## Setup

1. **Create virtual environment:**
```bash
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
```

2. **Install dependencies:**
```bash
pip install -r requirements.txt
```

3. **Environment configuration:**
```bash
cp .env.template .env
# Edit .env with your configuration
```

4. **Run the API:**
```bash
python app.py
```

The API will be available at http://localhost:5000

## API Endpoints

### Job Search
- `POST /api/jobs/search` - Search for new jobs
- `GET /api/jobs` - Get stored jobs with filtering
- `GET /api/jobs/<id>` - Get specific job details
- `PUT /api/jobs/<id>/status` - Update job application status

### Statistics
- `GET /api/stats` - Get job search statistics
- `GET /api/health` - Health check

## Current Implementation Status

✅ **Phase 1 Complete:**
- Basic Flask API structure
- SQLite database setup
- Demo job search functionality
- Job storage and retrieval
- Basic match scoring
- Status tracking

🚧 **Next Steps (Phase 2):**
- Real job site integration (NoFluffJobs, JustJoin.IT)
- Enhanced filtering and search
- JobSpy integration for LinkedIn/Indeed
- Frontend API integration

## Database Schema

### Jobs Table
- id, title, company, location, salary_range
- job_url, description, requirements
- source_platform, match_score, status
- posted_date, created_at

### Search History Table
- search_date, platform, search_term
- location, results_count, execution_time

## Testing

Test the API endpoints:

```bash
# Health check
curl http://localhost:5000/api/health

# Search for jobs
curl -X POST http://localhost:5000/api/jobs/search \
  -H "Content-Type: application/json" \
  -d '{"search_term": "Senior Business Analyst", "location": "Poland"}'

# Get stored jobs
curl http://localhost:5000/api/jobs?min_score=70
```