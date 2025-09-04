#!/usr/bin/env python3
"""
Job Search Automation API
Backend service for automated job search system
"""

from flask import Flask, jsonify, request
from flask_cors import CORS
import pandas as pd
import sqlite3
import requests
from bs4 import BeautifulSoup
import json
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv
import logging
from job_scrapers import get_all_jobs, NoFluffJobsScraper, JustJoinITScraper

# Load environment variables
load_dotenv()

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend communication

# Database setup
DATABASE = 'job_search.db'

def init_database():
    """Initialize SQLite database with required tables"""
    conn = sqlite3.connect(DATABASE)
    
    # Jobs table
    conn.execute('''
        CREATE TABLE IF NOT EXISTS jobs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            company TEXT NOT NULL,
            location TEXT,
            salary_range TEXT,
            job_url TEXT,
            description TEXT,
            requirements TEXT,
            source_platform TEXT,
            match_score INTEGER DEFAULT 0,
            status TEXT DEFAULT 'found',
            posted_date DATE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(title, company)
        )
    ''')
    
    # Search history table
    conn.execute('''
        CREATE TABLE IF NOT EXISTS search_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            search_date DATE,
            platform TEXT,
            search_term TEXT,
            location TEXT,
            results_count INTEGER,
            execution_time REAL
        )
    ''')
    
    conn.commit()
    conn.close()
    logger.info("Database initialized")

def calculate_match_score(job_title, job_description, user_skills):
    """Calculate basic match score based on keyword matching"""
    if not job_description:
        job_description = ""
    
    # User skills from config
    skills = [
        "business analyst", "requirements", "crm", "sql", "senior",
        "stakeholder", "process", "analysis", "healthcare", "remote",
        "product manager", "data", "business intelligence"
    ]
    
    job_text = f"{job_title} {job_description}".lower()
    matches = sum(1 for skill in skills if skill in job_text)
    
    # Base score from matches
    base_score = min(int((matches / len(skills)) * 100), 100)
    
    # Bonus for key terms
    bonus_terms = ["senior", "business analyst", "product manager", "remote"]
    bonus = sum(10 for term in bonus_terms if term in job_text)
    
    final_score = min(base_score + bonus, 100)
    return final_score

class JobSearcher:
    """Basic job search implementation"""
    
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        })
    
    def search_real_jobs(self, search_term="Senior Business Analyst", location="Poland"):
        """Search real job sites using scrapers"""
        try:
            logger.info(f"Searching real job sites for: {search_term} in {location}")
            
            # Use the real scrapers
            real_jobs = get_all_jobs(search_term, location, max_per_source=10)
            
            if real_jobs:
                logger.info(f"Found {len(real_jobs)} real jobs from job sites")
                return real_jobs
            else:
                logger.warning("No real jobs found, falling back to demo data")
                return self.search_demo_jobs(search_term, location)
                
        except Exception as e:
            logger.error(f"Error searching real job sites: {e}")
            return self.search_demo_jobs(search_term, location)
    
    def search_demo_jobs(self, search_term="Senior Business Analyst", location="Poland"):
        """Return demo jobs as fallback"""
        demo_jobs = [
            {
                'title': 'Senior Business Analyst - Healthcare Platform',
                'company': 'HealthTech Solutions',
                'location': 'Remote, Poland',
                'salary_range': '22,000-26,000 PLN',
                'description': 'Looking for experienced BA with healthcare domain knowledge, CRM systems expertise, and requirements analysis skills.',
                'source_platform': 'demo',
                'job_url': 'https://example.com/job1',
                'posted_date': datetime.now().date().isoformat()
            },
            {
                'title': 'Product Manager - Financial Services',
                'company': 'FinanceFirst Bank',
                'location': 'Warsaw, Poland',
                'salary_range': '25,000-30,000 PLN',
                'description': 'Senior product manager role for digital banking solutions. Experience with financial services required.',
                'source_platform': 'demo',
                'job_url': 'https://example.com/job2',
                'posted_date': datetime.now().date().isoformat()
            }
        ]
        
        return demo_jobs

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({'status': 'ok', 'message': 'Job Search API is running'})

