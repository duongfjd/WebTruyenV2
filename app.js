// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAmNTV2Gn_1ja4XyYeUOTjukktzjKcbRAI",
    authDomain: "apptruyen-670b1.firebaseapp.com",
    databaseURL: "https://apptruyen-670b1-default-rtdb.firebaseio.com",
    projectId: "apptruyen-670b1",
    storageBucket: "apptruyen-670b1.firebasestorage.app",
    messagingSenderId: "786140899201",
    appId: "1:786140899201:web:ddb0a74ba0e8b000caaa80",
    measurementId: "G-GKRH6H98MR"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const auth = firebase.auth();

// DOM Elements
const searchInput = document.getElementById('searchInput');
const updatesList = document.getElementById('updatesList');
const genreGrid = document.getElementById('genreGrid');
const storyDetailModal = new bootstrap.Modal(document.getElementById('storyDetailModal'));
const chapterReaderModal = new bootstrap.Modal(document.getElementById('chapterReaderModal'));
const loadingSpinner = document.getElementById('loadingSpinner');
const toastContainer = document.getElementById('toastContainer');

// State
let currentUser = null;
let currentStory = null;
let currentChapter = null;
let stories = [];
let genres = [];
let readingHistory = [];
let fontSize = 16;

// Theme
const themeSwitch = document.getElementById('themeSwitch');
const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');

// --- AUTH LOGIC ---
const authModal = new bootstrap.Modal(document.getElementById('authModal'));
const authForm = document.getElementById('authForm');
const authEmail = document.getElementById('authEmail');
const authPassword = document.getElementById('authPassword');
const authConfirmPassword = document.getElementById('authConfirmPassword');
const authConfirmPasswordGroup = document.getElementById('authConfirmPasswordGroup');
const authModalTitle = document.getElementById('authModalTitle');
const authSubmitBtn = document.getElementById('authSubmitBtn');
const switchAuthMode = document.getElementById('switchAuthMode');

let isRegisterMode = false;

// Initialize theme
function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        document.documentElement.setAttribute('data-theme', savedTheme);
    } else if (prefersDarkScheme.matches) {
        document.documentElement.setAttribute('data-theme', 'dark');
    }
}

// Toggle theme
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing app...');
    initTheme();
    
    // Initialize Firebase connection check
    db.ref('.info/connected').on('value', (snap) => {
        if (snap.val() === true) {
            console.log('Connected to Firebase');
        } else {
            console.log('Not connected to Firebase');
        }
    });
    
    // Load initial data
    loadStories().then(() => {
        console.log('Stories loaded:', stories.length);
    }).catch(error => {
        console.error('Error loading stories:', error);
    });
    
    loadGenres().then(() => {
        console.log('Genres loaded:', genres.length);
    }).catch(error => {
        console.error('Error loading genres:', error);
    });
    
    if (currentUser) {
        loadReadingHistory().then(() => {
            console.log('Reading history loaded:', readingHistory.length);
        }).catch(error => {
            console.error('Error loading reading history:', error);
        });
    }

    // Add event listeners for filters
    document.querySelectorAll('.story-filters .btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Remove active class from all buttons
            document.querySelectorAll('.story-filters .btn').forEach(b => b.classList.remove('active'));
            // Add active class to clicked button
            e.target.classList.add('active');
            // Filter stories
            const filter = e.target.dataset.filter;
            filterStories(filter);
        });
    });

    document.querySelectorAll('.update-filters .btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Remove active class from all buttons
            document.querySelectorAll('.update-filters .btn').forEach(b => b.classList.remove('active'));
            // Add active class to clicked button
            e.target.classList.add('active');
            // Filter updates
            const timeFilter = e.target.dataset.time;
            filterUpdates(timeFilter);
        });
    });

    // Add event listeners for navigation
    document.getElementById('navHome').addEventListener('click', (e) => {
        e.preventDefault();
        showHomePage();
    });

    document.getElementById('navLibrary').addEventListener('click', (e) => {
        e.preventDefault();
        showLibraryPage();
    });

    document.getElementById('navRanking').addEventListener('click', (e) => {
        e.preventDefault();
        showRankingPage();
    });

    document.getElementById('navHistory').addEventListener('click', (e) => {
        e.preventDefault();
        showHistoryPage();
    });

    // Add event listeners for chapter navigation
    document.getElementById('prevChapterBtn').addEventListener('click', () => {
        if (currentStory && currentChapter) {
            const currentIndex = currentStory.chapters.findIndex(ch => ch.id === currentChapter.id);
            if (currentIndex > 0) {
                readChapter(currentIndex - 1);
            }
        }
    });

    document.getElementById('nextChapterBtn').addEventListener('click', () => {
        if (currentStory && currentChapter) {
            const currentIndex = currentStory.chapters.findIndex(ch => ch.id === currentChapter.id);
            if (currentIndex < currentStory.chapters.length - 1) {
                readChapter(currentIndex + 1);
            }
        }
    });

    // Add event listeners for story actions
    document.querySelector('.bookmark-btn')?.addEventListener('click', () => {
        if (currentUser && currentStory) {
            toggleBookmark(currentStory);
        } else {
            showToast('Vui lòng đăng nhập để sử dụng tính năng này', 'warning');
        }
    });

    document.querySelector('.share-btn')?.addEventListener('click', () => {
        if (currentStory) {
            shareStory(currentStory);
        }
    });

    // Show login modal when click loginBtn
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            isRegisterMode = false;
            setAuthMode();
            authModal.show();
        });
    }

    // Show logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await auth.signOut();
            showToast('Đã đăng xuất', 'success');
        });
    }

    // Switch between login/register
    switchAuthMode.addEventListener('click', (e) => {
        e.preventDefault();
        isRegisterMode = !isRegisterMode;
        setAuthMode();
    });
});

