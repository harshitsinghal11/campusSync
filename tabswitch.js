
// Tab switching function
function switchTab(tab) {
    const tabButtons = document.querySelectorAll('.tab-button');
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');

    // Reset messages
    document.getElementById('error-message').style.display = 'none';
    document.getElementById('success-message').style.display = 'none';

    tabButtons.forEach(btn => btn.classList.remove('active'));

    if (tab === 'login') {
        tabButtons[0].classList.add('active');
        loginForm.style.display = 'block';
        signupForm.style.display = 'none';
    } else {
        tabButtons[1].classList.add('active');
        loginForm.style.display = 'none';
        signupForm.style.display = 'block';
    }
}