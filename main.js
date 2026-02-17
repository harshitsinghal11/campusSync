
// Import Firebase modules
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    updateProfile
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import {
    getFirestore,
    collection,
    addDoc,
    query,
    orderBy,
    onSnapshot,
    serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';


// Check if Firebase config is still placeholder
if (firebaseConfig.apiKey === "AIzaSyExample-replace-with-your-actual-api-key") {
    console.error("⚠️ Firebase configuration is still using placeholder values!");
    console.error("Please replace the firebaseConfig object with your actual Firebase project credentials.");

    // Show user-friendly error
    document.addEventListener('DOMContentLoaded', () => {
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
    position: fixed; top: 0; left: 0; right: 0;
    background: #dc3545; color: white; padding: 15px;
    text-align: center; z-index: 10000; font-weight: bold;
    `;
        errorDiv.innerHTML = '⚠️ Firebase not configured! Please add your Firebase project credentials to make the app functional.';
        document.body.prepend(errorDiv);
    });
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Global variables
let currentUser = null;
let chatUnsubscribe = null;
let marketplaceUnsubscribe = null;

// DOM Elements
const authSection = document.getElementById('auth-section');
const dashboard = document.getElementById('dashboard');
const errorMessage = document.getElementById('error-message');
const successMessage = document.getElementById('success-message');
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const loginBtn = document.getElementById('login-btn');
const signupBtn = document.getElementById('signup-btn');

// Auth State Observer
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        showDashboard();
        updateUserDisplay();
        initializeChat();
        initializeMarketplace();
    } else {
        currentUser = null;
        showAuth();
        if (chatUnsubscribe) {
            chatUnsubscribe();
            chatUnsubscribe = null;
        }
        if (marketplaceUnsubscribe) {
            marketplaceUnsubscribe();
            marketplaceUnsubscribe = null;
        }
    }
});

// Show/Hide sections
function showAuth() {
    authSection.style.display = 'block';
    dashboard.classList.remove('active');
}

function showDashboard() {
    authSection.style.display = 'none';
    dashboard.classList.add('active');
}

// Update user display in dashboard
function updateUserDisplay() {
    if (currentUser) {
        const userName = document.getElementById('user-name');
        const userAvatar = document.getElementById('user-avatar');

        const displayName = currentUser.displayName || currentUser.email.split('@')[0];
        const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

        userName.textContent = displayName;
        userAvatar.textContent = initials;
    }
}

// Show messages
function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
    successMessage.style.display = 'none';
    setTimeout(() => {
        errorMessage.style.display = 'none';
    }, 5000);
}

function showSuccess(message) {
    successMessage.textContent = message;
    successMessage.style.display = 'block';
    errorMessage.style.display = 'none';
    setTimeout(() => {
        successMessage.style.display = 'none';
    }, 3000);
}

// Loading states
function setLoading(button, isLoading) {
    if (isLoading) {
        button.disabled = true;
        button.innerHTML = '<span class="loading"></span>' + button.textContent;
    } else {
        button.disabled = false;
        button.innerHTML = button.textContent.replace(/^.*?(\w)/, '$1');
    }
}

// Login form handler
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    setLoading(loginBtn, true);

    try {
        await signInWithEmailAndPassword(auth, email, password);
        showSuccess('Login successful! Welcome back.');
    } catch (error) {
        console.error('Login error:', error);
        showError(getErrorMessage(error.code));
    } finally {
        setLoading(loginBtn, false);
    }
});

// Signup form handler
signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('signup-name').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const confirmPassword = document.getElementById('signup-confirm').value;

    if (password !== confirmPassword) {
        showError('Passwords do not match.');
        return;
    }

    setLoading(signupBtn, true);

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, {
            displayName: name
        });
        showSuccess('Account created successfully! Welcome to CampusSync.');
    } catch (error) {
        console.error('Signup error:', error);
        showError(getErrorMessage(error.code));
    } finally {
        setLoading(signupBtn, false);
    }
});

// Logout function
window.logout = async () => {
    try {
        await signOut(auth);
        showSuccess('Logged out successfully.');
    } catch (error) {
        console.error('Logout error:', error);
        showError('Error logging out. Please try again.');
    }
};

// Error message helper
function getErrorMessage(errorCode) {
    switch (errorCode) {
        case 'auth/user-not-found':
            return 'No account found with this email address.';
        case 'auth/wrong-password':
            return 'Incorrect password. Please try again.';
        case 'auth/email-already-in-use':
            return 'An account with this email already exists.';
        case 'auth/weak-password':
            return 'Password should be at least 6 characters long.';
        case 'auth/invalid-email':
            return 'Please enter a valid email address.';
        case 'auth/too-many-requests':
            return 'Too many failed attempts. Please try again later.';
        default:
            return 'An error occurred. Please try again.';
    }
}

// Chat Functions
function initializeChat() {
    const chatMessages = document.getElementById('chat-messages');
    const chatForm = document.getElementById('chat-form');
    const chatInput = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-btn');

    // Auto-resize textarea
    chatInput.addEventListener('input', function () {
        this.style.height = 'auto';
        this.style.height = Math.min(this.scrollHeight, 100) + 'px';
    });

    // Handle form submission
    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const message = chatInput.value.trim();
        if (!message) return;

        sendBtn.disabled = true;
        sendBtn.innerHTML = '⏳';

        try {
            await addDoc(collection(db, 'messages'), {
                content: message,
                userId: currentUser.uid,
                userEmail: currentUser.email,
                timestamp: serverTimestamp(),
                anonymous: true
            });

            chatInput.value = '';
            chatInput.style.height = 'auto';
        } catch (error) {
            console.error('Error sending message:', error);

            // Show specific error messages
            let errorMsg = 'Failed to send message. ';
            if (error.code === 'permission-denied') {
                errorMsg += 'Please check Firestore security rules.';
            } else if (error.code === 'unavailable') {
                errorMsg += 'Please check your internet connection.';
            } else if (firebaseConfig.apiKey === "AIzaSyExample-replace-with-your-actual-api-key") {
                errorMsg += 'Firebase configuration is not set up properly.';
            } else {
                errorMsg += 'Please try again.';
            }

            alert(errorMsg);
        } finally {
            sendBtn.disabled = false;
            sendBtn.innerHTML = '➤';
        }
    });

    // Listen to messages
    const messagesQuery = query(
        collection(db, 'messages'),
        orderBy('timestamp', 'asc')
    );

    chatUnsubscribe = onSnapshot(messagesQuery, (snapshot) => {
        const messages = [];
        snapshot.forEach((doc) => {
            messages.push({ id: doc.id, ...doc.data() });
        });
        displayMessages(messages);
    });
}

function displayMessages(messages) {
    const chatMessages = document.getElementById('chat-messages');

    if (messages.length === 0) {
        chatMessages.innerHTML = `
                    <div class="empty-chat">
                        <div class="icon">💬</div>
                        <h3>Start the conversation!</h3>
                        <p>Be the first to share something with your fellow students.</p>
                    </div>
                `;
        return;
    }

    chatMessages.innerHTML = '';
    messages.forEach((message) => {
        const messageEl = createMessageElement(message);
        chatMessages.appendChild(messageEl);
    });

    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function createMessageElement(message) {
    const messageDiv = document.createElement('div');
    const isOwn = message.userId === currentUser.uid;

    messageDiv.className = `message ${isOwn ? 'own' : ''}`;

    // Generate consistent anonymous avatar
    const avatarColor = generateAvatarColor(message.userId);
    const avatarInitial = generateAvatarInitial(message.userId);

    const timestamp = message.timestamp ?
        new Date(message.timestamp.seconds * 1000).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
        }) : 'Sending...';

    messageDiv.innerHTML = `
    <div class="message-avatar" style="background: ${avatarColor}">
        ${avatarInitial}
    </div>
    <div class="message-bubble">
        <div class="message-content">${escapeHtml(message.content)}</div>
        <div class="message-time">${timestamp}</div>
    </div>
    `;

    return messageDiv;
}

function generateAvatarColor(userId) {
    const colors = [
        '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
        '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
    ];
    const hash = Array.from(userId).reduce((a, b) => {
        a = ((a << 5) - a) + b.charCodeAt(0);
        return a & a;
    }, 0);
    return colors[Math.abs(hash) % colors.length];
}

function generateAvatarInitial(userId) {
    const initials = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];
    const hash = Array.from(userId).reduce((a, b) => {
        a = ((a << 5) - a) + b.charCodeAt(0);
        return a & a;
    }, 0);
    return initials[Math.abs(hash) % initials.length];
}

function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
}

// Marketplace Functions
function initializeMarketplace() {
    const categoryFilter = document.getElementById('category-filter');
    const addItemForm = document.getElementById('add-item-form');
    const addItemBtn = document.getElementById('add-item-btn');

    // Category filter handler
    // Category filter handler - directly connected
    categoryFilter.addEventListener('change', (e) => {
        const selectedCategory = e.target.value;
        displayMarketplaceItems(window.allMarketplaceItems, selectedCategory);
    });
    window.allMarketplaceItems = [];
    // Add item form handler
    addItemForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const title = document.getElementById('item-title').value.trim();
        const price = parseFloat(document.getElementById('item-price').value);
        const category = document.getElementById('item-category').value;
        const description = document.getElementById('item-description').value.trim();
        const contact = document.getElementById('item-contact').value.trim();

        if (!title || !price || !category || !description || !contact) {
            alert('Please fill in all required fields.');
            return;
        }

        setLoading(addItemBtn, true);

        try {
            await addDoc(collection(db, 'marketplace'), {
                title,
                price,
                category,
                description,
                contact,
                sellerId: currentUser.uid,
                sellerEmail: currentUser.email,
                sellerName: currentUser.displayName || currentUser.email.split('@')[0],
                timestamp: serverTimestamp(),
                status: 'active'
            });

            // Reset form and close modal
            addItemForm.reset();
            closeAddItemModal();
            showSuccess('Item added successfully! It will appear in the marketplace.');
        } catch (error) {
            console.error('Error adding item:', error);
            let errorMsg = 'Failed to add item. ';
            if (error.code === 'permission-denied') {
                errorMsg += 'Please check Firestore security rules.';
            } else if (firebaseConfig.apiKey === "AIzaSyExample-replace-with-your-actual-api-key") {
                errorMsg += 'Firebase configuration is not set up properly.';
            } else {
                errorMsg += 'Please try again.';
            }
            alert(errorMsg);
        } finally {
            setLoading(addItemBtn, false);
        }
    });

    // Auto-fill contact information
    const contactInput = document.getElementById('item-contact');
    if (currentUser && !contactInput.value) {
        contactInput.value = currentUser.email;
    }

    // Listen to marketplace items
    const itemsQuery = query(
        collection(db, 'marketplace'),
        orderBy('timestamp', 'desc')
    );

    marketplaceUnsubscribe = onSnapshot(itemsQuery, (snapshot) => {
        const items = [];
        snapshot.forEach((doc) => {
            items.push({ id: doc.id, ...doc.data() });
        });

        // Store items globally for filtering
        window.allMarketplaceItems = items;

        // Get current filter value and maintain it
        const currentFilter = document.getElementById('category-filter').value;

        // Display items with current filter applied
        displayMarketplaceItems(items, currentFilter);
    });
}

function displayMarketplaceItems(items, filteredCategory = 'all') {
    const itemsGrid = document.getElementById('items-grid');
    const filteredItems = filteredCategory === 'all' ?
        items.filter(item => item.status === 'active') :
        items.filter(item => item.status === 'active' && item.category === filteredCategory);

    if (filteredItems.length === 0) {
        itemsGrid.innerHTML = `
                    <div class="empty-marketplace">
                        <div class="icon">🛒</div>
                        <h3>${filteredCategory === 'all' ? 'No items yet!' : 'No items in this category!'}</h3>
                        <p>${filteredCategory === 'all' ?
                'Be the first to list an item for sale in your campus community.' :
                'Try browsing other categories or be the first to add an item here.'}</p>
                    </div>
                `;
        return;
    }

    itemsGrid.innerHTML = '';
    filteredItems.forEach((item) => {
        const itemElement = createItemCard(item);
        itemsGrid.appendChild(itemElement);
    });
}

function createItemCard(item) {
    const itemDiv = document.createElement('div');
    itemDiv.className = 'item-card';
    itemDiv.onclick = () => openItemDetailModal(item);

    const categoryEmoji = getCategoryEmoji(item.category);
    const isOwnItem = item.sellerId === currentUser.uid;

    const timestamp = item.timestamp ?
        new Date(item.timestamp.seconds * 1000).toLocaleDateString() : 'Recently';

    itemDiv.innerHTML = `
        <div class="item-image">
            ${categoryEmoji}
            <div class="item-category-badge">${item.category}</div>
        </div>
        <div class="item-info">
            <h3 class="item-title">${escapeHtml(item.title)}</h3>
            <p class="item-description">${escapeHtml(item.description)}</p>
            <div class="item-footer">
                <div class="item-price">₹${item.price.toLocaleString()}</div>
                <div class="item-contact">
                    ${isOwnItem ? 'Your listing' : 'Click to contact'}
                </div>
            </div>
            <div class="item-meta">
                <span>By ${isOwnItem ? 'You' : item.sellerName}</span>
                <span>${timestamp}</span>
            </div>
        </div>
        `;

    return itemDiv;
}

function getCategoryEmoji(category) {
    const emojis = {
        books: '📚',
        electronics: '💻',
        clothing: '👕',
        furniture: '🪑',
        sports: '⚽',
        other: '📦'
    };
    return emojis[category] || '📦';
}

function filterItems(category) {
    // This will be handled by re-querying or filtering existing items
    // For now, we'll re-trigger the display with filter
    window.currentItems = window.currentItems || [];
    displayMarketplaceItems(window.currentItems, category);
}

// Modal Functions
window.openAddItemModal = () => {
    document.getElementById('add-item-modal').classList.add('active');
    document.body.style.overflow = 'hidden';
};

window.closeAddItemModal = () => {
    document.getElementById('add-item-modal').classList.remove('active');
    document.body.style.overflow = 'auto';
};

window.openItemDetailModal = (item) => {
    const modal = document.getElementById('item-detail-modal');

    document.getElementById('detail-image').innerHTML = getCategoryEmoji(item.category);
    document.getElementById('detail-title').textContent = item.title;
    document.getElementById('detail-price').textContent = `₹${item.price.toLocaleString()}`;
    document.getElementById('detail-description').textContent = item.description;
    document.getElementById('detail-category').textContent = item.category;
    document.getElementById('detail-date').textContent = item.timestamp ?
        new Date(item.timestamp.seconds * 1000).toLocaleDateString() : 'Recently';
    document.getElementById('detail-contact').textContent = item.contact;

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
};

window.closeItemDetailModal = () => {
    document.getElementById('item-detail-modal').classList.remove('active');
    document.body.style.overflow = 'auto';
};

// Close modals when clicking outside
window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        e.target.classList.remove('active');
        document.body.style.overflow = 'auto';
    }
});

// Navigation Functions
window.showSection = (sectionName) => {
    // Update sidebar active state
    document.querySelectorAll('.sidebar-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`[onclick="showSection('${sectionName}')"]`).classList.add('active');

    // Show/hide sections
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });
    document.getElementById(`${sectionName}-section`).classList.add('active');

    // Close mobile menu
    document.getElementById('sidebar').classList.remove('mobile-open');
};

window.toggleMobileMenu = () => {
    document.getElementById('sidebar').classList.toggle('mobile-open');
};

// Store current items for filtering
window.onSnapshot = ((originalOnSnapshot) => {
    return function (...args) {
        if (args[0].toString().includes('marketplace')) {
            return originalOnSnapshot.apply(this, [args[0], (snapshot) => {
                const items = [];
                snapshot.forEach((doc) => {
                    items.push({ id: doc.id, ...doc.data() });
                });
                window.currentItems = items;
                args[1](snapshot);
            }]);
        }
        return originalOnSnapshot.apply(this, args);
    };
})(onSnapshot);