themeSwitch.addEventListener('click', toggleTheme);

// Auth state observer
auth.onAuthStateChanged((user) => {
    currentUser = user;
    updateAuthUI();
});

// Update auth UI
function updateAuthUI() {
    const user = auth.currentUser;
    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const userMenu = document.getElementById('userMenu');
    if (user) {
        if (loginBtn) loginBtn.classList.add('d-none');
        if (logoutBtn) logoutBtn.classList.remove('d-none');
        if (userMenu) userMenu.style.display = 'block';
        document.getElementById('userName').textContent = user.displayName || 'User';
    } else {
        if (loginBtn) loginBtn.classList.remove('d-none');
        if (logoutBtn) logoutBtn.classList.add('d-none');
        if (userMenu) userMenu.style.display = 'none';
    }
}

// Load stories
async function loadStories() {
    showLoading();
    try {
        console.log('Loading stories from Firebase...');
        const snapshot = await db.ref('stories').once('value');
        stories = [];
        
        if (!snapshot.exists()) {
            console.log('No stories found in database');
            showToast('Không tìm thấy truyện nào', 'warning');
            return;
        }

        snapshot.forEach((childSnapshot) => {
            const story = childSnapshot.val();
            console.log('Processing story:', story.title || childSnapshot.key);
            
            // Format story data with defaults
            const formattedStory = {
                id: childSnapshot.key,
                title: story.title || 'Chưa có tiêu đề',
                author: story.author || 'Chưa có tác giả',
                coverImage: story.image || 'https://via.placeholder.com/300x400',
                description: story.description || 'Chưa có mô tả',
                status: story.status || 'Đang tiến hành',
                views: story.views || 0,
                lastUpdated: story.lastUpdated || new Date().toISOString(),
                lastChapter: story.lastChapter || 0,
                genres: story.genre ? [story.genre] : [],
                chapters: []
            };

            // Format chapters if they exist
            if (story.chapters) {
                formattedStory.chapters = Object.entries(story.chapters)
                    .map(([id, chapter]) => ({
                        id,
                        title: chapter.title || `Chương ${chapter.number}`,
                        content: chapter.content || '',
                        date: chapter.updatedAt || new Date().toISOString(),
                        number: chapter.number || 0
                    }))
                    .sort((a, b) => a.number - b.number);
            }

            stories.push(formattedStory);
        });

        console.log(`Loaded ${stories.length} stories`);
        
        // Display stories
        displayFeaturedStories();
        displayLatestUpdates();
        
        // Update recommended stories
        updateRecommendedStories();
        
        // Update popular genres
        updatePopularGenres();
        
    } catch (error) {
        console.error('Error loading stories:', error);
        showToast('Lỗi khi tải truyện', 'danger');
    } finally {
        hideLoading();
    }
}

