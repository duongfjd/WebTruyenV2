// Firebase configuration
const firebaseConfig = {
    // Your Firebase config here
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const auth = firebase.auth();

// DOM Elements
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const navStories = document.getElementById('navStories');
const navUsers = document.getElementById('navUsers');
const mainContent = document.getElementById('mainContent');
const searchInput = document.getElementById('searchInput');
const sortSelect = document.getElementById('sortSelect');
const genreList = document.getElementById('genreList');
const themeToggle = document.getElementById('themeToggle');
const spinner = document.querySelector('.spinner-overlay');

// Theme handling
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.body.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
}

function toggleTheme() {
    const currentTheme = document.body.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.body.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
}

function updateThemeIcon(theme) {
    const icon = themeToggle.querySelector('i');
    icon.className = theme === 'light' ? 'bi bi-moon-stars' : 'bi bi-sun';
}

// Loading spinner
function showSpinner() {
    spinner.classList.remove('d-none');
}

function hideSpinner() {
    spinner.classList.add('d-none');
}

// Toast notifications
function showToast(title, message, type = 'info') {
    const toast = document.getElementById('toast');
    const toastTitle = document.getElementById('toastTitle');
    const toastMessage = document.getElementById('toastMessage');
    
    toastTitle.textContent = title;
    toastMessage.textContent = message;
    toast.className = `toast ${type}`;
    
    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();
}

// Authentication
function initAuth() {
    auth.onAuthStateChanged(user => {
        if (user) {
            loginBtn.classList.add('d-none');
            logoutBtn.classList.remove('d-none');
            loadStories();
        } else {
            loginBtn.classList.remove('d-none');
            logoutBtn.classList.add('d-none');
            mainContent.innerHTML = '<div class="alert alert-info">Vui lòng đăng nhập để tiếp tục</div>';
        }
    });
}

loginBtn.addEventListener('click', () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider)
        .then(() => showToast('Thành công', 'Đăng nhập thành công', 'success'))
        .catch(error => showToast('Lỗi', error.message, 'danger'));
});

logoutBtn.addEventListener('click', () => {
    auth.signOut()
        .then(() => showToast('Thông báo', 'Đã đăng xuất', 'info'))
        .catch(error => showToast('Lỗi', error.message, 'danger'));
});

// Stories management
let stories = [];
let filteredStories = [];

function loadStories() {
    showSpinner();
    db.ref('stories').once('value')
        .then(snapshot => {
            stories = [];
            snapshot.forEach(child => {
                stories.push({ id: child.key, ...child.val() });
            });
            applyFilters();
            hideSpinner();
        })
        .catch(error => {
            showToast('Lỗi', error.message, 'danger');
            hideSpinner();
        });
}

function applyFilters() {
    const searchTerm = searchInput.value.toLowerCase();
    const selectedGenres = Array.from(document.querySelectorAll('#genreList input:checked'))
        .map(input => input.value);
    const sortBy = sortSelect.value;

    filteredStories = stories.filter(story => {
        const matchesSearch = story.title.toLowerCase().includes(searchTerm) ||
                            story.author.toLowerCase().includes(searchTerm);
        const matchesGenre = selectedGenres.length === 0 || 
                           selectedGenres.includes(story.genre);
        return matchesSearch && matchesGenre;
    });

    // Sort stories
    filteredStories.sort((a, b) => {
        switch (sortBy) {
            case 'title':
                return a.title.localeCompare(b.title);
            case 'views':
                return b.views - a.views;
            case 'date':
                return new Date(b.createdAt) - new Date(a.createdAt);
            default:
                return 0;
        }
    });

    displayStories();
}

function displayStories() {
    if (filteredStories.length === 0) {
        mainContent.innerHTML = '<div class="alert alert-info">Không tìm thấy truyện nào</div>';
        return;
    }

    const storiesHTML = filteredStories.map(story => `
        <div class="col-md-4 mb-4">
            <div class="card story-card h-100">
                <img src="${story.image || 'https://via.placeholder.com/300x200'}" 
                     class="card-img-top" alt="${story.title}"
                     style="height: 200px; object-fit: cover;">
                <div class="card-body">
                    <h5 class="card-title">${story.title}</h5>
                    <p class="card-text">
                        <small class="text-muted">
                            <i class="bi bi-person"></i> ${story.author}<br>
                            <i class="bi bi-eye"></i> ${story.views} lượt xem
                        </small>
                    </p>
                    <div class="d-flex justify-content-between">
                        <button class="btn btn-primary btn-sm" onclick="editStory('${story.id}')">
                            <i class="bi bi-pencil"></i> Sửa
                        </button>
                        <button class="btn btn-success btn-sm" onclick="manageChapters('${story.id}')">
                            <i class="bi bi-list"></i> Chương
                        </button>
                        <button class="btn btn-danger btn-sm" onclick="confirmDelete('${story.id}')">
                            <i class="bi bi-trash"></i> Xóa
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `).join('');

    mainContent.innerHTML = `
        <div class="row">
            ${storiesHTML}
        </div>
    `;
}

// Event listeners
searchInput.addEventListener('input', applyFilters);
sortSelect.addEventListener('change', applyFilters);

// Initialize
initTheme();
initAuth();
themeToggle.addEventListener('click', toggleTheme);

// Export functions for use in HTML
window.editStory = function(id) {
    const story = stories.find(s => s.id === id);
    if (story) {
        document.getElementById('storyId').value = story.id;
        document.getElementById('storyTitle').value = story.title;
        document.getElementById('storyAuthor').value = story.author;
        document.getElementById('storyGenre').value = story.genre;
        document.getElementById('storyImage').value = story.image || '';
        document.getElementById('storyViews').value = story.views;
        document.getElementById('storyDescription').value = story.description || '';
        document.getElementById('storyImagePreview').src = story.image || 'https://via.placeholder.com/300x200';
        document.getElementById('storyModalTitle').textContent = 'Sửa truyện';
        new bootstrap.Modal(document.getElementById('storyEditModal')).show();
    }
};

window.manageChapters = function(storyId) {
    const story = stories.find(s => s.id === storyId);
    if (story) {
        document.getElementById('chaptersStoryTitle').textContent = story.title;
        document.getElementById('storyIdForChapter').value = storyId;
        loadChapters(storyId);
        new bootstrap.Modal(document.getElementById('chaptersModal')).show();
    }
};

window.confirmDelete = function(id) {
    const story = stories.find(s => s.id === id);
    if (story) {
        document.getElementById('deleteMessage').textContent = 
            `Bạn có chắc chắn muốn xóa truyện "${story.title}"?`;
        document.getElementById('confirmDeleteBtn').onclick = () => deleteStory(id);
        new bootstrap.Modal(document.getElementById('confirmDeleteModal')).show();
    }
};

// Add other necessary functions here...
