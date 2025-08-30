// Application data from provided JSON
const applicationData = {
  user_profile: {
    name: "Sławomir (Swavek) Kublin",
    location: "Tarnowskie Góry, Poland",
    phone: "+48 691 21 28 48",
    email: "skublin@gmail.com",
    current_role: "Senior Business Analyst, Product Manager",
    current_company: "Briefair Information Systems Sp. z o.o.",
    experience_years: 30,
    languages: ["Polish (native)", "English (fluent)", "German (basic)"],
    location_preferences: ["Remote", "Poland", "Open to relocation for attractive offers"],
    job_types: ["Permanent", "Contract"]
  },
  core_competencies: [
    "Requirements elicitation and analysis",
    "Solution design and implementation", 
    "CRM systems specialization",
    "Business process analysis and modelling",
    "Data structure analysis",
    "System architecture design",
    "Stakeholder relationship management",
    "Requirements management and communication",
    "Solution validation"
  ],
  technical_skills: [
    "Transact-SQL", "C#", "JavaScript", "HTML", "CSS", "Visual Basic", "Java", "Python",
    "Microsoft SQL Server", "SQL Server administration", "Integration Services (SISS)",
    "Reporting Services", "Business Intelligence"
  ],
  job_sources: [
    {
      name: "NoFluffJobs",
      url: "https://nofluffjobs.com/",
      focus: "IT/Tech positions with transparent salaries"
    },
    {
      name: "JustJoin.IT", 
      url: "https://justjoin.it/",
      focus: "Tech job board"
    },
    {
      name: "LinkedIn Poland",
      url: "https://pl.linkedin.com/jobs/",
      focus: "Professional roles"
    },
    {
      name: "Remote Jobs",
      url: "https://www.remoterocketship.com/country/poland/",
      focus: "Remote work opportunities"
    }
  ],
  sample_jobs: [
    {
      id: 1,
      title: "Senior Business Analyst - Healthcare Platform",
      company: "HealthTech Solutions",
      location: "Remote, Poland",
      salary: "22,000-26,000 PLN",
      type: "Permanent",
      description: "Looking for experienced BA with healthcare domain knowledge, CRM systems expertise, and requirements analysis skills. Remote work with occasional travel to Warsaw office.",
      match_score: 95,
      posted: "2024-08-28",
      skills_required: ["Requirements Analysis", "CRM", "Healthcare", "SQL", "Business Process Modeling"],
      status: "Not Applied"
    },
    {
      id: 2,
      title: "Product Manager - Financial Services",
      company: "FinanceFirst Bank",
      location: "Warsaw, Poland",
      salary: "25,000-30,000 PLN", 
      type: "Permanent",
      description: "Senior product manager role for digital banking solutions. Experience with financial services and system integration required.",
      match_score: 87,
      posted: "2024-08-27",
      skills_required: ["Product Management", "Financial Services", "System Integration", "Stakeholder Management"],
      status: "Interested"
    },
    {
      id: 3,
      title: "Lead Business Analyst - ERP Implementation",
      company: "Enterprise Solutions Ltd",
      location: "Kraków, Poland",
      salary: "28,000-32,000 PLN",
      type: "Contract (12 months)",
      description: "Lead BA for major ERP implementation project. Must have experience with system integration and team leadership.",
      match_score: 92,
      posted: "2024-08-26",
      skills_required: ["ERP", "System Integration", "Team Leadership", "Requirements Management"],
      status: "Applied"
    },
    {
      id: 4,
      title: "Senior Business Analyst - Remote",
      company: "TechGlobal Inc",
      location: "Remote (EU timezone)",
      salary: "€45,000-55,000",
      type: "Permanent",
      description: "Fully remote position for EU-based senior BA. Focus on CRM and customer-facing systems for international markets.",
      match_score: 88,
      posted: "2024-08-25", 
      skills_required: ["CRM", "Customer Systems", "International Experience", "Remote Work"],
      status: "Interview Scheduled"
    }
  ]
};

