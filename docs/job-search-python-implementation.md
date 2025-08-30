# Automated Job Search System - Core Python Implementation

## Complete Python Implementation

### 1. Main Job Search Orchestrator

```python
#!/usr/bin/env python3
"""
Automated Job Search System for Senior Business Analyst
Author: Sławomir Kublin
Version: 1.0
"""

import os
import pandas as pd
import json
import time
from datetime import datetime, timedelta
import schedule
import logging
from pathlib import Path
from typing import List, Dict, Optional
import sqlite3

# Third-party imports
from jobspy import scrape_jobs
import openai
from docx import Document
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import nltk
import spacy

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('job_search.log'),
        logging.StreamHandler()
    ]
)

class JobSearchAutomation:
    def __init__(self, config_path: str = 'config.json'):
        """Initialize the job search automation system"""
        self.config = self.load_config(config_path)
        self.setup_database()
        self.setup_nlp()
        
        # OpenAI setup
        openai.api_key = os.getenv('OPENAI_API_KEY')
        
        logging.info("Job Search Automation System initialized")
    
    def load_config(self, config_path: str) -> Dict:
        """Load configuration from JSON file"""
        with open(config_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    
    def setup_database(self):
        """Setup SQLite database for application tracking"""
        self.db_path = 'job_applications.db'
        conn = sqlite3.connect(self.db_path)
        
        conn.execute('''
            CREATE TABLE IF NOT EXISTS applications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                job_id VARCHAR(100) UNIQUE,
                title VARCHAR(255),
                company VARCHAR(255),
                location VARCHAR(255),
                salary_range VARCHAR(100),
                job_url TEXT,
                description TEXT,
                requirements TEXT,
                application_date DATE,
                status VARCHAR(50) DEFAULT 'found',
                match_score INTEGER,
                cv_version VARCHAR(100),
                cover_letter_path VARCHAR(255),
                follow_up_date DATE,
                response_date DATE,
                interview_date DATE,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        conn.execute('''
            CREATE TABLE IF NOT EXISTS search_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                search_date DATE,
                platform VARCHAR(100),
                search_term VARCHAR(255),
                location VARCHAR(255),
                results_count INTEGER,
                new_jobs INTEGER,
                execution_time REAL
            )
        ''')
        
        conn.commit()
        conn.close()
        
    def setup_nlp(self):
        """Setup NLP tools for text analysis"""
        try:
            self.nlp = spacy.load('en_core_web_sm')
        except OSError:
            logging.warning("English spaCy model not found. Install with: python -m spacy download en_core_web_sm")
            self.nlp = None
            
        # Download required NLTK data
        try:
            nltk.download('punkt', quiet=True)
            nltk.download('stopwords', quiet=True)
        except Exception as e:
            logging.warning(f"NLTK download error: {e}")

    def search_jobs_multi_platform(self) -> pd.DataFrame:
        """Search jobs across multiple platforms"""
        all_jobs = pd.DataFrame()
        search_config = self.config['search_criteria']
        
        platforms = ['linkedin', 'indeed', 'glassdoor']
        
        for platform in platforms:
            try:
                start_time = time.time()
                logging.info(f"Searching {platform} for jobs...")
                
                jobs = scrape_jobs(
                    site_name=[platform],
                    search_term=search_config['job_titles'][0],  # Primary search term
                    location=search_config['locations'][0],  # Primary location
                    results_wanted=search_config['max_results_per_platform'],
                    country_indeed='Poland' if platform == 'indeed' else None,
                    linkedin_fetch_description=True if platform == 'linkedin' else False,
                    hours_old=search_config.get('hours_old', 168)  # Last week
                )
                
                if jobs is not None and not jobs.empty:
                    jobs['source_platform'] = platform
                    jobs['search_date'] = datetime.now().date()
                    all_jobs = pd.concat([all_jobs, jobs], ignore_index=True)
                    
                    # Log search results
                    execution_time = time.time() - start_time
                    self.log_search_results(platform, len(jobs), execution_time)
                    
                    logging.info(f"Found {len(jobs)} jobs on {platform}")
                
                # Rate limiting
                time.sleep(2)
                
            except Exception as e:
                logging.error(f"Error searching {platform}: {e}")
                
        return self.clean_job_data(all_jobs)
    
    def search_polish_job_sites(self) -> pd.DataFrame:
        """Search Polish-specific job sites"""
        # This would implement custom scrapers for Polish sites
        # For now, return empty DataFrame
        logging.info("Searching Polish job sites...")
        
        polish_jobs = pd.DataFrame()
        
        # Placeholder for NoFluffJobs, JustJoin.IT, Pracuj.pl scrapers
        # Implementation would depend on each site's structure
        
        return polish_jobs
    
    def clean_job_data(self, jobs_df: pd.DataFrame) -> pd.DataFrame:
        """Clean and standardize job data"""
        if jobs_df.empty:
            return jobs_df
            
        # Remove duplicates based on title and company
        jobs_df = jobs_df.drop_duplicates(subset=['title', 'company'], keep='first')
        
        # Clean salary data
        if 'salary' in jobs_df.columns:
            jobs_df['salary_clean'] = jobs_df['salary'].str.replace('PLN', '').str.replace(',', '').str.strip()
        
        # Standardize location names
        if 'location' in jobs_df.columns:
            jobs_df['location'] = jobs_df['location'].str.replace('remote', 'Remote', case=False)
        
        # Remove jobs without essential information
        essential_columns = ['title', 'company']
        jobs_df = jobs_df.dropna(subset=essential_columns)
        
        return jobs_df
    
    def calculate_job_match_score(self, job_description: str, job_title: str) -> int:
        """Calculate how well a job matches the user profile"""
        try:
            user_skills = self.config['user_profile']['technical_skills'] + \
                         self.config['user_profile']['core_competencies']
            
            # Create skill string
            user_skill_text = ' '.join(user_skills).lower()
            job_text = f"{job_title} {job_description}".lower()
            
            # Use TF-IDF vectorization
            vectorizer = TfidfVectorizer(max_features=100, stop_words='english')
            
            try:
                tfidf_matrix = vectorizer.fit_transform([user_skill_text, job_text])
                similarity = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0]
                
                # Convert to percentage and add keyword bonuses
                base_score = int(similarity * 100)
                
                # Bonus for specific keywords
                bonus_keywords = [
                    'business analyst', 'requirements', 'crm', 'sql', 'senior',
                    'stakeholder', 'process', 'analysis', 'healthcare', 'remote'
                ]
                
                bonus_score = sum(5 for keyword in bonus_keywords if keyword in job_text)
                
                final_score = min(base_score + bonus_score, 100)
                
                return final_score
                
            except ValueError:
                # If TF-IDF fails, use simple keyword matching
                return self.simple_keyword_match(job_text, user_skills)
                
        except Exception as e:
            logging.error(f"Error calculating match score: {e}")
            return 0
    
    def simple_keyword_match(self, job_text: str, user_skills: List[str]) -> int:
        """Simple keyword-based matching as fallback"""
        job_text_lower = job_text.lower()
        matches = sum(1 for skill in user_skills if skill.lower() in job_text_lower)
        return min(int((matches / len(user_skills)) * 100), 100)
    
    def filter_jobs(self, jobs_df: pd.DataFrame) -> pd.DataFrame:
        """Filter jobs based on user criteria"""
        if jobs_df.empty:
            return jobs_df
            
        filtered_jobs = jobs_df.copy()
        criteria = self.config['search_criteria']
        
        # Filter by location preferences
        if 'location' in filtered_jobs.columns:
            location_filter = '|'.join(criteria['locations'])
            filtered_jobs = filtered_jobs[
                filtered_jobs['location'].str.contains(location_filter, case=False, na=False)
            ]
        
        # Filter out blacklisted companies
        if 'blacklisted_companies' in criteria:
            blacklist_pattern = '|'.join(criteria['blacklisted_companies'])
            filtered_jobs = filtered_jobs[
                ~filtered_jobs['company'].str.contains(blacklist_pattern, case=False, na=False)
            ]
        
        # Calculate match scores
        if 'description' in filtered_jobs.columns:
            filtered_jobs['match_score'] = filtered_jobs.apply(
                lambda row: self.calculate_job_match_score(
                    str(row.get('description', '')), 
                    str(row.get('title', ''))
                ), axis=1
            )
        else:
            filtered_jobs['match_score'] = 50  # Default score
        
        # Filter by minimum match score
        min_score = criteria.get('min_match_score', 60)
        filtered_jobs = filtered_jobs[filtered_jobs['match_score'] >= min_score]
        
        # Sort by match score
        filtered_jobs = filtered_jobs.sort_values('match_score', ascending=False)
        
        return filtered_jobs
    
    def save_jobs_to_database(self, jobs_df: pd.DataFrame):
        """Save new jobs to database"""
        if jobs_df.empty:
            return
            
        conn = sqlite3.connect(self.db_path)
        new_jobs_count = 0
        
        for _, job in jobs_df.iterrows():
            job_id = f"{job.get('title', '')[:50]}_{job.get('company', '')[:30]}".replace(' ', '_')
            
            try:
                conn.execute('''
                    INSERT OR IGNORE INTO applications 
                    (job_id, title, company, location, salary_range, job_url, 
                     description, application_date, match_score, status)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'found')
                ''', (
                    job_id,
                    job.get('title', ''),
                    job.get('company', ''),
                    job.get('location', ''),
                    job.get('salary', ''),
                    job.get('job_url', ''),
                    job.get('description', ''),
                    datetime.now().date(),
                    job.get('match_score', 0)
                ))
                
                if conn.total_changes > 0:
                    new_jobs_count += 1
                    
            except sqlite3.Error as e:
                logging.error(f"Database error: {e}")
        
        conn.commit()
        conn.close()
        
        logging.info(f"Saved {new_jobs_count} new jobs to database")
        return new_jobs_count
    
    def optimize_cv_for_job(self, job_description: str, job_title: str) -> str:
        """Generate optimized CV for specific job"""
        try:
            base_cv_path = self.config['cv_settings']['base_cv_path']
            
            # Read base CV
            doc = Document(base_cv_path)
            cv_text = '\n'.join([paragraph.text for paragraph in doc.paragraphs])
            
            # Use OpenAI to optimize CV
            prompt = f"""
            Optimize this CV for the following job:
            
            Job Title: {job_title}
            Job Description: {job_description}
            
            Original CV:
            {cv_text}
            
            Please provide an optimized version that:
            1. Emphasizes relevant skills and experience
            2. Includes keywords from the job description
            3. Maintains factual accuracy
            4. Keeps the same overall structure
            5. Is ATS-friendly
            
            Return only the optimized CV text:
            """
            
            response = openai.ChatCompletion.create(
                model="gpt-3.5-turbo",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=2000,
                temperature=0.3
            )
            
            optimized_cv = response.choices[0].message.content.strip()
            
            # Save optimized CV
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"cv_optimized_{timestamp}.txt"
            filepath = Path("optimized_cvs") / filename
            filepath.parent.mkdir(exist_ok=True)
            
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(optimized_cv)
            
            return str(filepath)
            
        except Exception as e:
            logging.error(f"Error optimizing CV: {e}")
            return None
    
    def generate_cover_letter(self, job_data: Dict) -> str:
        """Generate personalized cover letter"""
        try:
            user_profile = self.config['user_profile']
            
            prompt = f"""
            Write a professional cover letter for this job application:
            
            Job Title: {job_data.get('title', '')}
            Company: {job_data.get('company', '')}
            Location: {job_data.get('location', '')}
            Job Description: {job_data.get('description', '')[:1000]}
            
            Applicant Profile:
            - Name: {user_profile['name']}
            - Current Role: {user_profile['current_role']}
            - Experience: {user_profile['experience_years']} years
            - Location: {user_profile['location']}
            - Key Skills: {', '.join(user_profile['core_competencies'][:5])}
            - Languages: {', '.join(user_profile['languages'])}
            
            Requirements:
            1. Professional tone
            2. Highlight relevant experience
            3. Show enthusiasm for the role
            4. Maximum 300 words
            5. Include specific examples when possible
            6. Address company by name
            
            Write the cover letter:
            """
            
            response = openai.ChatCompletion.create(
                model="gpt-3.5-turbo",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=800,
                temperature=0.4
            )
            
            cover_letter = response.choices[0].message.content.strip()
            
            # Save cover letter
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            company_safe = job_data.get('company', 'unknown').replace(' ', '_')[:20]
            filename = f"cover_letter_{company_safe}_{timestamp}.txt"
            filepath = Path("cover_letters") / filename
            filepath.parent.mkdir(exist_ok=True)
            
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(cover_letter)
            
            return str(filepath)
            
        except Exception as e:
            logging.error(f"Error generating cover letter: {e}")
            return None
    
    def get_high_priority_jobs(self) -> List[Dict]:
        """Get jobs that require immediate attention"""
        conn = sqlite3.connect(self.db_path)
        
        query = '''
            SELECT * FROM applications 
            WHERE status = 'found' AND match_score >= 85
            ORDER BY match_score DESC, created_at DESC
            LIMIT 10
        '''
        
        cursor = conn.execute(query)
        columns = [desc[0] for desc in cursor.description]
        
        high_priority_jobs = []
        for row in cursor.fetchall():
            job_dict = dict(zip(columns, row))
            high_priority_jobs.append(job_dict)
        
        conn.close()
        return high_priority_jobs
    
    def process_high_priority_jobs(self):
        """Process high-priority jobs (generate CV and cover letter)"""
        high_priority_jobs = self.get_high_priority_jobs()
        
        for job in high_priority_jobs:
            logging.info(f"Processing high priority job: {job['title']} at {job['company']}")
            
            # Generate optimized CV
            cv_path = self.optimize_cv_for_job(
                job.get('description', ''), 
                job.get('title', '')
            )
            
            # Generate cover letter
            cover_letter_path = self.generate_cover_letter(job)
            
            # Update database
            conn = sqlite3.connect(self.db_path)
            conn.execute('''
                UPDATE applications 
                SET status = 'ready_to_apply', 
                    cv_version = ?, 
                    cover_letter_path = ?
                WHERE id = ?
            ''', (cv_path, cover_letter_path, job['id']))
            conn.commit()
            conn.close()
            
            logging.info(f"Generated materials for: {job['title']} at {job['company']}")
    
    def log_search_results(self, platform: str, results_count: int, execution_time: float):
        """Log search results to database"""
        conn = sqlite3.connect(self.db_path)
        conn.execute('''
            INSERT INTO search_history 
            (search_date, platform, search_term, location, results_count, execution_time)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (
            datetime.now().date(),
            platform,
            self.config['search_criteria']['job_titles'][0],
            self.config['search_criteria']['locations'][0],
            results_count,
            execution_time
        ))
        conn.commit()
        conn.close()
    
    def run_daily_search(self):
        """Main daily job search routine"""
        logging.info("Starting daily job search...")
        start_time = time.time()
        
        try:
            # Search all platforms
            all_jobs = self.search_jobs_multi_platform()
            
            # Add Polish job sites
            polish_jobs = self.search_polish_job_sites()
            if not polish_jobs.empty:
                all_jobs = pd.concat([all_jobs, polish_jobs], ignore_index=True)
            
            # Filter and score jobs
            filtered_jobs = self.filter_jobs(all_jobs)
            
            # Save to database
            new_jobs_count = self.save_jobs_to_database(filtered_jobs)
            
            # Process high priority jobs
            self.process_high_priority_jobs()
            
            # Log summary
            execution_time = time.time() - start_time
            logging.info(f"Daily search completed in {execution_time:.2f}s. Found {new_jobs_count} new jobs.")
            
            return {
                'total_jobs': len(all_jobs) if not all_jobs.empty else 0,
                'filtered_jobs': len(filtered_jobs) if not filtered_jobs.empty else 0,
                'new_jobs': new_jobs_count,
                'execution_time': execution_time
            }
            
        except Exception as e:
            logging.error(f"Error in daily search: {e}")
            return None
    
    def setup_scheduler(self):
        """Setup automated job search schedule"""
        # Schedule daily search at 9 AM
        schedule.every().day.at("09:00").do(self.run_daily_search)
        
        # Schedule follow-up checks every Monday at 10 AM
        schedule.every().monday.at("10:00").do(self.check_follow_ups)
        
        logging.info("Scheduler configured. Daily search at 9:00 AM, follow-ups on Monday 10:00 AM")
    
    def check_follow_ups(self):
        """Check for applications that need follow-up"""
        conn = sqlite3.connect(self.db_path)
        
        # Find applications older than 7 days without response
        week_ago = datetime.now().date() - timedelta(days=7)
        
        query = '''
            SELECT * FROM applications 
            WHERE application_date <= ? 
            AND status = 'applied' 
            AND response_date IS NULL
        '''
        
        cursor = conn.execute(query, (week_ago,))
        follow_up_jobs = cursor.fetchall()
        
        logging.info(f"Found {len(follow_up_jobs)} jobs needing follow-up")
        
        # Mark for follow-up
        for job in follow_up_jobs:
            conn.execute('''
                UPDATE applications 
                SET status = 'follow_up_needed', 
                    follow_up_date = ?
                WHERE id = ?
            ''', (datetime.now().date(), job[0]))
        
        conn.commit()
        conn.close()
    
    def generate_report(self) -> Dict:
        """Generate performance report"""
        conn = sqlite3.connect(self.db_path)
        
        stats = {}
        
        # Application statistics
        cursor = conn.execute('SELECT status, COUNT(*) FROM applications GROUP BY status')
        stats['applications'] = dict(cursor.fetchall())
        
        # Response rate
        cursor = conn.execute('''
            SELECT 
                COUNT(CASE WHEN status = 'applied' THEN 1 END) as applied,
                COUNT(CASE WHEN response_date IS NOT NULL THEN 1 END) as responses
            FROM applications
        ''')
        
        result = cursor.fetchone()
        if result[0] > 0:
            stats['response_rate'] = round((result[1] / result[0]) * 100, 2)
        else:
            stats['response_rate'] = 0
        
        # Average match score
        cursor = conn.execute('SELECT AVG(match_score) FROM applications')
        avg_score = cursor.fetchone()[0]
        stats['avg_match_score'] = round(avg_score, 2) if avg_score else 0
        
        # Search performance
        cursor = conn.execute('''
            SELECT platform, AVG(results_count), COUNT(*) 
            FROM search_history 
            WHERE search_date >= date('now', '-30 days')
            GROUP BY platform
        ''')
        
        stats['search_performance'] = {}
        for row in cursor.fetchall():
            stats['search_performance'][row[0]] = {
                'avg_results': round(row[1], 1),
                'searches': row[2]
            }
        
        conn.close()
        return stats
    
    def run_interactive_mode(self):
        """Run interactive mode for manual operations"""
        while True:
            print("\n=== Job Search Automation System ===")
            print("1. Run job search now")
            print("2. View high priority jobs")
            print("3. Generate performance report")
            print("4. Start scheduler")
            print("5. Exit")
            
            choice = input("\nSelect option (1-5): ").strip()
            
            if choice == '1':
                result = self.run_daily_search()
                if result:
                    print(f"Search completed: {result['new_jobs']} new jobs found")
                    
            elif choice == '2':
                jobs = self.get_high_priority_jobs()
                for i, job in enumerate(jobs[:5], 1):
                    print(f"{i}. {job['title']} at {job['company']} (Score: {job['match_score']})")
                    
            elif choice == '3':
                stats = self.generate_report()
                print(json.dumps(stats, indent=2))
                
            elif choice == '4':
                self.setup_scheduler()
                print("Scheduler started. Press Ctrl+C to stop.")
                try:
                    while True:
                        schedule.run_pending()
                        time.sleep(60)
                except KeyboardInterrupt:
                    print("\nScheduler stopped.")
                    
            elif choice == '5':
                print("Goodbye!")
                break
                
            else:
                print("Invalid option. Please try again.")


def main():
    """Main entry point"""
    
    # Create default config if it doesn't exist
    config_path = 'config.json'
    if not os.path.exists(config_path):
        default_config = {
            "user_profile": {
                "name": "Sławomir (Swavek) Kublin",
                "location": "Tarnowskie Góry, Poland",
                "current_role": "Senior Business Analyst, Product Manager",
                "experience_years": 30,
                "languages": ["Polish (native)", "English (fluent)", "German (basic)"],
                "core_competencies": [
                    "Requirements elicitation and analysis",
                    "Solution design and implementation", 
                    "CRM systems specialization",
                    "Business process analysis and modelling",
                    "Data structure analysis"
                ],
                "technical_skills": [
                    "Transact-SQL", "C#", "JavaScript", "Python",
                    "Microsoft SQL Server", "Business Intelligence"
                ]
            },
            "search_criteria": {
                "job_titles": [
                    "Senior Business Analyst",
                    "Business Analyst", 
                    "Product Manager",
                    "Lead Business Analyst"
                ],
                "locations": ["Remote", "Poland", "Warsaw", "Krakow", "Wroclaw"],
                "job_types": ["Permanent", "Contract"],
                "min_match_score": 70,
                "max_results_per_platform": 50,
                "hours_old": 168,
                "blacklisted_companies": []
            },
            "cv_settings": {
                "base_cv_path": "base_cv.docx"
            }
        }
        
        with open(config_path, 'w', encoding='utf-8') as f:
            json.dump(default_config, f, indent=2)
        
        print(f"Created default config file: {config_path}")
        print("Please update the configuration and ensure you have:")
        print("1. Set OPENAI_API_KEY environment variable")
        print("2. Place your base CV as 'base_cv.docx'")
        return
    
    # Initialize and run system
    try:
        job_system = JobSearchAutomation(config_path)
        job_system.run_interactive_mode()
    except Exception as e:
        logging.error(f"System error: {e}")
        print(f"Error: {e}")


if __name__ == "__main__":
    main()
```