// Load genres
async function loadGenres() {
    showLoading();
    try {
        const snapshot = await db.ref('genres').once('value');
        genres = [];
        snapshot.forEach((childSnapshot) => {
            const genre = childSnapshot.val();
            // Format genre data
            genres.push({
                id: childSnapshot.key,
                name: genre.name || 'Chưa có tên',
                icon: genre.icon || 'bi-book',
                count: genre.count || 0
            });
        });
        displayGenres();
    } catch (error) {
        console.error('Error loading genres:', error);
        showToast('Lỗi khi tải thể loại', 'danger');
    } finally {
        hideLoading();
    }
}

// Load reading history
async function loadReadingHistory() {
    if (!currentUser) return;
    
    try {
        const snapshot = await db.ref(`users/${currentUser.uid}/readingHistory`).once('value');
        readingHistory = [];
        snapshot.forEach((childSnapshot) => {
            const history = childSnapshot.val();
            history.id = childSnapshot.key;
            readingHistory.push(history);
        });
        displayReadingHistory();
    } catch (error) {
        console.error('Error loading reading history:', error);
    }
}

// Display featured stories
function displayFeaturedStories() {
    const featuredStories = stories
        .sort((a, b) => b.views - a.views)
        .slice(0, 6);
    
    const container = document.querySelector('.featured-stories .row');
    if (!container) return;

    container.innerHTML = featuredStories.map(story => `
        <div class="col-md-4 mb-4">
            <div class="story-card fade-in">
                <div class="story-image">
                    <img src="${story.coverImage}" alt="${story.title}">
                    <div class="story-overlay">
                        <span class="badge bg-primary">${story.status}</span>
                    </div>
                </div>
                <div class="story-info">
                    <h3 class="story-title">${story.title}</h3>
                    <p class="story-author">${story.author}</p>
                    <div class="story-meta">
                        <span><i class="bi bi-eye"></i> ${formatNumber(story.views)}</span>
                        <span><i class="bi bi-book"></i> ${story.chapters.length} chương</span>
                    </div>
                </div>
            </div>
        </div>
    `).join('');

    // Add click event listeners
    container.querySelectorAll('.story-card').forEach((card, index) => {
        card.addEventListener('click', () => showStoryDetail(featuredStories[index]));
    });
}

// Display latest updates
function displayLatestUpdates() {
    const latestUpdates = stories
        .filter(story => story.lastUpdated)
        .sort((a, b) => new Date(b.lastUpdated) - new Date(a.lastUpdated))
        .slice(0, 10);
    
    const container = document.querySelector('.updates-list');
    if (!container) return;

    container.innerHTML = latestUpdates.map(story => `
        <div class="update-item fade-in">
            <img src="${story.coverImage}" alt="${story.title}">
            <div class="update-info">
                <h4 class="update-title">${story.title}</h4>
                <div class="update-meta">
                    <span>Chương ${story.lastChapter}</span>
                    <span>${formatDate(story.lastUpdated)}</span>
                </div>
            </div>
        </div>
    `).join('');

    // Add click event listeners
    container.querySelectorAll('.update-item').forEach((item, index) => {
        item.addEventListener('click', () => showStoryDetail(latestUpdates[index]));
    });
}

// Display genres
function displayGenres() {
    const container = document.querySelector('.genre-grid');
    if (!container) return;

    container.innerHTML = genres.map(genre => `
        <div class="genre-item fade-in" data-genre="${genre.id}">
            <i class="bi ${genre.icon}"></i>
            <h4>${genre.name}</h4>
            <span>${genre.count} truyện</span>
        </div>
    `).join('');

    // Add click event listeners
    container.querySelectorAll('.genre-item').forEach(item => {
        item.addEventListener('click', () => filterByGenre(item.dataset.genre));
    });
}

// Display reading history
function displayReadingHistory() {
    if (!currentUser) return;

    const container = document.getElementById('readingHistory');
    if (!container) return;

    const history = readingHistory
        .sort((a, b) => new Date(b.lastRead) - new Date(a.lastRead))
        .slice(0, 5);

    container.innerHTML = history.map(item => `
        <div class="update-item fade-in">
            <img src="${item.coverImage}" alt="${item.title}">
            <div class="update-info">
                <h4 class="update-title">${item.title}</h4>
                <div class="update-meta">
                    <span>Chapter ${item.chapter}</span>
                    <span>${formatDate(item.lastRead)}</span>
                </div>
            </div>
        </div>
    `).join('');

    // Add click event listeners
    container.querySelectorAll('.update-item').forEach((item, index) => {
        item.addEventListener('click', () => {
            const story = stories.find(s => s.id === history[index].storyId);
            if (story) {
                showStoryDetail(story);
            }
        });
    });
}

