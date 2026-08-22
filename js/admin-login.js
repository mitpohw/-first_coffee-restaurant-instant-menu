/* ============================================
    ADMIN LOGIN
    First Coffee Restaurant
    ============================================ */

(function () {
    'use strict';

    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => document.querySelectorAll(sel);

    const Validation = {
        USERNAME_MIN: 3,
        USERNAME_MAX: 30,
        PASSWORD_MIN: 8,

        isValidUsername(username) {
            if (!username || username.trim().length === 0) {
                return { valid: false, error: 'Username is required' };
            }
            const trimmed = username.trim();
            if (trimmed.length < this.USERNAME_MIN) {
                return { valid: false, error: `Username must be at least ${this.USERNAME_MIN} characters` };
            }
            if (trimmed.length > this.USERNAME_MAX) {
                return { valid: false, error: `Username must be less than ${this.USERNAME_MAX} characters` };
            }
            if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
                return { valid: false, error: 'Username can only contain letters, numbers, and underscores' };
            }
            return { valid: true };
        },

        isValidPassword(password) {
            if (!password || password.length === 0) {
                return { valid: false, error: 'Password is required' };
            }
            if (password.length < this.PASSWORD_MIN) {
                return { valid: false, error: `Password must be at least ${this.PASSWORD_MIN} characters` };
            }
            return { valid: true };
        },

        sanitize(input) {
            const div = document.createElement('div');
            div.textContent = input;
            return div.innerHTML;
        }
    };

    async function init() {
        await Auth.initializeDefaultAdmin();

        if (Auth.isAuthenticated()) {
            window.location.href = 'admin.html';
            return;
        }

        bindEvents();
    }

    function bindEvents() {
        const form = $('#login-form');
        const usernameInput = $('#login-username');
        const passwordInput = $('#login-password');

        if (form) {
            form.addEventListener('submit', handleLogin);
        }

        if (usernameInput) {
            usernameInput.addEventListener('input', () => validateField('username'));
            usernameInput.addEventListener('blur', () => validateField('username'));
        }

        if (passwordInput) {
            passwordInput.addEventListener('input', () => validateField('password'));
            passwordInput.addEventListener('blur', () => validateField('password'));
        }
    }

    function validateField(field, showEmptyError = false) {
        const usernameInput = $('#login-username');
        const passwordInput = $('#login-password');
        const usernameError = $('#username-error');
        const passwordError = $('#password-error');

        if (field === 'username' && usernameInput) {
            const result = Validation.isValidUsername(usernameInput.value);
            if (!result.valid && (usernameInput.value.length > 0 || showEmptyError)) {
                showFieldError('username', result.error);
            } else {
                clearFieldError('username');
            }
            return result.valid;
        }

        if (field === 'password' && passwordInput) {
            const result = Validation.isValidPassword(passwordInput.value);
            if (!result.valid && (passwordInput.value.length > 0 || showEmptyError)) {
                showFieldError('password', result.error);
            } else {
                clearFieldError('password');
            }
            return result.valid;
        }

        return true;
    }

    function showFieldError(field, message) {
        const errorEl = $(`#${field}-error`);
        const inputEl = $(`#login-${field}`);

        if (errorEl) {
            errorEl.textContent = message;
            errorEl.hidden = false;
        }

        if (inputEl) {
            inputEl.classList.add('input-error');
        }
    }

    function clearFieldError(field) {
        const errorEl = $(`#${field}-error`);
        const inputEl = $(`#login-${field}`);

        if (errorEl) {
            errorEl.textContent = '';
            errorEl.hidden = true;
        }

        if (inputEl) {
            inputEl.classList.remove('input-error');
        }
    }

    function clearAllErrors() {
        clearFieldError('username');
        clearFieldError('password');
        const globalError = $('#login-error');
        if (globalError) {
            globalError.hidden = true;
            const errorText = $('#login-error-text');
            if (errorText) errorText.textContent = '';
        }
    }

    async function handleLogin(e) {
        e.preventDefault();

        clearAllErrors();

        const usernameInput = $('#login-username');
        const passwordInput = $('#login-password');
        const submitBtn = $('#login-submit');
        const btnText = submitBtn?.querySelector('.btn-text');
        const btnLoading = submitBtn?.querySelector('.btn-loading');
        const rememberMe = $('#remember-me')?.checked;

        const username = usernameInput?.value?.trim() || '';
        const password = passwordInput?.value || '';

        const usernameValid = validateField('username', true);
        const passwordValid = validateField('password', true);

        if (!usernameValid || !passwordValid) {
            if (!usernameValid) validateField('username', true);
            if (!passwordValid) validateField('password', true);
            return;
        }

        const sanitizedUsername = Validation.sanitize(username);

        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.classList.add('btn-loading-state');
        }
        if (btnText) btnText.hidden = true;
        if (btnLoading) btnLoading.hidden = false;

        try {
            const result = await Auth.login(sanitizedUsername, password);

            if (result.success) {
                if (rememberMe && result.session) {
                    result.session.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
                    localStorage.setItem(Auth.SESSION_KEY, JSON.stringify(result.session));
                }

                if (result.mustChangePassword) {
                    window.location.href = 'admin.html?change-password=true';
                } else {
                    window.location.href = 'admin.html';
                }
            } else {
                handleLoginError(result);
            }
        } catch (err) {
            showGlobalError('Authentication failed. Please try again.');
            console.error('Login error:', err);
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.classList.remove('btn-loading-state');
            }
            if (btnText) btnText.hidden = false;
            if (btnLoading) btnLoading.hidden = true;
        }
    }

    function handleLoginError(result) {
        const code = result.code || 'unknown';
        const message = result.message || 'Invalid credentials';

        switch (code) {
            case 'username_not_found':
                showFieldError('username', 'Username not found');
                showGlobalError('No account found with this username');
                $('#login-username')?.focus();
                break;
            case 'wrong_password':
                showFieldError('password', 'Incorrect password');
                showGlobalError('The password you entered is incorrect');
                $('#login-password')?.focus();
                break;
            case 'not_setup':
                showGlobalError('Account not configured. Contact administrator.');
                break;
            default:
                showGlobalError(message);
        }
    }

    function showGlobalError(message) {
        const errorDiv = $('#login-error');
        const errorText = $('#login-error-text');
        if (errorDiv && errorText) {
            errorText.textContent = message;
            errorDiv.hidden = false;
            errorDiv.classList.add('shake');
            setTimeout(() => errorDiv.classList.remove('shake'), 500);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
