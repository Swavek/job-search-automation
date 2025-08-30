# Job Search Automation System

Automated job search system for Senior Business Analyst positions in Poland with CV optimization and application tracking.

## 🚀 Features

- **Multi-Platform Job Search** - Integrates with LinkedIn, Indeed, NoFluffJobs, JustJoin.IT
- **Smart Job Matching** - AI-powered matching based on skills and preferences  
- **CV Optimization** - Customize CV for each job application
- **Cover Letter Generation** - AI-generated personalized cover letters
- **Application Tracking** - Timeline-based progress monitoring
- **Analytics Dashboard** - Charts and insights on job search performance

## 🏗️ Architecture

### Frontend (Complete)
- Single-page web application in `source/`
- Vanilla JavaScript with Chart.js for analytics
- Polish language interface optimized for Polish job market

### Backend (Implementation Guide)
- Python-based automation system documented in `docs/`
- Multi-platform job scraping with JobSpy
- OpenAI integration for CV/cover letter optimization
- SQLite database for application tracking

## 🎯 Target Market

Specifically designed for the Polish job market:
- Integration with major Polish job sites
- Salary benchmarking in PLN
- Location preferences for major Polish cities
- Remote work opportunities

## ⚡ Quick Start

### Run Frontend Demo
```bash
cd source/
python -m http.server 8000
# Open http://localhost:8000
```

### Implement Backend
Follow the comprehensive implementation guide in `docs/job-search-python-implementation.md`

## 📋 Implementation Roadmap

1. **Phase 1**: Basic job search with 2-3 platforms
2. **Phase 2**: Data storage and filtering  
3. **Phase 3**: Frontend-backend integration
4. **Phase 4**: CV optimization features
5. **Phase 5**: Application tracking
6. **Phase 6**: Automation and advanced features

See detailed implementation steps in the documentation.

## 🔧 Technology Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript, Chart.js
- **Backend**: Python, JobSpy, OpenAI API, SQLite
- **Polish Job Sites**: NoFluffJobs, JustJoin.IT, Pracuj.pl integration

## 📊 User Profile

Pre-configured for:
- Sławomir (Swavek) Kublin
- Location: Tarnowskie Góry, Poland
- Role: Senior Business Analyst, Product Manager
- 25 years experience in requirements analysis, CRM systems, SQL

## 🤝 Contributing

1. Start with Phase 1 implementation (basic job search)
2. Follow the implementation guide in `docs/`
3. Test with the provided sample data structure
4. Expand features incrementally

## 📄 License

MIT License - Feel free to use and modify for your job search needs.

---

**Note**: This repository contains a complete frontend demo and comprehensive backend implementation documentation. The backend services need to be implemented following the provided guides to create a fully functional system.