// Show story detail
function showStoryDetail(story) {
    currentStory = story;
    const modal = document.getElementById('storyDetailModal');
    
    modal.querySelector('.modal-title').textContent = story.title;
    modal.querySelector('.story-cover').src = story.coverImage;
    modal.querySelector('.story-description').textContent = story.description;
    
    const chapterList = modal.querySelector('.chapter-list tbody');
    chapterList.innerHTML = story.chapters?.map((chapter, index) => `
        <tr>
            <td>${index + 1}</td>
            <td>${chapter.title}</td>
            <td>${formatDate(chapter.date)}</td>
            <td>
                <button class="btn btn-sm btn-primary read-chapter-btn" data-chapter="${index}">
                    Đọc ngay
                </button>
            </td>
        </tr>
    `).join('') || '';

    // Add event listeners for read buttons
    chapterList.querySelectorAll('.read-chapter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent event bubbling
            const chapterIndex = parseInt(btn.dataset.chapter);
            readChapter(chapterIndex);
        });
    });

    // Add event listener for the large 'Đọc ngay' button (read-btn)
    const readNowBtn = modal.querySelector('.read-btn');
    if (readNowBtn) {
        readNowBtn.onclick = (e) => {
            e.preventDefault();
            readChapter(0); // Open the first chapter
        };
    }

    storyDetailModal.show();
}

// Read chapter
async function readChapter(chapterIndex) {
    if (!currentStory) return;
    
    showLoading();
    try {
        const chapter = currentStory.chapters[chapterIndex];
        if (!chapter) {
            throw new Error('Chapter not found');
        }
        
        currentChapter = chapter;
        
        const modal = document.getElementById('chapterReaderModal');
        modal.querySelector('.modal-title').textContent = 
            `${currentStory.title} - Chapter ${chapterIndex + 1}`;
        
        const content = modal.querySelector('.chapter-content');
        content.innerHTML = chapter.content || 'Nội dung chương đang được cập nhật...';
        
        // Update font size
        content.style.fontSize = `${fontSize}px`;
        
        // Update chapter navigation
        const chapterSelect = modal.querySelector('.chapter-navigation select');
        chapterSelect.innerHTML = currentStory.chapters.map((ch, idx) => `
            <option value="${idx}" ${idx === chapterIndex ? 'selected' : ''}>
                Chapter ${idx + 1}
            </option>
        `).join('');
        
        // Update views
        await updateStoryViews(currentStory.id);
        
        // Update reading history
        if (currentUser) {
            await updateReadingHistory(currentStory, chapterIndex);
        }
        
        storyDetailModal.hide();
        chapterReaderModal.show();
    } catch (error) {
        console.error('Error reading chapter:', error);
        showToast('Lỗi khi tải chương truyện', 'danger');
    } finally {
        hideLoading();
    }
}

// Update story views
async function updateStoryViews(storyId) {
    try {
        const storyRef = db.ref(`stories/${storyId}`);
        const snapshot = await storyRef.once('value');
        const currentViews = snapshot.val().views || 0;
        await storyRef.update({ views: currentViews + 1 });
    } catch (error) {
        console.error('Error updating views:', error);
    }
}

// Update reading history
async function updateReadingHistory(story, chapterIndex) {
    if (!currentUser) return;
    
    try {
        const historyRef = db.ref(`users/${currentUser.uid}/readingHistory/${story.id}`);
        await historyRef.set({
            storyId: story.id,
            title: story.title,
            coverImage: story.coverImage,
            chapter: chapterIndex + 1,
            lastRead: new Date().toISOString()
        });
        
        // Reload reading history
        await loadReadingHistory();
    } catch (error) {
        console.error('Error updating reading history:', error);
    }
}

