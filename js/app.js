const App = {
    isAdmin: false,

    init() {
        this.isAdmin = new URLSearchParams(window.location.search).has('admin');
        const data = Storage.load();
        this.data = data;

        if (this.isAdmin) {
            this.showAdmin();
        } else {
            this.showMenu();
        }

        this.bindGlobalEvents();
    },

    bindGlobalEvents() {
        document.getElementById('search-toggle')?.addEventListener('click', () => this.toggleSearch());
        document.getElementById('search-close')?.addEventListener('click', () => this.closeSearch());
        document.getElementById('search-input')?.addEventListener('input', Utils.debounce((e) => {
            Menu.searchQuery = e.target.value;
            Menu.renderItems();
            Menu.renderFeatured();
        }, 200));
        document.getElementById('admin-toggle')?.addEventListener('click', () => {
            if (this.isAdmin) {
                this.showMenu();
            } else {
                this.showAdmin();
            }
        });
        document.getElementById('back-to-top')?.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });

        window.addEventListener('scroll', Utils.debounce(() => {
            const btn = document.getElementById('back-to-top');
            if (btn) btn.hidden = window.scrollY < 400;
            
            const header = document.querySelector('.site-header');
            const catNav = document.querySelector('.category-nav');
            if (header) {
                header.classList.toggle('scrolled', window.scrollY > 10);
            }
            if (catNav) {
                catNav.classList.toggle('scrolled', window.scrollY > 10);
            }
        }, 50), { passive: true });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const modal = document.getElementById('item-modal');
                if (modal && !modal.hidden) {
                    Admin.closeItemModal();
                }
            }
        });

        window.addEventListener('offline', () => {
            App.showToast('You are offline. Menu may not load fully.');
        });

        window.addEventListener('online', () => {
            App.showToast('Back online');
        });
    },

    showMenu() {
        this.isAdmin = false;
        const menuView = document.getElementById('menu-view');
        const adminView = document.getElementById('admin-view');
        if (menuView) menuView.removeAttribute('hidden');
        if (adminView) adminView.hidden = true;
        const adminToggle = document.getElementById('admin-toggle');
        if (adminToggle) adminToggle.setAttribute('aria-label', 'Admin panel');
        history.replaceState(null, '', window.location.pathname + window.location.search.replace(/[?&]admin/, ''));
        Menu.data = this.data;
        Menu.init(this.data);
        Admin.updateCategoryFilter();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    showAdmin() {
        this.isAdmin = true;
        const menuView = document.getElementById('menu-view');
        const adminView = document.getElementById('admin-view');
        if (menuView) menuView.hidden = true;
        if (adminView) adminView.removeAttribute('hidden');
        const adminToggle = document.getElementById('admin-toggle');
        if (adminToggle) adminToggle.setAttribute('aria-label', 'Exit admin');
        history.replaceState(null, '', window.location.pathname + (window.location.search.includes('admin') ? '?admin' : '?admin'));
        Admin.data = this.data;
        Admin.init(this.data);
        Admin.updateCategoryFilter();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    showMenuPreview() {
        this.isAdmin = false;
        const menuView = document.getElementById('menu-view');
        const adminView = document.getElementById('admin-view');
        if (menuView) menuView.removeAttribute('hidden');
        if (adminView) adminView.hidden = true;
        Menu.data = this.data;
        Menu.init(this.data);
        Admin.updateCategoryFilter();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    toggleSearch() {
        const bar = document.getElementById('search-bar');
        const input = document.getElementById('search-input');
        if (!bar || !input) return;
        if (bar.hidden) {
            bar.hidden = false;
            input.focus();
        } else {
            this.closeSearch();
        }
    },

    closeSearch() {
        const bar = document.getElementById('search-bar');
        const input = document.getElementById('search-input');
        if (bar) bar.hidden = true;
        if (input) input.value = '';
        Menu.searchQuery = '';
        Menu.renderItems();
        Menu.renderFeatured();
    },

    toastTimeout: null,

    showToast(message, type = '') {
        const toast = document.getElementById('toast');
        if (!toast) return;
        toast.textContent = message;
        toast.className = 'toast show' + (type ? ' ' + type : '');
        clearTimeout(this.toastTimeout);
        this.toastTimeout = setTimeout(() => {
            toast.classList.remove('show');
        }, 2500);
    }
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => App.init());
} else {
    App.init();
}
