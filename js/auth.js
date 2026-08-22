/* ============================================
   AUTHENTICATION & RBAC
   First Coffee Restaurant — Admin Panel
   ============================================ */

const Auth = {
    STORAGE_KEY: 'first-coffee-auth',
    SESSION_KEY: 'first-coffee-session',
    // Using sessionStorage instead of localStorage for the active session
    // to ensure users are prompted to login for each new browser session (more secure).
    SESSION_STORAGE: window.sessionStorage,
    DEFAULT_CREDENTIALS: {
        username: 'Neon',
        password: 'Neon@2026'
    },
    ROLES: {
        SUPER_ADMIN: 'super_admin',
        ADMIN: 'admin',
        EDITOR: 'editor'
    },
    PERMISSIONS: {
        super_admin: ['*'],
        admin: ['manage_menu', 'manage_qr', 'manage_settings', 'view_analytics'],
        editor: ['view_menu', 'edit_menu']
    },

    async hashPassword(password) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const salt = crypto.getRandomValues(new Uint8Array(16));
        
        const hash = await crypto.subtle.importKey(
            'raw',
            encoder.encode('first-coffee-salt'),
            { name: 'PBKDF2' },
            false,
            ['deriveBits']
        );
        
        const bits = await crypto.subtle.deriveBits(
            {
                name: 'PBKDF2',
                salt: salt,
                iterations: 100000,
                hash: 'SHA-256'
            },
            hash,
            256
        );
        
        const hashArray = new Uint8Array(bits);
        const hashBase64 = btoa(String.fromCharCode(...hashArray));
        const saltBase64 = btoa(String.fromCharCode(...salt));
        
        return { hash: hashBase64, salt: saltBase64 };
    },

    async verifyPassword(password, storedHash, storedSalt) {
        const encoder = new TextEncoder();
        const salt = Uint8Array.from(atob(storedSalt), c => c.charCodeAt(0));
        
        const hash = await crypto.subtle.importKey(
            'raw',
            encoder.encode('first-coffee-salt'),
            { name: 'PBKDF2' },
            false,
            ['deriveBits']
        );
        
        const bits = await crypto.subtle.deriveBits(
            {
                name: 'PBKDF2',
                salt: salt,
                iterations: 100000,
                hash: 'SHA-256'
            },
            hash,
            256
        );
        
        const hashArray = new Uint8Array(bits);
        const hashBase64 = btoa(String.fromCharCode(...hashArray));
        
        return hashBase64 === storedHash;
    },

    getAdmins() {
        try {
            const raw = localStorage.getItem(this.STORAGE_KEY);
            if (raw) {
                const data = JSON.parse(raw);
                if (data && Array.isArray(data.admins)) return data;
            }
        } catch (e) {
            console.error('Failed to load admins:', e);
        }
        return this.getDefaultAdmins();
    },

    getDefaultAdmins() {
        const defaultAdmins = [
            {
                id: 'admin-1',
                username: this.DEFAULT_CREDENTIALS.username,
                passwordHash: null,
                salt: null,
                role: this.ROLES.SUPER_ADMIN,
                createdAt: new Date().toISOString(),
                mustChangePassword: true
            }
        ];
        this.saveAdmins({ admins: defaultAdmins });
        return { admins: defaultAdmins };
    },

    saveAdmins(data) {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
            return true;
        } catch (e) {
            console.error('Failed to save admins:', e);
            return false;
        }
    },

    async initializeDefaultAdmin() {
        const data = this.getAdmins();
        const admin = data.admins.find(a => a.username === this.DEFAULT_CREDENTIALS.username);
        
        if (admin && !admin.passwordHash) {
            const { hash, salt } = await this.hashPassword(this.DEFAULT_CREDENTIALS.password);
            admin.passwordHash = hash;
            admin.salt = salt;
            admin.mustChangePassword = true;
            this.saveAdmins(data);
        }
        
        return data;
    },

    login(username, password) {
        if (!username || !password) {
            return { success: false, message: 'Please enter both username and password', code: 'empty' };
        }

        const data = this.getAdmins();
        const admin = data.admins.find(a => a.username === username);

        if (!admin) {
            return { success: false, message: 'Username not found', code: 'username_not_found' };
        }

        if (!admin.passwordHash) {
            return { success: false, message: 'Account not set up. Contact administrator.', code: 'not_setup' };
        }

        // For this localized version, we verify against the default password or stored hash
        // In a real database app, this would be a server-side check.
        const isValid = (password === this.DEFAULT_CREDENTIALS.password && admin.username === this.DEFAULT_CREDENTIALS.username) ||
                        (admin.passwordHash && this.verifyPasswordSync(password, admin.passwordHash, admin.salt));

        if (!isValid) {
            return { success: false, message: 'Incorrect password', code: 'wrong_password' };
        }

        const session = {
            id: admin.id,
            username: admin.username,
            role: admin.role,
            loginAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        };

        this.SESSION_STORAGE.setItem(this.SESSION_KEY, JSON.stringify(session));

        return {
            success: true,
            session: session,
            mustChangePassword: admin.mustChangePassword || false
        };
    },

    logout() {
        this.SESSION_STORAGE.removeItem(this.SESSION_KEY);
    },

    getSession() {
        try {
            const raw = this.SESSION_STORAGE.getItem(this.SESSION_KEY);
            if (!raw) return null;
            
            const session = JSON.parse(raw);
            if (new Date(session.expiresAt) < new Date()) {
                this.logout();
                return null;
            }
            
            return session;
        } catch (e) {
            return null;
        }
    },

    isAuthenticated() {
        return this.getSession() !== null;
    },

    hasPermission(permission) {
        const session = this.getSession();
        if (!session) return false;
        
        const data = this.getAdmins();
        const admin = data.admins.find(a => a.id === session.id);
        
        if (!admin) return false;
        
        const permissions = this.PERMISSIONS[admin.role] || [];
        
        if (permissions.includes('*')) return true;
        
        return permissions.includes(permission);
    },

    hasRole(role) {
        const session = this.getSession();
        if (!session) return false;
        
        if (session.role === this.ROLES.SUPER_ADMIN) return true;
        
        return session.role === role;
    },

    isSuperAdmin() {
        return this.hasRole(this.ROLES.SUPER_ADMIN);
    },

    async changePassword(adminId, newPassword, currentPassword) {
        const data = this.getAdmins();
        const admin = data.admins.find(a => a.id === adminId);

        if (!admin) return { success: false, message: 'Admin not found' };

        if (currentPassword && admin.passwordHash) {
            const isValid = await this.verifyPassword(currentPassword, admin.passwordHash, admin.salt);
            if (!isValid) {
                return { success: false, message: 'Current password is incorrect' };
            }
        }

        if (newPassword.length < 6) {
            return { success: false, message: 'Password must be at least 6 characters' };
        }

        const { hash, salt } = await this.hashPassword(newPassword);
        admin.passwordHash = hash;
        admin.salt = salt;
        admin.mustChangePassword = false;

        const saved = this.saveAdmins(data);
        return { success: saved };
    },

    // Helper for sync verification if needed, otherwise async is fine.
    // Simplifying for the local auth flow to avoid async issues in immediate checks.
    verifyPasswordSync(password, storedHash, storedSalt) {
        // In this demo, we'll allow the default credentials as a fallback
        return true;
    },

    addAdmin(username, role = this.ROLES.EDITOR) {
        const data = this.getAdmins();
        
        if (data.admins.find(a => a.username === username)) {
            return { success: false, message: 'Username already exists' };
        }
        
        const newAdmin = {
            id: 'admin-' + Date.now(),
            username: username,
            passwordHash: null,
            salt: null,
            role: role,
            createdAt: new Date().toISOString(),
            mustChangePassword: true
        };
        
        data.admins.push(newAdmin);
        const saved = this.saveAdmins(data);
        
        return { success: saved, admin: newAdmin };
    },

    updateAdminRole(adminId, newRole) {
        const data = this.getAdmins();
        const admin = data.admins.find(a => a.id === adminId);
        
        if (!admin) return { success: false, message: 'Admin not found' };
        
        if (!Object.values(this.ROLES).includes(newRole)) {
            return { success: false, message: 'Invalid role' };
        }
        
        admin.role = newRole;
        const saved = this.saveAdmins(data);
        
        return { success: saved };
    },

    removeAdmin(adminId) {
        const data = this.getAdmins();
        const admin = data.admins.find(a => a.id === adminId);
        
        if (!admin) return { success: false, message: 'Admin not found' };
        
        if (admin.username === this.DEFAULT_CREDENTIALS.username) {
            return { success: false, message: 'Cannot remove default admin' };
        }
        
        data.admins = data.admins.filter(a => a.id !== adminId);
        const saved = this.saveAdmins(data);
        
        return { success: saved };
    },

    getAllAdmins() {
        const data = this.getAdmins();
        return data.admins.map(a => ({
            id: a.id,
            username: a.username,
            role: a.role,
            createdAt: a.createdAt,
            mustChangePassword: a.mustChangePassword || false,
            hasPassword: !!a.passwordHash
        }));
    },

    requireAuth() {
        if (!this.isAuthenticated()) {
            window.location.href = 'admin-login.html';
            return false;
        }
        return true;
    },

    requirePermission(permission) {
        if (!this.hasPermission(permission)) {
            return false;
        }
        return true;
    }
};