// Filter by genre
function filterByGenre(genreId) {
    const filteredStories = stories.filter(story => 
        story.genres && story.genres.includes(genreId)
    );
    
    const container = document.getElementById('featuredStories');
    container.innerHTML = filteredStories.map(story => `
        <div class="col-md-4 mb-4">
            <div class="story-card fade-in">
                <div class="story-image">
                    <img src="${story.coverImage}" alt="${story.title}">
                    <div class="story-overlay">
                        <span class="badge bg-primary">${story.status}</span>
                    </div>
                </div>
                <div class="story-info">
                    <h3 class="story-title">${story.title}</h3>
                    <p class="story-author">${story.author}</p>
                    <div class="story-meta">
                        <span><i class="bi bi-eye"></i> ${formatNumber(story.views)}</span>
                        <span><i class="bi bi-book"></i> ${story.chapters?.length || 0}</span>
                    </div>
                </div>
            </div>
        </div>
    `).join('');

    // Add click event listeners
    container.querySelectorAll('.story-card').forEach((card, index) => {
        card.addEventListener('click', () => showStoryDetail(filteredStories[index]));
    });

    showToast(`Đã lọc ${filteredStories.length} truyện thể loại ${genreId}`, 'info');
}

// Search functionality
searchInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    if (query.length < 2) {
        displayFeaturedStories();
        return;
    }
    
    const filteredStories = stories.filter(story => 
        story.title.toLowerCase().includes(query) ||
        story.author.toLowerCase().includes(query)
    );
    
    const container = document.getElementById('featuredStories');
    container.innerHTML = filteredStories.map(story => `
        <div class="col-md-4 mb-4">
            <div class="story-card fade-in">
                <div class="story-image">
                    <img src="${story.coverImage}" alt="${story.title}">
                    <div class="story-overlay">
                        <span class="badge bg-primary">${story.status}</span>
                    </div>
                </div>
                <div class="story-info">
                    <h3 class="story-title">${story.title}</h3>
                    <p class="story-author">${story.author}</p>
                    <div class="story-meta">
                        <span><i class="bi bi-eye"></i> ${formatNumber(story.views)}</span>
                        <span><i class="bi bi-book"></i> ${story.chapters?.length || 0}</span>
                    </div>
                </div>
            </div>
        </div>
    `).join('');

    // Add click event listeners
    container.querySelectorAll('.story-card').forEach((card, index) => {
        card.addEventListener('click', () => showStoryDetail(filteredStories[index]));
    });
});

// Font size controls
document.getElementById('fontSizeDecrease').addEventListener('click', () => {
    if (fontSize > 12) {
        fontSize -= 2;
        updateFontSize();
    }
});

document.getElementById('fontSizeIncrease').addEventListener('click', () => {
    if (fontSize < 24) {
        fontSize += 2;
        updateFontSize();
    }
});

function updateFontSize() {
    const content = document.querySelector('.chapter-content');
    if (content) {
        content.style.fontSize = `${fontSize}px`;
    }
}

// Chapter navigation
document.querySelector('.chapter-navigation select').addEventListener('change', (e) => {
    const chapterIndex = parseInt(e.target.value);
    readChapter(chapterIndex);
});

// Loading spinner
function showLoading() {
    const spinner = document.getElementById('loadingSpinner');
    if (spinner) {
        spinner.style.display = 'flex';
    }
}

function hideLoading() {
    const spinner = document.getElementById('loadingSpinner');
    if (spinner) {
        spinner.style.display = 'none';
    }
}