// Application state
let appState = {
  currentTab: 'dashboard',
  uploadedCV: null,
  searchCriteria: {},
  selectedJob: null,
  applications: [],
  chartsInitialized: false,
  jobs: [], // Store jobs from API
  isLoading: false
};

// API configuration
const API_BASE_URL = 'http://localhost:5000/api';

// API helper functions
async function apiCall(endpoint, options = {}) {
  try {
    appState.isLoading = true;
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('API call failed:', error);
    throw error;
  } finally {
    appState.isLoading = false;
  }
}

async function searchJobs(searchTerm = 'Senior Business Analyst', location = 'Poland') {
  return await apiCall('/jobs/search', {
    method: 'POST',
    body: JSON.stringify({
      search_term: searchTerm,
      location: location
    })
  });
}

async function getJobs(filters = {}) {
  const params = new URLSearchParams();
  
  if (filters.min_score) params.append('min_score', filters.min_score);
  if (filters.location) params.append('location', filters.location);
  if (filters.status) params.append('status', filters.status);
  if (filters.limit) params.append('limit', filters.limit);
  
  const queryString = params.toString();
  return await apiCall(`/jobs${queryString ? `?${queryString}` : ''}`);
}

async function updateJobStatus(jobId, status) {
  return await apiCall(`/jobs/${jobId}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status })
  });
}

async function getJobStats() {
  return await apiCall('/stats');
}

// Initialize application
document.addEventListener('DOMContentLoaded', function() {
  initializeApp();
  setupEventListeners();
  populateJobSources();
  populateDashboardJobs();
  populateJobTable();
  populateApplicationTracking();
});

async function initializeApp() {
  // Set initial tab
  switchTab('dashboard');
  
  // Try to load existing jobs from API
  try {
    await populateJobTable();
    await populateDashboardJobs();
  } catch (error) {
    console.log('No backend connection - using demo mode');
  }
}

function setupEventListeners() {
  // Tab navigation
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
      e.preventDefault();
      const tabId = e.target.getAttribute('data-tab');
      if (tabId) {
        switchTab(tabId);
      }
    });
  });

  // CV file upload
  const cvFileInput = document.getElementById('cv-file');
  if (cvFileInput) {
    cvFileInput.addEventListener('change', handleCVUpload);
  }

  // Job search form
  const searchForm = document.getElementById('job-search-form');
  if (searchForm) {
    searchForm.addEventListener('submit', handleJobSearch);
  }

  // CV optimization
  const optimizationJob = document.getElementById('optimization-job');
  if (optimizationJob) {
    optimizationJob.addEventListener('change', handleJobOptimization);
  }

  // Cover letter generation
  const generateLetterBtn = document.getElementById('generate-letter');
  if (generateLetterBtn) {
    generateLetterBtn.addEventListener('click', generateCoverLetter);
  }

  // Export buttons
  const exportCVBtn = document.getElementById('export-cv');
  if (exportCVBtn) {
    exportCVBtn.addEventListener('click', exportOptimizedCV);
  }

  const exportLetterBtn = document.getElementById('export-letter');
  if (exportLetterBtn) {
    exportLetterBtn.addEventListener('click', exportCoverLetter);
  }

  // Table sorting and filtering
  const sortBy = document.getElementById('sort-by');
  if (sortBy) {
    sortBy.addEventListener('change', handleTableSort);
  }

  const filterStatus = document.getElementById('filter-status');
  if (filterStatus) {
    filterStatus.addEventListener('change', handleTableFilter);
  }

  // Modal click outside to close
  window.addEventListener('click', function(event) {
    const modal = document.getElementById('job-modal');
    if (event.target === modal) {
      closeJobModal();
    }
  });

  // Handle escape key for modal
  window.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
      closeJobModal();
    }
  });
}

function switchTab(tabId) {
  // Update active tab
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.classList.remove('active');
  });
  
  const activeTab = document.querySelector(`[data-tab="${tabId}"]`);
  if (activeTab) {
    activeTab.classList.add('active');
  }

  // Update tab content
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.remove('active');
  });
  
  const activeContent = document.getElementById(tabId);
  if (activeContent) {
    activeContent.classList.add('active');
  }

  appState.currentTab = tabId;

  // Initialize specific tab content
  if (tabId === 'cv-optimizer' || tabId === 'cover-letter') {
    populateJobSelectors();
  }
  
  if (tabId === 'analytics') {
    setTimeout(() => {
      if (!appState.chartsInitialized) {
        initializeCharts();
        appState.chartsInitialized = true;
      }
    }, 100);
  }
}

function populateJobSources() {
  const container = document.getElementById('job-sources-list');
  if (!container) return;

  container.innerHTML = '';
  applicationData.job_sources.forEach(source => {
    const sourceDiv = document.createElement('div');
    sourceDiv.className = 'source-item';
    sourceDiv.innerHTML = `
      <input type="checkbox" id="source-${source.name}" checked>
      <div class="source-info">
        <h4>${source.name}</h4>
        <p>${source.focus}</p>
      </div>
    `;
    container.appendChild(sourceDiv);
  });
}

async function populateDashboardJobs() {
  const container = document.getElementById('dashboard-jobs');
  if (!container) return;

  try {
    // Get top jobs for dashboard
    if (appState.jobs.length === 0) {
      const response = await getJobs({ min_score: 60, limit: 10 });
      appState.jobs = response.jobs || [];
    }

    container.innerHTML = '';
    
    if (appState.jobs.length === 0) {
      container.innerHTML = '<p>Brak ofert pracy. Użyj wyszukiwarki aby znaleźć nowe oferty.</p>';
      return;
    }

    // Show top 3 jobs sorted by match score
    const topJobs = appState.jobs
      .sort((a, b) => (b.match_score || 0) - (a.match_score || 0))
      .slice(0, 3);

    topJobs.forEach(job => {
      const jobDiv = document.createElement('div');
      jobDiv.className = 'job-item';
      jobDiv.innerHTML = `
        <div class="job-info">
          <h4>${job.title || 'Brak tytułu'}</h4>
          <p>${job.company || 'Brak firmy'} • ${job.location || 'Nie określono'}</p>
        </div>
        <div class="match-score">${job.match_score || 0}%</div>
      `;
      jobDiv.addEventListener('click', () => showJobDetails(job.id));
      jobDiv.style.cursor = 'pointer';
      container.appendChild(jobDiv);
    });
    
  } catch (error) {
    console.error('Error populating dashboard jobs:', error);
    container.innerHTML = '<p>Błąd podczas ładowania ofert pracy.</p>';
  }
}

async function populateJobTable() {
  const tbody = document.getElementById('jobs-table-body');
  if (!tbody) return;

  try {
    // Get jobs from API if not already loaded
    if (appState.jobs.length === 0) {
      const response = await getJobs({ min_score: 50, limit: 50 });
      appState.jobs = response.jobs || [];
    }

    tbody.innerHTML = '';
    
    if (appState.jobs.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7">Brak ofert pracy. Użyj wyszukiwarki aby znaleźć nowe oferty.</td></tr>';
      return;
    }

    appState.jobs.forEach(job => {
      const row = document.createElement('tr');
      const statusClass = (job.status || 'found').toLowerCase().replace(/\s+/g, '-');
      
      row.innerHTML = `
        <td class="job-title-cell">${job.title || 'Brak tytułu'}</td>
        <td class="company-cell">${job.company || 'Brak firmy'}</td>
        <td>${job.location || 'Nie określono'}</td>
        <td class="salary-cell">${job.salary_range || 'Nie określono'}</td>
        <td><span class="match-percentage">${job.match_score || 0}%</span></td>
        <td><span class="status status--${statusClass}">${mapStatusToPolish(job.status || 'found')}</span></td>
        <td class="job-actions">
          <button class="btn btn--primary btn-small" onclick="showJobDetails(${job.id})">Zobacz</button>
          <button class="btn btn--secondary btn-small" onclick="toggleJobInterest(${job.id})">⭐</button>
        </td>
      `;
      tbody.appendChild(row);
    });
    
  } catch (error) {
    console.error('Error populating job table:', error);
    tbody.innerHTML = '<tr><td colspan="7">Błąd podczas ładowania ofert pracy.</td></tr>';
  }
}

function mapStatusToPolish(status) {
  const statusMap = {
    'found': 'Znaleziono',
    'interested': 'Zainteresowany',
    'applied': 'Aplikowano',
    'interview': 'Rozmowa',
    'rejected': 'Odrzucono',
    'offer': 'Oferta'
  };
  return statusMap[status] || status;
}

function populateJobSelectors() {
  const optimizationSelect = document.getElementById('optimization-job');
  const letterJobSelect = document.getElementById('letter-job');

  const options = applicationData.sample_jobs.map(job => 
    `<option value="${job.id}">${job.title} - ${job.company}</option>`
  ).join('');

  if (optimizationSelect) {
    optimizationSelect.innerHTML = '<option value="">Wybierz ofertę pracy...</option>' + options;
  }

  if (letterJobSelect) {
    letterJobSelect.innerHTML = '<option value="">Wybierz ofertę pracy...</option>' + options;
  }
}

function handleCVUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  appState.uploadedCV = file;
  
  // Show analysis section
  const analysisSection = document.getElementById('cv-analysis');
  if (analysisSection) {
    analysisSection.classList.remove('hidden');
  }

  // Populate extracted skills
  const skillsContainer = document.getElementById('extracted-skills');
  if (skillsContainer) {
    skillsContainer.innerHTML = '';
    applicationData.technical_skills.slice(0, 8).forEach(skill => {
      const tag = document.createElement('span');
      tag.className = 'skill-tag';
      tag.textContent = skill;
      skillsContainer.appendChild(tag);
    });
  }

  // Populate suggestions
  const suggestionsContainer = document.getElementById('cv-suggestions');
  if (suggestionsContainer) {
    const suggestions = [
      'Dodaj więcej słów kluczowych związanych z analizą biznesową',
      'Uwzględnij konkretne metryki i osiągnięcia',
      'Popraw formatowanie dla lepszej czytelności ATS',
      'Dodaj sekcję z certyfikatami i szkoleniami'
    ];
    
    suggestionsContainer.innerHTML = '';
    suggestions.forEach(suggestion => {
      const li = document.createElement('li');
      li.textContent = suggestion;
      suggestionsContainer.appendChild(li);
    });
  }
}

async function handleJobSearch(event) {
  event.preventDefault();
  
  try {
    // Collect search criteria
    appState.searchCriteria = {
      titles: document.getElementById('job-titles')?.value || 'Senior Business Analyst',
      location: document.getElementById('location-pref')?.value || 'Poland',
      salary: document.getElementById('salary-range')?.value || '',
      contractType: document.getElementById('contract-type')?.value || '',
      frequency: document.getElementById('search-frequency')?.value || ''
    };

    // Show loading state
    showLoadingMessage('Wyszukiwanie ofert pracy...');

    // Search for jobs using API
    const searchResult = await searchJobs(appState.searchCriteria.titles, appState.searchCriteria.location);
    
    if (searchResult.success) {
      // Store jobs in app state
      appState.jobs = searchResult.jobs || [];
      
      // Update job table with new data
      populateJobTable();
      populateDashboardJobs();
      
      // Show success message
      alert(`Znaleziono ${searchResult.total_found} ofert pracy, ${searchResult.new_jobs} nowych!`);
      
      // Switch to results tab
      switchTab('job-results');
    } else {
      throw new Error('Search failed');
    }
    
  } catch (error) {
    console.error('Job search failed:', error);
    alert('Błąd podczas wyszukiwania ofert pracy. Sprawdź czy serwer jest uruchomiony.');
  } finally {
    hideLoadingMessage();
  }
}

function showLoadingMessage(message) {
  // You can implement a loading indicator here
  console.log('Loading:', message);
}

function hideLoadingMessage() {
  console.log('Loading complete');
}

function handleJobOptimization() {
  const jobId = document.getElementById('optimization-job')?.value;
  if (!jobId) return;

  const job = applicationData.sample_jobs.find(j => j.id == jobId);
  if (!job) return;

  // Show optimization results
  const resultsSection = document.getElementById('optimization-results');
  if (resultsSection) {
    resultsSection.classList.remove('hidden');
  }

  // Populate keyword analysis
  const keywordsContainer = document.getElementById('keywords-match');
  if (keywordsContainer) {
    keywordsContainer.innerHTML = '';
    
    job.skills_required.forEach(skill => {
      const keywordDiv = document.createElement('div');
      const isFound = applicationData.core_competencies.some(comp => 
        comp.toLowerCase().includes(skill.toLowerCase()) ||
        skill.toLowerCase().includes(comp.toLowerCase())
      ) || applicationData.technical_skills.some(tech => 
        tech.toLowerCase().includes(skill.toLowerCase())
      );
      
      keywordDiv.className = `keyword-match ${isFound ? 'found' : 'missing'}`;
      keywordDiv.textContent = skill;
      keywordsContainer.appendChild(keywordDiv);
    });
  }

  // Populate optimization suggestions
  const suggestionsContainer = document.getElementById('optimization-suggestions');
  if (suggestionsContainer) {
    const suggestions = [
      {
        title: 'Dodaj brakujące słowa kluczowe',
        content: `Uwzględnij: ${job.skills_required.join(', ')}`
      },
      {
        title: 'Podkreśl doświadczenie w branży',
        content: `Dostosuj doświadczenie do wymagań: ${job.type}`
      },
      {
        title: 'Optymalizuj nagłówek',
        content: `Użyj tytułu stanowiska: ${job.title}`
      }
    ];

    suggestionsContainer.innerHTML = '';
    suggestions.forEach(suggestion => {
      const suggestionDiv = document.createElement('div');
      suggestionDiv.className = 'suggestion-item';
      suggestionDiv.innerHTML = `
        <h4>${suggestion.title}</h4>
        <p>${suggestion.content}</p>
      `;
      suggestionsContainer.appendChild(suggestionDiv);
    });
  }

  // Update CV preview
  const optimizedCV = document.getElementById('optimized-cv');
  if (optimizedCV) {
    optimizedCV.innerHTML = `
      <h4>Sławomir (Swavek) Kublin</h4>
      <p><strong>Senior Business Analyst | ${job.title}</strong></p>
      <p>Email: skublin@gmail.com | Tel: +48 691 21 28 48</p>
      <p>Lokalizacja: Tarnowskie Góry, Poland</p>
      
      <h5>Doświadczenie zawodowe</h5>
      <p><strong>Senior Business Analyst, Product Manager</strong><br>
      Briefair Information Systems Sp. z o.o. | 2015 - obecnie</p>
      <p>• ${job.skills_required.join('<br>• ')}</p>
      
      <h5>Kluczowe umiejętności</h5>
      <p>${applicationData.core_competencies.slice(0, 5).join(' • ')}</p>
      
      <h5>Umiejętności techniczne</h5>
      <p>${applicationData.technical_skills.slice(0, 6).join(' • ')}</p>
    `;
  }
}

function generateCoverLetter() {
  const jobId = document.getElementById('letter-job')?.value;
  const template = document.getElementById('letter-template')?.value || 'professional';
  const length = document.getElementById('letter-length')?.value || 'medium';
  
  if (!jobId) {
    alert('Proszę wybrać ofertę pracy.');
    return;
  }

  const job = applicationData.sample_jobs.find(j => j.id == jobId);
  if (!job) return;

  // Show letter preview
  const previewSection = document.getElementById('letter-preview');
  if (previewSection) {
    previewSection.classList.remove('hidden');
  }

  // Generate letter content
  const letterContent = document.getElementById('letter-content');
  if (letterContent) {
    letterContent.innerHTML = `
      <p><strong>Sławomir (Swavek) Kublin</strong><br>
      Tarnowskie Góry, Poland<br>
      Tel: +48 691 21 28 48<br>
      Email: skublin@gmail.com</p>
      
      <p>${new Date().toLocaleDateString('pl-PL')}</p>
      
      <p><strong>${job.company}</strong><br>
      Dział Rekrutacji</p>
      
      <p><strong>Dotyczy: Aplikacja na stanowisko ${job.title}</strong></p>
      
      <p>Szanowni Państwo,</p>
      
      <p>Z zainteresowaniem przeczytałem ogłoszenie o wolnym stanowisku ${job.title} w ${job.company}. 
      Moje 30-letnie doświadczenie jako Senior Business Analyst oraz Product Manager idealnie 
      koresponduje z wymaganiami opisanymi w ofercie.</p>
      
      <p>W mojej obecnej roli w Briefair Information Systems specjalizuję się w:</p>
      <ul>
        <li>Analizie wymagań biznesowych i projektowaniu rozwiązań</li>
        <li>Systemach CRM i architekturze systemowej</li>
        <li>Zarządzaniu relacjami z interesariuszami</li>
        <li>Modelowaniu procesów biznesowych</li>
      </ul>
      
      <p>Szczególnie interesuje mnie możliwość pracy w ${job.location === 'Remote, Poland' ? 'trybie zdalnym' : job.location}, 
      co doskonale odpowiada moim preferencjom zawodowym. Moje umiejętności w zakresie ${job.skills_required.join(', ')} 
      pozwolą mi wnieść znaczący wkład w rozwój Państwa organizacji.</p>
      
      <p>Będę wdzięczny za możliwość omówienia mojej kandydatury podczas rozmowy kwalifikacyjnej.</p>
      
      <p>Z poważaniem,<br>
      Sławomir (Swavek) Kublin</p>
    `;
  }
}

function showJobDetails(jobId) {
  const job = appState.jobs.find(j => j.id == jobId);
  if (!job) {
    console.error('Job not found:', jobId);
    return;
  }

  const modal = document.getElementById('job-modal');
  const title = document.getElementById('modal-job-title');
  const content = document.getElementById('modal-job-content');
  
  if (modal && title && content) {
    title.textContent = job.title || 'Brak tytułu';
    
    // Parse skills from requirements or description
    let skillsHtml = '<p>Brak wymagań</p>';
    if (job.requirements || job.description) {
      const skillsText = job.requirements || job.description || '';
      const commonSkills = ['SQL', 'Business Analyst', 'CRM', 'Requirements', 'Process', 'Analysis', 'Stakeholder', 'Remote'];
      const foundSkills = commonSkills.filter(skill => 
        skillsText.toLowerCase().includes(skill.toLowerCase())
      );
      
      if (foundSkills.length > 0) {
        skillsHtml = `<div class="skills-tags">
          ${foundSkills.map(skill => `<span class="skill-tag">${skill}</span>`).join('')}
        </div>`;
      }
    }
    
    content.innerHTML = `
      <div class="job-detail-grid">
        <div class="job-detail-info">
          <h4>Informacje o stanowisku</h4>
          <p><strong>Firma:</strong> ${job.company || 'Brak danych'}</p>
          <p><strong>Lokalizacja:</strong> ${job.location || 'Nie określono'}</p>
          <p><strong>Wynagrodzenie:</strong> ${job.salary_range || 'Nie określono'}</p>
          <p><strong>Źródło:</strong> ${job.source_platform || 'Nieznane'}</p>
          <p><strong>Data publikacji:</strong> ${job.posted_date || job.created_at || 'Brak danych'}</p>
          <p><strong>Dopasowanie:</strong> <span class="match-percentage">${job.match_score || 0}%</span></p>
          <p><strong>Status:</strong> ${mapStatusToPolish(job.status || 'found')}</p>
        </div>
        
        <div class="job-description">
          <h4>Opis stanowiska</h4>
          <p>${job.description || 'Brak opisu'}</p>
          
          <h4>Wymagane umiejętności</h4>
          ${skillsHtml}
          
          ${job.job_url ? `<p><strong>Link:</strong> <a href="${job.job_url}" target="_blank">Zobacz ofertę</a></p>` : ''}
        </div>
      </div>
    `;
    
    appState.selectedJob = job;
    modal.classList.remove('hidden');
  }
}

function closeJobModal() {
  const modal = document.getElementById('job-modal');
  if (modal) {
    modal.classList.add('hidden');
    appState.selectedJob = null;
  }
}

function applyToJob() {
  if (!appState.selectedJob) return;
  
  // Update job status
  appState.selectedJob.status = 'Applied';
  
  // Add to applications tracking
  appState.applications.push({
    id: appState.selectedJob.id,
    title: appState.selectedJob.title,
    company: appState.selectedJob.company,
    appliedDate: new Date(),
    status: 'Applied'
  });

  alert(`Aplikacja na stanowisko ${appState.selectedJob.title} została zapisana!`);
  
  // Refresh tables
  populateJobTable();
  populateApplicationTracking();
  
  closeJobModal();
}

async function toggleJobInterest(jobId) {
  try {
    const job = appState.jobs.find(j => j.id == jobId);
    if (!job) return;
    
    // Toggle between interested and found
    const newStatus = job.status === 'interested' ? 'found' : 'interested';
    
    // Update via API
    await updateJobStatus(jobId, newStatus);
    
    // Update local state
    job.status = newStatus;
    
    // Refresh UI
    populateJobTable();
    populateDashboardJobs();
    
  } catch (error) {
    console.error('Error toggling job interest:', error);
    alert('Błąd podczas aktualizacji statusu oferty.');
  }
}

function handleTableSort() {
  const sortBy = document.getElementById('sort-by')?.value;
  if (!sortBy) return;
  
  applicationData.sample_jobs.sort((a, b) => {
    switch(sortBy) {
      case 'match':
        return b.match_score - a.match_score;
      case 'date':
        return new Date(b.posted) - new Date(a.posted);
      case 'salary':
        const salaryA = parseInt(a.salary.replace(/[^\d]/g, '')) || 0;
        const salaryB = parseInt(b.salary.replace(/[^\d]/g, '')) || 0;
        return salaryB - salaryA;
      default:
        return 0;
    }
  });
  
  populateJobTable();
}

function handleTableFilter() {
  const filterStatus = document.getElementById('filter-status')?.value;
  const tbody = document.getElementById('jobs-table-body');
  
  if (!tbody || !filterStatus) return;
  
  Array.from(tbody.children).forEach(row => {
    const statusCell = row.querySelector('.status');
    if (!statusCell) return;
    
    const status = statusCell.textContent.toLowerCase().replace(/\s+/g, '-');
    
    if (filterStatus === 'all' || status === filterStatus) {
      row.style.display = '';
    } else {
      row.style.display = 'none';
    }
  });
}

function populateApplicationTracking() {
  const timeline = document.getElementById('applications-timeline');
  if (!timeline) return;

  const timelineItems = [
    {
      date: '2024-08-28',
      title: 'Aplikacja wysłana',
      description: 'Senior Business Analyst - HealthTech Solutions'
    },
    {
      date: '2024-08-27',
      title: 'CV zoptymalizowane',
      description: 'Product Manager - FinanceFirst Bank'
    },
    {
      date: '2024-08-26',
      title: 'Rozmowa zaplanowana',
      description: 'Senior Business Analyst - TechGlobal Inc'
    },
    {
      date: '2024-08-25',
      title: 'Odpowiedź otrzymana',
      description: 'Lead Business Analyst - Enterprise Solutions Ltd'
    }
  ];

  timeline.innerHTML = '';
  timelineItems.forEach(item => {
    const itemDiv = document.createElement('div');
    itemDiv.className = 'timeline-item';
    itemDiv.innerHTML = `
      <div class="timeline-date">${item.date}</div>
      <div class="timeline-content">
        <h4>${item.title}</h4>
        <p>${item.description}</p>
      </div>
    `;
    timeline.appendChild(itemDiv);
  });
}

function initializeCharts() {
  // Application Rate Chart
  const ctx1 = document.getElementById('application-rate-chart');
  if (ctx1 && !ctx1.chart) {
    ctx1.chart = new Chart(ctx1, {
      type: 'line',
      data: {
        labels: ['Sty', 'Lut', 'Mar', 'Kwi', 'Maj', 'Cze'],
        datasets: [{
          label: 'Wysłane aplikacje',
          data: [2, 5, 3, 8, 6, 4],
          borderColor: '#1FB8CD',
          backgroundColor: 'rgba(31, 184, 205, 0.1)',
          tension: 0.4,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    });
  }

  // Salary Trends Chart
  const ctx2 = document.getElementById('salary-trends-chart');
  if (ctx2 && !ctx2.chart) {
    ctx2.chart = new Chart(ctx2, {
      type: 'bar',
      data: {
        labels: ['Junior', 'Mid', 'Senior', 'Lead'],
        datasets: [{
          label: 'Wynagrodzenie (PLN)',
          data: [9000, 17700, 21700, 29500],
          backgroundColor: ['#FFC185', '#B4413C', '#1FB8CD', '#5D878F']
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function(value) {
                return value.toLocaleString() + ' PLN';
              }
            }
          }
        }
      }
    });
  }

  // Job Sources Chart
  const ctx3 = document.getElementById('job-sources-chart');
  if (ctx3 && !ctx3.chart) {
    ctx3.chart = new Chart(ctx3, {
      type: 'doughnut',
      data: {
        labels: ['NoFluffJobs', 'JustJoin.IT', 'LinkedIn', 'Remote Jobs'],
        datasets: [{
          data: [35, 25, 30, 10],
          backgroundColor: ['#1FB8CD', '#FFC185', '#B4413C', '#ECEBD5']
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom'
          }
        }
      }
    });
  }

  // Response Time Chart
  const ctx4 = document.getElementById('response-time-chart');
  if (ctx4 && !ctx4.chart) {
    ctx4.chart = new Chart(ctx4, {
      type: 'bar',
      data: {
        labels: ['1-3 dni', '4-7 dni', '8-14 dni', '15+ dni', 'Brak odpowiedzi'],
        datasets: [{
          label: 'Liczba odpowiedzi',
          data: [2, 4, 3, 1, 6],
          backgroundColor: ['#5D878F', '#1FB8CD', '#FFC185', '#B4413C', '#DB4545']
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    });
  }

  // Populate insights
  populateInsights();
}

function populateInsights() {
  const insightsList = document.getElementById('insights-list');
  if (!insightsList) return;

  const insights = [
    {
      title: 'Najlepszy czas na aplikacje',
      content: 'Aplikacje wysyłane we wtorki i środy mają 40% wyższą szansę na odpowiedź.'
    },
    {
      title: 'Trendy wynagrodzeń',
      content: 'Wynagrodzenia dla Senior BA w Polsce wzrosły o 15% w ostatnim roku.'
    },
    {
      title: 'Słowa kluczowe',
      content: 'Oferty zawierające "CRM" i "SQL" mają najwyższy wskaźnik dopasowania do Twojego profilu.'
    },
    {
      title: 'Rekomendacja',
      content: 'Rozważ poszerzenie wyszukiwania o stanowiska Product Owner - 85% dopasowanie umiejętności.'
    }
  ];

  insightsList.innerHTML = '';
  insights.forEach(insight => {
    const insightDiv = document.createElement('div');
    insightDiv.className = 'insight-item';
    insightDiv.innerHTML = `
      <h4>${insight.title}</h4>
      <p>${insight.content}</p>
    `;
    insightsList.appendChild(insightDiv);
  });
}

function exportOptimizedCV() {
  const jobId = document.getElementById('optimization-job')?.value;
  if (!jobId) {
    alert('Najpierw wybierz ofertę do optymalizacji CV.');
    return;
  }
  
  alert('Zoptymalizowane CV zostało wyeksportowane jako PDF.');
}

function exportCoverLetter() {
  const jobId = document.getElementById('letter-job')?.value;
  if (!jobId) {
    alert('Najpierw wygeneruj list motywacyjny.');
    return;
  }
  
  alert('List motywacyjny został wyeksportowany jako PDF.');
}

// Global functions for onclick handlers
window.switchTab = switchTab;
window.showJobDetails = showJobDetails;
window.closeJobModal = closeJobModal;
window.applyToJob = applyToJob;
window.toggleJobInterest = toggleJobInterest;