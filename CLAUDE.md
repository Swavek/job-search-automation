# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a job search automation system designed for Senior Business Analyst positions in the Polish market. The project consists of both a frontend web application and comprehensive backend implementation documentation.

## Project Structure

The repository contains two main components:

### Frontend Web Application (`source/`)
- **`index.html`** - Single-page application with tabbed interface
- **`app.js`** - Main application logic with job management, CV optimization, and analytics
- **`style.css`** - Complete styling with CSS custom properties and responsive design
- **`job_search_data.json`** - Sample data including user profile, job listings, and Polish job sources

### Documentation (`docs/`)
- **`job-search-implementation-guide.md`** - Comprehensive implementation roadmap with multi-platform integration
- **`job-search-python-implementation.md`** - Complete Python backend implementation with automation features

## Key Features

### Web Application Features
1. **Dashboard** - Job overview with match scores and recent applications
2. **CV Upload & Analysis** - CV processing with skill extraction and ATS optimization suggestions  
3. **Job Search Configuration** - Multi-source job search setup (NoFluffJobs, JustJoin.IT, LinkedIn Poland, Remote Jobs)
4. **Results Management** - Job filtering, sorting, and detailed view with application tracking
5. **CV Optimization** - Job-specific CV customization with keyword matching analysis
6. **Cover Letter Generation** - Automated personalized cover letter creation
7. **Application Tracking** - Timeline-based progress monitoring with status management
8. **Analytics Dashboard** - Charts and insights using Chart.js for application rates, salary trends, and response metrics

### Backend Implementation (Documentation Only)
- Multi-platform job scraping using JobSpy library
- AI-powered CV optimization using OpenAI API
- SQLite database for application tracking
- Automated scheduling for daily job searches
- Performance analytics and reporting
- Polish job market specific integrations

## Technology Stack

### Frontend
- **HTML5** with semantic structure and Polish language support
- **Vanilla JavaScript** with modular event handling and state management
- **CSS3** with custom properties, flexbox, and grid layouts
- **Chart.js** for data visualization
- **No build process required** - static files served directly

### Backend (Implementation Reference)
- **Python 3.9+** with virtual environment setup
- **JobSpy** for multi-platform job scraping
- **OpenAI API** for CV optimization and cover letter generation
- **SQLite** for application data persistence
- **Pandas** for data manipulation
- **scikit-learn** for job matching algorithms

## How to Run

### Frontend Application
```bash
# Serve the source directory with any web server
cd source/
python -m http.server 8000
# Open http://localhost:8000
```

### Backend Implementation
Follow the detailed setup instructions in `docs/job-search-python-implementation.md`:
1. Create Python virtual environment
2. Install dependencies: `jobspy pandas openai python-docx scikit-learn nltk spacy schedule`
3. Set OPENAI_API_KEY environment variable
4. Run the main automation script

## Polish Job Market Focus

The system is specifically designed for the Polish job market with:
- Integration with major Polish job sites (NoFluffJobs, JustJoin.IT, Pracuj.pl)
- Salary benchmarking in PLN for Business Analyst roles
- Location preferences including major Polish cities and remote work
- Polish language interface and cover letter templates

## User Profile

The system is configured for:
- **Name**: Sławomir (Swavek) Kublin
- **Location**: Tarnowskie Góry, Poland  
- **Role**: Senior Business Analyst, Product Manager
- **Experience**: 30 years
- **Skills**: Requirements analysis, CRM systems, SQL, C#, JavaScript, Python
- **Languages**: Polish (native), English (fluent), German (basic)

## Data Structure

Job data structure includes:
- Basic job information (title, company, location, salary, type)
- Match scoring (0-100% based on skills alignment)
- Application status tracking (Not Applied, Interested, Applied, Interview Scheduled)
- Required skills array for CV optimization
- Job descriptions for cover letter personalization

## Configuration

The frontend uses embedded configuration in `job_search_data.json`. The backend implementation uses `config.json` for:
- User profile settings
- Search criteria and filters
- API configurations
- CV and cover letter templates

## Development Notes

- **No build process required** for frontend - all dependencies loaded via CDN
- **State management** handled in JavaScript with `appState` object
- **Modal-based interactions** for detailed job views
- **Responsive design** with mobile-first approach
- **Accessibility** considerations with proper semantic markup