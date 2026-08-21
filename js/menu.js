const Menu = {
    data: null,
    activeCategory: 'all',
    searchQuery: '',

    init(data) {
        this.data = data;
        this.render();
    },

    get filteredItems() {
        let items = this.data.items || [];
        if (this.activeCategory !== 'all') {
            items = items.filter(i => i.categoryId === this.activeCategory);
        }
        if (this.searchQuery.trim()) {
            const q = this.searchQuery.toLowerCase().trim();
            items = items.filter(i =>
                i.name.toLowerCase().includes(q) ||
                (i.description && i.description.toLowerCase().includes(q)) ||
                (i.tags && i.tags.some(t => t.toLowerCase().includes(q)))
            );
        }
        return items.sort((a, b) => (a.order || 0) - (b.order || 0));
    },

    get featuredItems() {
        if (this.searchQuery.trim() || this.activeCategory !== 'all') return [];
        return (this.data.items || [])
            .filter(i => i.featured && i.available)
            .sort((a, b) => (a.order || 0) - (b.order || 0));
    },

    render() {
        this.renderCategories();
        this.renderFeatured();
        this.renderItems();
        this.renderFooter();
        this.initScrollEffects();
    },

    initScrollEffects() {
        const handleScroll = () => {
            const scrolled = window.scrollY > 10;
            const header = document.querySelector('.site-header');
            const catNav = document.querySelector('.category-nav');
            if (header) header.classList.toggle('scrolled', scrolled);
            if (catNav) catNav.classList.toggle('scrolled', scrolled);
        };

        window.removeEventListener('scroll', this._scrollHandler);
        this._scrollHandler = handleScroll;
        window.addEventListener('scroll', handleScroll, { passive: true });
        handleScroll();
    },

    renderCategories() {
        const nav = document.getElementById('category-nav');
        if (!nav) return;
        const cats = this.data.categories || [];
        const inner = nav.querySelector('.category-nav-inner');
        if (!inner) return;

        let html = '<button class="cat-btn active" data-cat="all">All</button>';
        for (const c of cats) {
            html += '<button class="cat-btn" data-cat="' + Utils.escapeHtml(c.id) + '">' + Utils.escapeHtml(c.name) + '</button>';
        }
        inner.innerHTML = html;

        inner.querySelectorAll('.cat-btn').forEach(btn => {
            btn.addEventListener('click', () => this.setCategory(btn.dataset.cat));
        });
    },

    setCategory(catId) {
        this.activeCategory = catId;
        document.querySelectorAll('.cat-btn').forEach(b => b.classList.toggle('active', b.dataset.cat === catId));
        const activeBtn = document.querySelector('.cat-btn[data-cat="' + catId + '"]');
        if (activeBtn) {
            activeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
        this.renderItems();
        this.renderFeatured();
        if (catId !== 'all') {
            const section = document.getElementById(catId);
            if (section) {
                section.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        } else {
            const target = document.getElementById('menu-content');
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }
    },

    renderFeatured() {
        const section = document.getElementById('featured-section');
        const grid = document.getElementById('featured-grid');
        if (!section || !grid) return;

        const featured = this.featuredItems;
        if (featured.length === 0) {
            section.hidden = true;
            return;
        }

        section.hidden = false;
        grid.innerHTML = featured.map((item, index) => this.featuredCardHtml(item, index)).join('');
        grid.querySelectorAll('.featured-card').forEach(card => {
            this.attachCardEvents(card);
        });
    },

    renderItems() {
        const container = document.getElementById('menu-content');
        const empty = document.getElementById('empty-state');
        if (!container || !empty) return;

        const items = this.filteredItems;
        const cats = this.data.categories || [];

        if (this.activeCategory === 'all' && !this.searchQuery.trim()) {
            let html = '';
            for (const cat of cats) {
                const catItems = items.filter(i => i.categoryId === cat.id);
                if (catItems.length === 0) continue;
                html += '<section class="menu-category" id="' + Utils.escapeHtml(cat.id) + '">';
                html += '<h2 class="menu-category-title">' + Utils.escapeHtml(cat.name) + '</h2>';
                html += '<div class="menu-items-list">';
                html += catItems.map(i => this.cardHtml(i)).join('');
                html += '</div></section>';
            }
            container.innerHTML = html;
        } else {
            let html = '<div class="menu-items-list">';
            html += items.map(i => this.cardHtml(i)).join('');
            html += '</div>';
            container.innerHTML = html;
        }

        if (items.length === 0) {
            empty.hidden = false;
            container.innerHTML = '';
        } else {
            empty.hidden = true;
        }

        container.querySelectorAll('.menu-item-card').forEach(card => {
            this.attachCardEvents(card);
        });
    },

    attachCardEvents(card) {
        card.addEventListener('click', () => {
            const id = card.dataset.id;
            const item = (this.data.items || []).find(i => i.id === id);
            if (item) this.showDetailModal(item);
        });
        card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                const id = card.dataset.id;
                const item = (this.data.items || []).find(i => i.id === id);
                if (item) this.showDetailModal(item);
            }
        });
    },

    showDetailModal(item) {
        const modal = document.getElementById('item-modal');
        const body = document.getElementById('modal-body');
        if (!modal || !body) return;

        const unavailable = !item.available;
        const imgSrc = item.image || '';
        const imgHtml = imgSrc
            ? '<img class="modal-image" src="' + Utils.escapeHtml(imgSrc) + '" alt="' + Utils.escapeHtml(item.name) + '" loading="lazy" onerror="this.parentElement.querySelector(\'.modal-image\').style.display=\'none\'">'
            : '';

        let tagsHtml = '';
        if (item.popular) tagsHtml += '<span class="tag tag-popular">Popular</span>';
        if (item.featured) tagsHtml += '<span class="tag tag-featured">Featured</span>';
        if (unavailable) tagsHtml += '<span class="tag tag-unavailable">Unavailable</span>';

        let optionsHtml = '';
        if (item.options && item.options.length > 0) {
            optionsHtml = '<div class="modal-section"><h3>Options</h3><ul>' +
                item.options.map(o => '<li><strong>' + Utils.escapeHtml(o.name) + ':</strong> ' + Utils.escapeHtml((o.choices || []).join(', ')) + (o.required ? ' (required)' : '') + '</li>').join('') +
                '</ul></div>';
        }

        body.innerHTML =
            (imgHtml || '<div style="height:200px;background:#f0ebe4;border-radius:var(--radius-md);margin-bottom:1.25rem;display:flex;align-items:center;justify-content:center;font-size:3rem;">☕</div>') +
            '<h2 class="modal-title" id="modal-title">' + Utils.escapeHtml(item.name) + '</h2>' +
            '<p class="modal-price">' + Utils.formatPrice(item.price, this.data.restaurant.currency) + '</p>' +
            (item.description ? '<p class="modal-desc">' + Utils.escapeHtml(item.description) + '</p>' : '') +
            (tagsHtml ? '<div class="modal-tags">' + tagsHtml + '</div>' : '') +
            (item.note ? '<div class="modal-section"><h3>Note</h3><p>' + Utils.escapeHtml(item.note) + '</p></div>' : '') +
            (item.allergens ? '<div class="modal-section"><h3>Allergens</h3><p>' + Utils.escapeHtml(item.allergens) + '</p></div>' : '') +
            optionsHtml;

        modal.hidden = false;
        requestAnimationFrame(() => modal.classList.add('show'));

        const closeBtn = modal.querySelector('.modal-close');
        const overlay = modal.querySelector('.modal-overlay');
        const close = () => this.closeDetailModal();

        const newCloseBtn = closeBtn?.cloneNode(true);
        const newOverlay = overlay?.cloneNode(true);
        if (closeBtn) closeBtn.replaceWith(newCloseBtn);
        if (overlay) overlay.replaceWith(newOverlay);

        newCloseBtn?.addEventListener('click', close);
        newOverlay?.addEventListener('click', close);
    },

    closeDetailModal() {
        const modal = document.getElementById('item-modal');
        if (modal) {
            modal.classList.remove('show');
            setTimeout(() => { modal.hidden = true; }, 300);
        }
    },

    cardHtml(item, isFeatured) {
        const unavailable = !item.available;
        const imgSrc = item.image || '';
        const imgHtml = imgSrc
            ? '<img class="menu-item-image" src="' + Utils.escapeHtml(imgSrc) + '" alt="' + Utils.escapeHtml(item.name) + '" loading="lazy" onerror="this.style.display=\'none\'">'
            : '<div class="menu-item-image" style="display:flex;align-items:center;justify-content:center;font-size:2rem;background:#f0ebe4;">☕</div>';

        let tagsHtml = '';
        if (item.popular) tagsHtml += '<span class="tag tag-popular">Popular</span>';
        if (item.featured && isFeatured) tagsHtml += '<span class="tag tag-featured">Featured</span>';
        if (unavailable) tagsHtml += '<span class="tag tag-unavailable">Unavailable</span>';

        const desc = item.description ? Utils.escapeHtml(item.description) : '';

        return '<article class="menu-item-card' + (unavailable ? ' unavailable' : '') + '" data-id="' + Utils.escapeHtml(item.id) + '" tabindex="0" role="button" aria-label="' + Utils.escapeHtml(item.name) + ', ' + Utils.formatPrice(item.price, this.data.restaurant.currency) + (unavailable ? ', unavailable' : '') + '">' +
            imgHtml +
            '<div class="menu-item-body">' +
            '<div class="menu-item-header">' +
            '<h3 class="menu-item-name">' + Utils.escapeHtml(item.name) + '</h3>' +
            '<span class="menu-item-price">' + Utils.formatPrice(item.price, this.data.restaurant.currency) + '</span>' +
            '</div>' +
            (desc ? '<p class="menu-item-desc">' + desc + '</p>' : '') +
            (tagsHtml ? '<div class="menu-item-tags">' + tagsHtml + '</div>' : '') +
            '</div></article>';
    },

    featuredCardHtml(item, index) {
        const unavailable = !item.available;
        const imgSrc = item.image || '';

        let tagsHtml = '';
        if (item.popular) tagsHtml += '<span class="featured-card-tag popular">Popular</span>';
        if (item.featured) tagsHtml += '<span class="featured-card-tag featured">Featured</span>';
        if (unavailable) tagsHtml += '<span class="featured-card-tag unavailable">Unavailable</span>';

        const imgHtml = imgSrc
            ? '<div class="featured-card-image-wrap"><img class="featured-card-image" src="' + Utils.escapeHtml(imgSrc) + '" alt="' + Utils.escapeHtml(item.name) + '" loading="lazy" onerror="this.style.display=\'none\'"></div>'
            : '<div class="featured-card-image-wrap" style="display:flex;align-items:center;justify-content:center;font-size:2.5rem;background:#f0ebe4;">☕</div>';

        return '<article class="featured-card' + (unavailable ? ' unavailable' : '') + '" data-id="' + Utils.escapeHtml(item.id) + '" tabindex="0" role="button" aria-label="' + Utils.escapeHtml(item.name) + ', ' + Utils.formatPrice(item.price, this.data.restaurant.currency) + (unavailable ? ', unavailable' : '') + '">' +
            imgHtml +
            '<div class="featured-card-body">' +
            '<div class="featured-card-header">' +
            '<h3 class="featured-card-name">' + Utils.escapeHtml(item.name) + '</h3>' +
            '<span class="featured-card-price">' + Utils.formatPrice(item.price, this.data.restaurant.currency) + '</span>' +
            '</div>' +
            (item.description ? '<p class="featured-card-desc">' + Utils.escapeHtml(item.description) + '</p>' : '') +
            (tagsHtml ? '<div class="featured-card-tags">' + tagsHtml + '</div>' : '') +
            '</div></article>';
    },

    renderFooter() {
        const r = this.data.restaurant || {};
        const addr = document.getElementById('footer-address');
        const hours = document.getElementById('footer-hours');
        const social = document.getElementById('footer-social');
        const year = document.getElementById('current-year');

        if (addr) addr.textContent = r.address || '';
        if (hours) hours.textContent = r.hours || '';
        if (year) year.textContent = new Date().getFullYear();

        if (social) {
            let html = '';
            if (r.phone) {
                html += '<a href="tel:' + Utils.escapeHtml(r.phone) + '">📞 Call Us</a>';
            }
            if (r.social && Utils.isValidUrl(r.social)) {
                if (html) html += ' · ';
                html += '<a href="' + Utils.escapeHtml(r.social) + '" target="_blank" rel="noopener noreferrer">Follow us</a>';
            }
            social.innerHTML = html;
        }
    },

    refresh() {
        this.render();
    }
};
