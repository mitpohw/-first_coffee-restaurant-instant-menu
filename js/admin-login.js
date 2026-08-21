/* ============================================
   ADMIN LOGIN
   First Coffee Restaurant
   ============================================ */

(function () {
    'use strict';

    const $ = (sel) => document.querySelector(sel);

    async function init() {
        await Auth.initializeDefaultAdmin();
        
        if (Auth.isAuthenticated()) {
            window.location.href = 'admin.html';
            return;
        }

        bindEvents();
    }

    function bindEvents() {
        $('#login-form')?.addEventListener('submit', handleLogin);
    }

    async function handleLogin(e) {
        e.preventDefault();
        
        const username = $('#login-username')?.value.trim();
        const password = $('#login-password')?.value;
        const errorDiv = $('#login-error');
        const loadingDiv = $('#login-loading');
        const submitBtn = $('.login-btn');

        if (!username || !password) {
            showError('Please enter both username and password');
            return;
        }

        errorDiv.hidden = true;
        loadingDiv.hidden = false;
        submitBtn.disabled = true;

        try {
            const result = await Auth.login(username, password);
            
            if (result.success) {
                if (result.mustChangePassword) {
                    window.location.href = 'admin.html?change-password=true';
                } else {
                    window.location.href = 'admin.html';
                }
            } else {
                showError(result.message || 'Invalid credentials');
            }
        } catch (err) {
            showError('Authentication failed. Please try again.');
            console.error(err);
        } finally {
            loadingDiv.hidden = true;
            submitBtn.disabled = false;
        }
    }

    function showError(message) {
        const errorDiv = $('#login-error');
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.hidden = false;
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
