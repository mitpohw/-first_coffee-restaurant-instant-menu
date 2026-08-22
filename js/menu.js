const Menu = {
    data: null,
    activeCategory: 'all',
    searchQuery: '',
    activeFilters: {
        dietary: 'all',
        price: 'all'
    },

    init(data) {
        this.data = data;
        this.render();
    },

    get filteredItems() {
        let items = this.data.items || [];

        // If searching, search globally across all categories
        const searchQ = this.searchQuery.trim();
        if (searchQ) {
            const q = searchQ.toLowerCase();
            items = items.filter(i =>
                i.name.toLowerCase().includes(q) ||
                (i.description && i.description.toLowerCase().includes(q)) ||
                (i.tags && i.tags.some(t => t.toLowerCase().includes(q)))
            );
        } else if (this.activeCategory !== 'all') {
            items = items.filter(i => i.categoryId === this.activeCategory);
        }

        if (this.activeFilters.dietary !== 'all') {
            const diet = this.activeFilters.dietary;
            items = items.filter(i => {
                const dietary = i.dietary || [];
                if (diet === 'vegan') return dietary.includes('vegan');
                if (diet === 'vegetarian') return dietary.includes('vegetarian') || dietary.includes('vegan') || dietary.includes('vegan-option');
                if (diet === 'gluten-free') return dietary.includes('gluten-free');
                if (diet === 'dairy-free') return dietary.includes('dairy-free');
                return true;
            });
        }

        if (this.activeFilters.price !== 'all') {
            const [min, max] = this.activeFilters.price.split('-').map(v => v === '+' ? Infinity : parseInt(v));
            items = items.filter(i => i.price >= min && i.price <= max);
        }

        return items.sort((a, b) => (a.order || 0) - (b.order || 0));
    },

    get featuredItems() {
        const searchQ = this.searchQuery.trim().toLowerCase();
        let items = (this.data.items || []).filter(i => i.featured && i.available);

        if (searchQ) {
            items = items.filter(i =>
                i.name.toLowerCase().includes(searchQ) ||
                (i.description && i.description.toLowerCase().includes(searchQ))
            );
        }

        if (this.activeCategory !== 'all' || this.activeFilters.dietary !== 'all' || this.activeFilters.price !== 'all') {
             if (!searchQ) return [];
        }

        return items.sort((a, b) => (a.order || 0) - (b.order || 0));
    },

    render() {
        this.renderCategories();
        this.renderFeatured();
        this.renderItems();
        this.renderFooter();
        this.initScrollEffects();
        this.initLazyLoad();
        this.initFilterEvents();
    },

    initFilterEvents() {
        const filterChips = document.querySelectorAll('.filter-chip');
        filterChips.forEach(chip => {
            chip.addEventListener('click', () => {
                const filterType = chip.dataset.filter;
                const filterValue = chip.dataset.value;
                if (!filterType) return;

                if (filterType === 'dietary') {
                    this.activeFilters.dietary = filterValue;
                } else if (filterType === 'price') {
                    this.activeFilters.price = filterValue;
                }

                document.querySelectorAll('.filter-chip[data-filter="' + filterType + '"]').forEach(c => {
                    c.classList.toggle('active', c.dataset.value === filterValue);
                });

                this.renderItems();
                this.renderFeatured();
                this.updateFilterVisibility();
                this.scrollToTop();
            });
        });

        const clearBtn = document.getElementById('clear-filters');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                this.activeFilters.dietary = 'all';
                this.activeFilters.price = 'all';
                document.querySelectorAll('.filter-chip').forEach(c => c.classList.toggle('active', c.dataset.value === 'all'));
                this.renderItems();
                this.renderFeatured();
                this.updateFilterVisibility();
            });
        }
    },

    updateFilterVisibility() {
        const filterBar = document.getElementById('filter-bar');
        const hasActive = this.activeFilters.dietary !== 'all' || this.activeFilters.price !== 'all';
        if (filterBar) {
            filterBar.hidden = !hasActive;
        }
    },

    initLazyLoad() {
        if (!this._lazyObserver) {
            this._lazyObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        const src = img.getAttribute('data-src');
                        if (src) {
                            img.src = src;
                            img.classList.add('lazy-loaded');
                        }
                        this._lazyObserver.unobserve(img);
                    }
                });
            }, { rootMargin: '50px 0px', threshold: 0.01 });
        }

        document.querySelectorAll('img[data-src]:not(.lazy-loaded)').forEach(img => {
            this._lazyObserver.observe(img);
        });
    },

    initScrollEffects() {
        const header = document.querySelector('.site-header');
        const catNav = document.querySelector('.category-nav');
        if (!header && !catNav) return;

        const handleScroll = () => {
            const scrolled = window.scrollY > 12;
            const scrollProgress = Math.min(window.scrollY / 120, 1);

            if (header) {
                header.classList.toggle('scrolled', scrolled);
                const shadowOpacity = scrollProgress * 0.08;
                header.style.boxShadow = scrolled
                    ? `0 4px 24px rgba(26, 20, 18, ${shadowOpacity})`
                    : 'none';
            }
            if (catNav) {
                catNav.classList.toggle('scrolled', scrolled);
                const navOpacity = 0.85 + scrollProgress * 0.1;
                catNav.style.boxShadow = scrolled
                    ? `0 2px 16px rgba(26, 20, 18, ${scrollProgress * 0.06})`
                    : 'none';
            }
        };

        window.removeEventListener('scroll', this._scrollHandler);
        this._scrollHandler = Utils.debounce(handleScroll, 8);
        window.addEventListener('scroll', this._scrollHandler, { passive: true });
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
        this.activeFilters.dietary = 'all';
        this.activeFilters.price = 'all';
        document.querySelectorAll('.cat-btn').forEach(b => b.classList.toggle('active', b.dataset.cat === catId));
        document.querySelectorAll('.filter-chip').forEach(c => c.classList.toggle('active', c.dataset.value === 'all'));
        const activeBtn = document.querySelector('.cat-btn[data-cat="' + catId + '"]');
        if (activeBtn) {
            activeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
        this.renderItems();
        this.renderFeatured();
        this.updateFilterVisibility();
        if (catId !== 'all') {
            const section = document.getElementById(catId);
            if (section) {
                section.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        } else {
            const target = document.getElementById('menu-main');
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
            ? '<div style="position:relative;"><img class="modal-image" src="' + Utils.escapeHtml(imgSrc) + '" alt="' + Utils.escapeHtml(item.name) + '" loading="lazy" onerror="this.style.display=\'none\'; this.nextElementSibling.style.display=\'flex\';">' +
              '<div class="modal-image placeholder" style="display:none;align-items:center;justify-content:center;font-size:4rem;background:var(--color-border-light);height:300px;border-radius:var(--radius-md);margin-bottom:1.5rem;">☕</div></div>'
            : '<div class="modal-image placeholder" style="display:flex;align-items:center;justify-content:center;font-size:4rem;background:var(--color-border-light);height:300px;border-radius:var(--radius-md);margin-bottom:1.5rem;">☕</div>';

        let tagsHtml = '';
        if (item.popular) tagsHtml += '<span class="tag tag-popular">Popular</span>';
        if (item.featured) tagsHtml += '<span class="tag tag-featured">Featured</span>';
        if (unavailable) tagsHtml += '<span class="tag tag-unavailable">Unavailable</span>';
        if (item.dietary && item.dietary.includes('vegan')) tagsHtml += '<span class="tag tag-dietary">Vegan</span>';
        if (item.dietary && item.dietary.includes('vegetarian') && !item.dietary.includes('vegan')) tagsHtml += '<span class="tag tag-dietary">Vegetarian</span>';
        if (item.dietary && item.dietary.includes('gluten-free')) tagsHtml += '<span class="tag tag-dietary">Gluten-Free</span>';
        if (item.dietary && item.dietary.includes('dairy-free')) tagsHtml += '<span class="tag tag-dietary">Dairy-Free</span>';

        let optionsHtml = '';
        if (item.options && item.options.length > 0) {
            optionsHtml = '<div class="modal-section"><h3>Options</h3><ul>' +
                item.options.map(o => '<li><strong>' + Utils.escapeHtml(o.name) + ':</strong> ' + Utils.escapeHtml((o.choices || []).join(', ')) + (o.required ? ' (required)' : '') + '</li>').join('') +
                '</ul></div>';
        }

        body.innerHTML =
            (imgHtml || '<div style="height:200px;background:var(--color-border-light);border-radius:var(--radius-md);margin-bottom:1.5rem;display:flex;align-items:center;justify-content:center;font-size:3rem;">☕</div>') +
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

        this.attachZoom();
    },

    attachZoom() {
        const modal = document.getElementById('item-modal');
        const zoomOverlay = document.getElementById('image-zoom');
        const zoomImg = document.getElementById('zoom-img');
        const modalImg = modal?.querySelector('.modal-image');

        if (!modalImg || !zoomOverlay || !zoomImg) return;
        if (!modalImg.src || modalImg.style.display === 'none') return;

        const openZoom = () => {
            zoomImg.src = modalImg.src;
            zoomImg.alt = modalImg.alt || '';
            zoomOverlay.classList.add('visible');
            zoomOverlay.style.opacity = '1';
            document.body.style.overflow = 'hidden';
        };

        const closeZoom = () => {
            zoomOverlay.classList.remove('visible');
            document.body.style.overflow = '';
        };

        modalImg.style.cursor = 'zoom-in';
        modalImg.onclick = openZoom;

        zoomOverlay.onclick = closeZoom;
        zoomImg.onclick = (e) => e.stopPropagation();
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
        const placeholder = '<div class="menu-item-image placeholder">☕</div>';

        const imgHtml = imgSrc
            ? '<img class="menu-item-image lazyload" data-src="' + Utils.escapeHtml(imgSrc) + '" alt="' + Utils.escapeHtml(item.name) + '" loading="lazy" onerror="this.style.display=\'none\'; this.nextElementSibling.style.display=\'flex\';">' +
              '<div class="menu-item-image placeholder" style="display:none;">☕</div>'
            : placeholder;

        let tagsHtml = '';
        if (item.popular) tagsHtml += '<span class="tag tag-popular">Popular</span>';
        if (item.featured && isFeatured) tagsHtml += '<span class="tag tag-featured">Featured</span>';
        if (unavailable) tagsHtml += '<span class="tag tag-unavailable">Unavailable</span>';
        if (item.dietary && item.dietary.includes('vegan')) tagsHtml += '<span class="tag tag-dietary">Vegan</span>';
        if (item.dietary && item.dietary.includes('vegetarian') && !item.dietary.includes('vegan')) tagsHtml += '<span class="tag tag-dietary">Vegetarian</span>';

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
        const placeholder = '<div class="featured-card-image-wrap placeholder">☕</div>';

        let tagsHtml = '';
        if (item.popular) tagsHtml += '<span class="featured-card-tag popular">Popular</span>';
        if (item.featured) tagsHtml += '<span class="featured-card-tag featured">Featured</span>';
        if (unavailable) tagsHtml += '<span class="featured-card-tag unavailable">Unavailable</span>';

        const imgHtml = imgSrc
            ? '<div class="featured-card-image-wrap"><img class="featured-card-image lazyload" data-src="' + Utils.escapeHtml(imgSrc) + '" alt="' + Utils.escapeHtml(item.name) + '" loading="lazy" onerror="this.style.display=\'none\'; this.nextElementSibling.style.display=\'flex\';">' +
              '<div class="featured-card-image-wrap placeholder" style="display:none;height:100%;width:100%;">☕</div></div>'
            : placeholder;

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
    },

    scrollToTop() {
        const target = document.getElementById('menu-main');
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }
};
