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
            window.location.href = 'admin-login.html';
        });
        document.getElementById('back-to-top')?.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });

        window.addEventListener('scroll', Utils.debounce(() => {
            const btn = document.getElementById('back-to-top');
            const scrolled = window.scrollY > 400;
            if (btn) btn.hidden = !scrolled;
            
            const header = document.querySelector('.site-header');
            const catNav = document.querySelector('.category-nav');
            const isScrolled = window.scrollY > 12;
            const progress = Math.min(window.scrollY / 120, 1);

            if (header) {
                header.classList.toggle('scrolled', isScrolled);
                header.style.boxShadow = isScrolled
                    ? `0 4px 24px rgba(26, 20, 18, ${progress * 0.08})`
                    : 'none';
            }
            if (catNav) {
                catNav.classList.toggle('scrolled', isScrolled);
                catNav.style.boxShadow = isScrolled
                    ? `0 2px 16px rgba(26, 20, 18, ${progress * 0.06})`
                    : 'none';
            }
        }, 8), { passive: true });

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
        if (menuView) menuView.removeAttribute('hidden');
        const adminToggle = document.getElementById('admin-toggle');
        if (adminToggle) adminToggle.setAttribute('aria-label', 'Admin panel');
        Menu.data = this.data;
        Menu.init(this.data);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    showAdmin() {
        window.location.href = 'admin-login.html';
    },

    showMenuPreview() {
        this.showMenu();
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