## Installation and Setup Instructions

### 1. Environment Setup

```bash
# Create project directory
mkdir job-search-automation
cd job-search-automation

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install requirements
pip install jobspy pandas openai python-docx scikit-learn nltk spacy schedule
python -m spacy download en_core_web_sm
```

### 2. Configuration

Create a `.env` file:
```bash
OPENAI_API_KEY=your_openai_api_key_here
```

### 3. Running the System

```bash
python job_search_automation.py
```

## Key Features Implemented

1. **Multi-Platform Job Scraping** - Uses JobSpy for LinkedIn, Indeed, Glassdoor
2. **Intelligent Job Matching** - TF-IDF vectorization for skill matching
3. **Automated CV Optimization** - OpenAI-powered CV customization
4. **Cover Letter Generation** - Personalized cover letters for each job
5. **Application Tracking** - SQLite database for managing applications
6. **Scheduling System** - Automated daily searches and follow-ups
7. **Performance Analytics** - Response rates and search effectiveness
8. **Interactive Management** - Command-line interface for manual control

## Usage Workflow

1. **Initial Setup** - Configure user profile and search criteria
2. **Daily Automation** - System searches for new jobs automatically
3. **Job Processing** - High-match jobs get optimized CVs and cover letters
4. **Application Tracking** - Monitor application status and responses
5. **Follow-up Management** - Automated reminders for pending applications
6. **Performance Review** - Regular reports on search effectiveness

This implementation provides a solid foundation for your automated job search system. You can extend it with additional features like email automation, more sophisticated NLP, or integration with specific Polish job sites.