@app.route('/api/jobs/search', methods=['POST'])
def search_jobs():
    """Search for jobs across platforms"""
    try:
        data = request.get_json()
        search_term = data.get('search_term', 'Senior Business Analyst')
        location = data.get('location', 'Poland')
        
        searcher = JobSearcher()
        
        # Get jobs from real sources
        all_jobs = searcher.search_real_jobs(search_term, location)
        
        # Calculate match scores and save to database
        conn = sqlite3.connect(DATABASE)
        new_jobs_count = 0
        
        for job in all_jobs:
            match_score = calculate_match_score(
                job['title'], 
                job.get('description', ''), 
                []  # User skills would come from config
            )
            job['match_score'] = match_score
            
            # Save to database (ignore duplicates)
            try:
                conn.execute('''
                    INSERT OR IGNORE INTO jobs 
                    (title, company, location, salary_range, job_url, description, 
                     source_platform, match_score, posted_date)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    job['title'], job['company'], job['location'],
                    job['salary_range'], job['job_url'], job['description'],
                    job['source_platform'], job['match_score'], job['posted_date']
                ))
                
                if conn.total_changes > 0:
                    new_jobs_count += 1
                    
            except sqlite3.Error as e:
                logger.error(f"Database error: {e}")
        
        conn.commit()
        conn.close()
        
        # Log search history
        conn = sqlite3.connect(DATABASE)
        conn.execute('''
            INSERT INTO search_history 
            (search_date, platform, search_term, location, results_count)
            VALUES (?, ?, ?, ?, ?)
        ''', (
            datetime.now().date(), 'multi-platform', search_term, 
            location, len(all_jobs)
        ))
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True,
            'jobs': all_jobs,
            'total_found': len(all_jobs),
            'new_jobs': new_jobs_count,
            'message': f'Found {len(all_jobs)} jobs, {new_jobs_count} new'
        })
        
    except Exception as e:
        logger.error(f"Error in job search: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/jobs', methods=['GET'])
def get_jobs():
    """Get stored jobs with optional filtering"""
    try:
        # Get query parameters
        min_score = request.args.get('min_score', 0, type=int)
        location_filter = request.args.get('location', '')
        status_filter = request.args.get('status', '')
        limit = request.args.get('limit', 50, type=int)
        
        conn = sqlite3.connect(DATABASE)
        
        # Build query with filters
        query = "SELECT * FROM jobs WHERE match_score >= ?"
        params = [min_score]
        
        if location_filter:
            query += " AND location LIKE ?"
            params.append(f'%{location_filter}%')
            
        if status_filter:
            query += " AND status = ?"
            params.append(status_filter)
        
        query += " ORDER BY match_score DESC, created_at DESC LIMIT ?"
        params.append(limit)
        
        cursor = conn.execute(query, params)
        columns = [desc[0] for desc in cursor.description]
        
        jobs = []
        for row in cursor.fetchall():
            job_dict = dict(zip(columns, row))
            jobs.append(job_dict)
        
        conn.close()
        
        return jsonify({
            'jobs': jobs,
            'total': len(jobs)
        })
        
    except Exception as e:
        logger.error(f"Error getting jobs: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/jobs/<int:job_id>', methods=['GET'])
def get_job_details(job_id):
    """Get specific job details"""
    try:
        conn = sqlite3.connect(DATABASE)
        cursor = conn.execute("SELECT * FROM jobs WHERE id = ?", (job_id,))
        columns = [desc[0] for desc in cursor.description]
        
        row = cursor.fetchone()
        if row:
            job = dict(zip(columns, row))
            conn.close()
            return jsonify(job)
        else:
            conn.close()
            return jsonify({'error': 'Job not found'}), 404
            
    except Exception as e:
        logger.error(f"Error getting job details: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/jobs/<int:job_id>/status', methods=['PUT'])
def update_job_status(job_id):
    """Update job application status"""
    try:
        data = request.get_json()
        new_status = data.get('status')
        
        if new_status not in ['found', 'interested', 'applied', 'interview', 'rejected', 'offer']:
            return jsonify({'error': 'Invalid status'}), 400
        
        conn = sqlite3.connect(DATABASE)
        conn.execute("UPDATE jobs SET status = ? WHERE id = ?", (new_status, job_id))
        conn.commit()
        
        if conn.total_changes == 0:
            conn.close()
            return jsonify({'error': 'Job not found'}), 404
        
        conn.close()
        return jsonify({'success': True, 'message': 'Status updated'})
        
    except Exception as e:
        logger.error(f"Error updating job status: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/stats', methods=['GET'])
def get_statistics():
    """Get job search statistics"""
    try:
        conn = sqlite3.connect(DATABASE)
        
        # Basic statistics
        stats = {}
        
        # Total jobs by status
        cursor = conn.execute('SELECT status, COUNT(*) FROM jobs GROUP BY status')
        stats['by_status'] = dict(cursor.fetchall())
        
        # Jobs by platform
        cursor = conn.execute('SELECT source_platform, COUNT(*) FROM jobs GROUP BY source_platform')
        stats['by_platform'] = dict(cursor.fetchall())
        
        # Average match score
        cursor = conn.execute('SELECT AVG(match_score) FROM jobs')
        avg_score = cursor.fetchone()[0]
        stats['avg_match_score'] = round(avg_score, 2) if avg_score else 0
        
        # Recent search activity
        cursor = conn.execute('''
            SELECT COUNT(*) FROM search_history 
            WHERE search_date >= date('now', '-7 days')
        ''')
        stats['searches_last_week'] = cursor.fetchone()[0]
        
        conn.close()
        return jsonify(stats)
        
    except Exception as e:
        logger.error(f"Error getting statistics: {e}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    # Initialize database on startup
    init_database()
    
    # Run Flask app
    app.run(debug=True, host='0.0.0.0', port=5000)