// Toast notifications
function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) return;

    const toast = document.createElement('div');
    toast.className = `toast align-items-center text-white bg-${type} border-0 fade-in`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');

    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">
                ${message}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
    `;

    toastContainer.appendChild(toast);
    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();

    // Remove toast after it's hidden
    toast.addEventListener('hidden.bs.toast', () => {
        toast.remove();
    });
}

// Utility functions
function formatNumber(num) {
    return new Intl.NumberFormat().format(num);
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    }).format(date);
}

// Filter stories by status
function filterStories(status) {
    let filteredStories = [...stories];
    
    if (status !== 'all') {
        filteredStories = stories.filter(story => story.status === status);
    }
    
    const container = document.querySelector('.featured-stories .row');
    if (!container) return;

    container.innerHTML = filteredStories.map(story => `
        <div class="col-md-4 mb-4">
            <div class="story-card fade-in">
                <div class="story-image">
                    <img src="${story.coverImage}" alt="${story.title}">
                    <div class="story-overlay">
                        <span class="badge bg-primary">${story.status}</span>
                    </div>
                </div>
                <div class="story-info">
                    <h3 class="story-title">${story.title}</h3>
                    <p class="story-author">${story.author}</p>
                    <div class="story-meta">
                        <span><i class="bi bi-eye"></i> ${formatNumber(story.views)}</span>
                        <span><i class="bi bi-book"></i> ${story.chapters.length} chương</span>
                    </div>
                </div>
            </div>
        </div>
    `).join('');

    // Add click event listeners
    container.querySelectorAll('.story-card').forEach((card, index) => {
        card.addEventListener('click', () => showStoryDetail(filteredStories[index]));
    });
}

// Filter updates by time
function filterUpdates(timeFilter) {
    let filteredUpdates = [...stories];
    const now = new Date();
    
    if (timeFilter === 'today') {
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        filteredUpdates = stories.filter(story => new Date(story.lastUpdated) >= today);
    } else if (timeFilter === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        filteredUpdates = stories.filter(story => new Date(story.lastUpdated) >= weekAgo);
    }
    
    const container = document.querySelector('.updates-list');
    if (!container) return;

    container.innerHTML = filteredUpdates.map(story => `
        <div class="update-item fade-in">
            <img src="${story.coverImage}" alt="${story.title}">
            <div class="update-info">
                <h4 class="update-title">${story.title}</h4>
                <div class="update-meta">
                    <span>Chương ${story.lastChapter}</span>
                    <span>${formatDate(story.lastUpdated)}</span>
                </div>
            </div>
        </div>
    `).join('');

    // Add click event listeners
    container.querySelectorAll('.update-item').forEach((item, index) => {
        item.addEventListener('click', () => showStoryDetail(filteredUpdates[index]));
    });
}

// Navigation functions
function showHomePage() {
    document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
    document.getElementById('navHome').classList.add('active');
    loadStories();
}

function showLibraryPage() {
    document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
    document.getElementById('navLibrary').classList.add('active');
    // TODO: Implement library page
    showToast('Tính năng đang được phát triển', 'info');
}

function showRankingPage() {
    document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
    document.getElementById('navRanking').classList.add('active');
    // TODO: Implement ranking page
    showToast('Tính năng đang được phát triển', 'info');
}

function showHistoryPage() {
    document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
    document.getElementById('navHistory').classList.add('active');
    if (currentUser) {
        loadReadingHistory();
    } else {
        showToast('Vui lòng đăng nhập để xem lịch sử đọc', 'warning');
    }
}

// Bookmark function
async function toggleBookmark(story) {
    try {
        const bookmarkRef = db.ref(`users/${currentUser.uid}/bookmarks/${story.id}`);
        const snapshot = await bookmarkRef.once('value');
        
        if (snapshot.exists()) {
            await bookmarkRef.remove();
            showToast('Đã xóa khỏi danh sách đánh dấu', 'success');
        } else {
            await bookmarkRef.set({
                storyId: story.id,
                title: story.title,
                coverImage: story.coverImage,
                lastUpdated: new Date().toISOString()
            });
            showToast('Đã thêm vào danh sách đánh dấu', 'success');
        }
    } catch (error) {
        console.error('Error toggling bookmark:', error);
        showToast('Có lỗi xảy ra', 'danger');
    }
}

// Share function
function shareStory(story) {
    if (navigator.share) {
        navigator.share({
            title: story.title,
            text: `Đọc truyện ${story.title} của ${story.author}`,
            url: window.location.href
        }).catch(error => {
            console.error('Error sharing:', error);
        });
    } else {
        // Fallback for browsers that don't support Web Share API
        const url = window.location.href;
        navigator.clipboard.writeText(url).then(() => {
            showToast('Đã sao chép link vào clipboard', 'success');
        }).catch(() => {
            showToast('Không thể sao chép link', 'danger');
        });
    }
}

// Update recommended stories
function updateRecommendedStories() {
    const container = document.getElementById('recommendedStories');
    if (!container) return;

    // Get top 5 stories by views
    const recommended = [...stories]
        .sort((a, b) => b.views - a.views)
        .slice(0, 5);

    container.innerHTML = recommended.map(story => `
        <div class="recommended-item fade-in">
            <img src="${story.coverImage}" alt="${story.title}">
            <div class="recommended-info">
                <h6 class="recommended-title">${story.title}</h6>
                <div class="recommended-meta">
                    <span><i class="bi bi-eye"></i> ${formatNumber(story.views)}</span>
                    <span><i class="bi bi-book"></i> ${story.chapters.length} chương</span>
                </div>
            </div>
        </div>
    `).join('');

    // Add click event listeners
    container.querySelectorAll('.recommended-item').forEach((item, index) => {
        item.addEventListener('click', () => showStoryDetail(recommended[index]));
    });
}

// Update popular genres
function updatePopularGenres() {
    const container = document.getElementById('popularGenres');
    if (!container) return;

    // Count stories per genre
    const genreCounts = {};
    stories.forEach(story => {
        story.genres.forEach(genre => {
            genreCounts[genre] = (genreCounts[genre] || 0) + 1;
        });
    });

    // Get top 5 genres
    const popular = Object.entries(genreCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5);

    container.innerHTML = popular.map(([genre, count]) => `
        <div class="popular-genre-item fade-in">
            <i class="bi bi-bookmark"></i>
            <span>${genre}</span>
            <small>${count} truyện</small>
        </div>
    `).join('');

    // Add click event listeners
    container.querySelectorAll('.popular-genre-item').forEach((item, index) => {
        item.addEventListener('click', () => filterByGenre(popular[index][0]));
    });
}

// Error handling
window.onerror = function(msg, url, lineNo, columnNo, error) {
    console.error('Error: ', msg, '\nURL: ', url, '\nLine: ', lineNo, '\nColumn: ', columnNo, '\nError object: ', error);
    showToast('Đã xảy ra lỗi, vui lòng thử lại sau', 'danger');
    return false;
};

// Handle offline/online status
window.addEventListener('online', () => {
    showToast('Đã kết nối lại internet', 'success');
    loadStories();
});

window.addEventListener('offline', () => {
    showToast('Mất kết nối internet', 'warning');
});

// Handle visibility change
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        // Reload data when tab becomes visible
        loadStories();
    }
});

// Handle beforeunload
window.addEventListener('beforeunload', (e) => {
    if (currentStory && currentChapter) {
        // Save reading progress
        saveReadingProgress();
    }
});

// Save reading progress
async function saveReadingProgress() {
    if (!currentUser || !currentStory || !currentChapter) return;

    try {
        await db.ref(`users/${currentUser.uid}/readingProgress/${currentStory.id}`).set({
            storyId: currentStory.id,
            chapterId: currentChapter.id,
            chapterNumber: currentChapter.number,
            lastRead: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error saving reading progress:', error);
    }
}

// Load reading progress
async function loadReadingProgress() {
    if (!currentUser) return;

    try {
        const snapshot = await db.ref(`users/${currentUser.uid}/readingProgress`).once('value');
        if (snapshot.exists()) {
            const progress = snapshot.val();
            // TODO: Implement reading progress restoration
        }
    } catch (error) {
        console.error('Error loading reading progress:', error);
    }
}

// Switch between login/register
function setAuthMode() {
    if (isRegisterMode) {
        authModalTitle.textContent = 'Đăng ký';
        authSubmitBtn.textContent = 'Đăng ký';
        switchAuthMode.textContent = 'Đã có tài khoản? Đăng nhập';
        authConfirmPasswordGroup.classList.remove('d-none');
    } else {
        authModalTitle.textContent = 'Đăng nhập';
        authSubmitBtn.textContent = 'Đăng nhập';
        switchAuthMode.textContent = 'Chưa có tài khoản? Đăng ký';
        authConfirmPasswordGroup.classList.add('d-none');
    }
    authForm.reset();
}

// Handle form submit
authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = authEmail.value.trim();
    const password = authPassword.value;
    if (isRegisterMode) {
        const confirmPassword = authConfirmPassword.value;
        if (password !== confirmPassword) {
            showToast('Mật khẩu không khớp', 'danger');
            return;
        }
        try {
            await auth.createUserWithEmailAndPassword(email, password);
            showToast('Đăng ký thành công', 'success');
            authModal.hide();
        } catch (error) {
            showToast(error.message, 'danger');
        }
    } else {
        try {
            await auth.signInWithEmailAndPassword(email, password);
            showToast('Đăng nhập thành công', 'success');
            authModal.hide();
        } catch (error) {
            showToast('Sai email hoặc mật khẩu', 'danger');
        }
    }
});

// Initialize the app
loadStories();
loadGenres(); 
