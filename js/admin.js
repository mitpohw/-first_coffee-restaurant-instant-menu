const Admin = {
    data: null,
    editingItemId: null,
    eventsBound: false,

    init(data) {
        this.data = data;
        if (!this.eventsBound) {
            this.bindEvents();
            this.eventsBound = true;
        }
        this.render();
    },

    refresh(data) {
        this.data = data;
        this.render();
    },

    bindEvents() {
        document.getElementById('admin-exit')?.addEventListener('click', () => App.showMenu());
        document.getElementById('admin-preview')?.addEventListener('click', () => App.showMenuPreview());
        document.getElementById('restaurant-form')?.addEventListener('submit', (e) => { e.preventDefault(); this.saveRestaurant(); });
        document.getElementById('add-category')?.addEventListener('click', () => this.addCategory());
        document.getElementById('add-item')?.addEventListener('click', () => this.addItem());
        document.getElementById('item-category-filter')?.addEventListener('change', () => this.renderItems());
        document.getElementById('export-data')?.addEventListener('click', () => this.exportData());
        document.getElementById('import-data')?.addEventListener('change', (e) => this.importData(e));
        document.getElementById('reset-data')?.addEventListener('click', () => this.confirmReset());
        document.getElementById('qr-generate')?.addEventListener('click', () => QR.generate());
        document.getElementById('qr-download')?.addEventListener('click', () => QR.download());
        document.getElementById('qr-copy-url')?.addEventListener('click', () => QR.copyUrl());
        document.getElementById('qr-print')?.addEventListener('click', () => QR.printPoster());
    },

    render() {
        this.renderRestaurant();
        this.renderCategories();
        this.renderItems();
        this.renderQrDefaults();
    },

    renderRestaurant() {
        const r = this.data.restaurant || {};
        const map = {
            'r-name': r.name || '',
            'r-tagline': r.tagline || '',
            'r-address': r.address || '',
            'r-phone': r.phone || '',
            'r-hours': r.hours || '',
            'r-currency': r.currency || 'ETB',
            'r-social': r.social || ''
        };
        for (const [id, val] of Object.entries(map)) {
            const el = document.getElementById(id);
            if (el) el.value = val;
        }
    },

    saveRestaurant() {
        const fields = ['r-name', 'r-tagline', 'r-address', 'r-phone', 'r-hours', 'r-currency', 'r-social'];
        const keys = ['name', 'tagline', 'address', 'phone', 'hours', 'currency', 'social'];
        const updates = {};
        fields.forEach((id, idx) => {
            const el = document.getElementById(id);
            if (el) updates[keys[idx]] = el.value.trim();
        });
        if (!updates.name) {
            App.showToast('Restaurant name is required', 'error');
            return;
        }
        this.data.restaurant = { ...this.data.restaurant, ...updates };
        Storage.save(this.data);
        Menu.data = this.data;
        Menu.refresh();
        App.showToast('Restaurant info saved');
    },

    renderCategories() {
        const list = document.getElementById('category-list');
        if (!list) return;
        const cats = [...(this.data.categories || [])].sort((a, b) => (a.order || 0) - (b.order || 0));
        if (cats.length === 0) {
            list.innerHTML = '<li class="admin-list-item"><span class="admin-list-item-info"><span class="admin-list-item-name">No categories yet</span></span></li>';
            return;
        }
        list.innerHTML = cats.map(c => {
            const itemCount = (this.data.items || []).filter(i => i.categoryId === c.id).length;
            return '<li class="admin-list-item" data-id="' + Utils.escapeHtml(c.id) + '">' +
                '<div class="admin-list-item-info">' +
                '<span class="admin-list-item-name">' + Utils.escapeHtml(c.name) + '</span>' +
                '<span class="admin-list-item-meta">' + itemCount + ' item' + (itemCount !== 1 ? 's' : '') + '</span>' +
                '</div>' +
                '<div class="admin-list-actions">' +
                '<button class="admin-btn-icon" data-action="up" title="Move up" aria-label="Move up"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m18 15-6-6-6 6"/></svg></button>' +
                '<button class="admin-btn-icon" data-action="down" title="Move down" aria-label="Move down"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg></button>' +
                '<button class="admin-btn-icon" data-action="edit" title="Edit" aria-label="Edit category"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg></button>' +
                '<button class="admin-btn-icon delete" data-action="delete" title="Delete" aria-label="Delete category"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg></button>' +
                '</div></li>';
        }).join('');

        list.querySelectorAll('.admin-btn-icon').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const li = btn.closest('.admin-list-item');
                const id = li?.dataset.id;
                const action = btn.dataset.action;
                if (!id) return;
                if (action === 'up') this.moveCategory(id, -1);
                else if (action === 'down') this.moveCategory(id, 1);
                else if (action === 'edit') this.editCategory(id);
                else if (action === 'delete') this.deleteCategory(id);
            });
        });
    },

    addCategory() {
        const name = prompt('Category name:');
        if (!name || !name.trim()) return;
        const cats = this.data.categories || [];
        const maxOrder = cats.reduce((m, c) => Math.max(m, c.order || 0), 0);
        const newCat = { id: generateId('cat'), name: name.trim(), order: maxOrder + 1 };
        this.data.categories = [...cats, newCat];
        this.saveAndRefresh();
        App.showToast('Category added');
    },

    editCategory(id) {
        const cat = (this.data.categories || []).find(c => c.id === id);
        if (!cat) return;
        const name = prompt('Edit category name:', cat.name);
        if (name === null) return;
        if (!name.trim()) { App.showToast('Name cannot be empty', 'error'); return; }
        cat.name = name.trim();
        this.saveAndRefresh();
        App.showToast('Category updated');
    },

    deleteCategory(id) {
        if (!confirm('Delete this category and all its items?')) return;
        this.data.categories = (this.data.categories || []).filter(c => c.id !== id);
        this.data.items = (this.data.items || []).filter(i => i.categoryId !== id);
        this.saveAndRefresh();
        App.showToast('Category deleted');
    },

    moveCategory(id, dir) {
        const cats = [...(this.data.categories || [])].sort((a, b) => (a.order || 0) - (b.order || 0));
        const idx = cats.findIndex(c => c.id === id);
        if (idx < 0) return;
        const newIdx = idx + dir;
        if (newIdx < 0 || newIdx >= cats.length) return;
        const tmp = cats[idx].order || 0;
        cats[idx].order = cats[newIdx].order || 0;
        cats[newIdx].order = tmp;
        this.data.categories = cats;
        this.saveAndRefresh();
    },

    renderItems() {
        const list = document.getElementById('item-list');
        const filter = document.getElementById('item-category-filter');
        if (!list) return;

        const filterVal = filter?.value || 'all';
        let items = [...(this.data.items || [])].sort((a, b) => (a.order || 0) - (b.order || 0));
        if (filterVal !== 'all') {
            items = items.filter(i => i.categoryId === filterVal);
        }

        const cats = this.data.categories || [];
        const catName = (id) => {
            const c = cats.find(c => c.id === id);
            return c ? c.name : 'Unknown';
        };

        if (items.length === 0) {
            list.innerHTML = '<li class="admin-list-item"><span class="admin-list-item-info"><span class="admin-list-item-name">No items yet</span></span></li>';
            return;
        }

        list.innerHTML = items.map(i => {
            return '<li class="admin-list-item" data-id="' + Utils.escapeHtml(i.id) + '">' +
                '<div class="admin-list-item-info">' +
                '<span class="admin-list-item-name">' + Utils.escapeHtml(i.name) + '</span>' +
                '<span class="admin-list-item-meta">' + Utils.formatPrice(i.price, this.data.restaurant.currency) + ' · ' + Utils.escapeHtml(catName(i.categoryId)) + (i.available ? '' : ' · Unavailable') + '</span>' +
                '</div>' +
                '<div class="admin-list-actions">' +
                '<button class="admin-btn-icon" data-action="up" title="Move up" aria-label="Move up"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m18 15-6-6-6 6"/></svg></button>' +
                '<button class="admin-btn-icon" data-action="down" title="Move down" aria-label="Move down"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg></button>' +
                '<button class="admin-btn-icon" data-action="edit" title="Edit" aria-label="Edit item"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg></button>' +
                '<button class="admin-btn-icon delete" data-action="delete" title="Delete" aria-label="Delete item"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg></button>' +
                '</div></li>';
        }).join('');

        list.querySelectorAll('.admin-btn-icon').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const li = btn.closest('.admin-list-item');
                const id = li?.dataset.id;
                const action = btn.dataset.action;
                if (!id) return;
                if (action === 'up') this.moveItem(id, -1);
                else if (action === 'down') this.moveItem(id, 1);
                else if (action === 'edit') this.editItem(id);
                else if (action === 'delete') this.deleteItem(id);
            });
        });
    },

    addItem() {
        this.editingItemId = null;
        this.openItemModal();
    },

    editItem(id) {
        this.editingItemId = id;
        this.openItemModal();
    },

    openItemModal() {
        const isEdit = !!this.editingItemId;
        const item = isEdit ? (this.data.items || []).find(i => i.id === this.editingItemId) : null;
        const cats = this.data.categories || [];

        const modal = document.getElementById('item-modal');
        const body = document.getElementById('modal-body');
        if (!modal || !body) return;

        const catOptions = cats.map(c => '<option value="' + Utils.escapeHtml(c.id) + '"' + (item && item.categoryId === c.id ? ' selected' : '') + '>' + Utils.escapeHtml(c.name) + '</option>').join('');

        body.innerHTML =
            '<h2 class="modal-title" id="modal-title">' + (isEdit ? 'Edit Item' : 'Add Item') + '</h2>' +
            '<form id="item-form" class="form">' +
            '<div class="form-group"><label for="i-name">Name</label><input id="i-name" type="text" required value="' + (item ? Utils.escapeHtml(item.name) : '') + '"></div>' +
            '<div class="form-group"><label for="i-desc">Description</label><textarea id="i-desc">' + (item ? Utils.escapeHtml(item.description || '') : '') + '</textarea></div>' +
            '<div class="form-group"><label for="i-price">Price (' + Utils.escapeHtml(this.data.restaurant.currency || 'ETB') + ')</label><input id="i-price" type="number" step="0.01" min="0" required value="' + (item ? item.price : '') + '"></div>' +
            '<div class="form-group"><label for="i-category">Category</label><select id="i-category">' + catOptions + '</select></div>' +
            '<div class="form-group"><label for="i-image">Image URL</label><input id="i-image" type="url" value="' + (item ? Utils.escapeHtml(item.image || '') : '') + '"></div>' +
            '<div class="form-group"><label for="i-tags">Tags (comma-separated)</label><input id="i-tags" type="text" value="' + (item && item.tags ? item.tags.join(', ') : '') + '"></div>' +
            '<div class="form-group"><label for="i-note">Preparation Note</label><input id="i-note" type="text" value="' + (item ? Utils.escapeHtml(item.note || '') : '') + '"></div>' +
            '<div class="form-group"><label for="i-allergens">Allergens</label><input id="i-allergens" type="text" value="' + (item ? Utils.escapeHtml(item.allergens || '') : '') + '"></div>' +
            '<div class="form-group"><label>Options (JSON)</label><textarea id="i-options">' + (item ? Utils.escapeHtml(JSON.stringify(item.options || [])) : '[]') + '</textarea><small style="color:var(--color-text-muted);font-size:0.75rem;">e.g. [{"name":"Size","choices":["S","M","L"],"required":false}]</small></div>' +
            '<div class="form-group" style="flex-direction:row;align-items:center;gap:0.5rem;">' +
            '<input id="i-available" type="checkbox" style="width:auto;"' + (item ? (item.available ? ' checked' : '') : ' checked') + '>' +
            '<label for="i-available" style="margin:0;">Available</label>' +
            '</div>' +
            '<div class="form-group" style="flex-direction:row;align-items:center;gap:0.5rem;">' +
            '<input id="i-featured" type="checkbox" style="width:auto;"' + (item ? (item.featured ? ' checked' : '') : '') + '>' +
            '<label for="i-featured" style="margin:0;">Featured</label>' +
            '</div>' +
            '<div class="form-group" style="flex-direction:row;align-items:center;gap:0.5rem;">' +
            '<input id="i-popular" type="checkbox" style="width:auto;"' + (item ? (item.popular ? ' checked' : '') : '') + '>' +
            '<label for="i-popular" style="margin:0;">Popular</label>' +
            '</div>' +
            '<button type="submit" class="btn btn-primary">Save</button>' +
            '<button type="button" class="btn btn-secondary" id="cancel-item">Cancel</button>' +
            '</form>';

        modal.hidden = false;
        requestAnimationFrame(() => modal.classList.add('show'));

        const closeBtn = modal.querySelector('.modal-close');
        const overlay = modal.querySelector('.modal-overlay');
        if (closeBtn) {
            const newBtn = closeBtn.cloneNode(true);
            closeBtn.replaceWith(newBtn);
            newBtn.addEventListener('click', () => this.closeItemModal());
        }
        if (overlay) {
            const newOverlay = overlay.cloneNode(true);
            overlay.replaceWith(newOverlay);
            newOverlay.addEventListener('click', () => this.closeItemModal());
        }

        document.getElementById('item-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveItem();
        });
        document.getElementById('cancel-item')?.addEventListener('click', () => this.closeItemModal());

        document.getElementById('i-name')?.focus();
    },

    saveItem() {
        const name = document.getElementById('i-name')?.value.trim();
        const priceRaw = document.getElementById('i-price')?.value;
        const categoryId = document.getElementById('i-category')?.value;
        const description = document.getElementById('i-desc')?.value.trim();
        const image = document.getElementById('i-image')?.value.trim();
        const tagsRaw = document.getElementById('i-tags')?.value;
        const note = document.getElementById('i-note')?.value.trim();
        const allergens = document.getElementById('i-allergens')?.value.trim();
        const available = document.getElementById('i-available')?.checked ?? true;
        const featured = document.getElementById('i-featured')?.checked ?? false;
        const popular = document.getElementById('i-popular')?.checked ?? false;
        const optionsRaw = document.getElementById('i-options')?.value;

        if (!name) { App.showToast('Name is required', 'error'); return; }
        const price = parseFloat(priceRaw);
        if (Number.isNaN(price) || price < 0) { App.showToast('Valid price is required', 'error'); return; }

        let options = [];
        try {
            options = JSON.parse(optionsRaw || '[]');
            if (!Array.isArray(options)) throw new Error('Options must be an array');
        } catch {
            App.showToast('Invalid options JSON', 'error');
            return;
        }

        const tags = tagsRaw.split(',').map(t => t.trim()).filter(Boolean);

        if (this.editingItemId) {
            const idx = (this.data.items || []).findIndex(i => i.id === this.editingItemId);
            if (idx >= 0) {
                this.data.items[idx] = { ...this.data.items[idx], name, price, categoryId, description, image, tags, note, allergens, available, featured, popular, options };
            }
        } else {
            const maxOrder = (this.data.items || []).reduce((m, i) => Math.max(m, i.order || 0), 0);
            const newItem = { id: generateId('item'), name, price, categoryId, description, image, tags, note, allergens, available, featured, popular, options, order: maxOrder + 1 };
            this.data.items = [...(this.data.items || []), newItem];
        }

        this.saveAndRefresh();
        this.closeItemModal();
        App.showToast(this.editingItemId ? 'Item updated' : 'Item added');
    },

    deleteItem(id) {
        if (!confirm('Delete this item?')) return;
        this.data.items = (this.data.items || []).filter(i => i.id !== id);
        this.saveAndRefresh();
        App.showToast('Item deleted');
    },

    moveItem(id, dir) {
        const items = [...(this.data.items || [])].sort((a, b) => (a.order || 0) - (b.order || 0));
        const idx = items.findIndex(i => i.id === id);
        if (idx < 0) return;
        const newIdx = idx + dir;
        if (newIdx < 0 || newIdx >= items.length) return;
        const tmp = items[idx].order || 0;
        items[idx].order = items[newIdx].order || 0;
        items[newIdx].order = tmp;
        this.data.items = items;
        this.saveAndRefresh();
    },

    showItemModal(item) {
        this.editingItemId = item.id;
        this.openItemModal();
    },

    closeItemModal() {
        const modal = document.getElementById('item-modal');
        if (modal) {
            modal.classList.remove('show');
            setTimeout(() => { modal.hidden = true; }, 300);
        }
        this.editingItemId = null;
    },

    renderQrDefaults() {
        const urlInput = document.getElementById('qr-url');
        if (urlInput && !urlInput.value) {
            urlInput.value = window.location.href.split('?')[0];
        }
    },

    exportData() {
        Storage.exportJSON(this.data);
        App.showToast('Menu exported');
    },

    async importData(e) {
        const file = e.target.files[0];
        if (!file) return;
        try {
            const data = await Storage.importJSON(file);
            this.data = data;
            Storage.save(data);
            Menu.data = data;
            this.render();
            Menu.refresh();
            this.updateCategoryFilter();
            App.showToast('Menu imported successfully');
        } catch (err) {
            App.showToast(err.message || 'Import failed', 'error');
        }
        e.target.value = '';
    },

    confirmReset() {
        if (!confirm('Reset all data to demo defaults? This cannot be undone.')) return;
        this.data = Storage.reset();
        Menu.data = this.data;
        this.render();
        Menu.refresh();
        this.updateCategoryFilter();
        App.showToast('Data reset to defaults');
    },

    saveAndRefresh() {
        Storage.save(this.data);
        Menu.data = this.data;
        this.render();
        Menu.refresh();
        this.updateCategoryFilter();
    },

    updateCategoryFilter() {
        const filter = document.getElementById('item-category-filter');
        if (!filter) return;
        const cats = this.data.categories || [];
        let html = '<option value="all">All Categories</option>';
        for (const c of cats) {
            html += '<option value="' + Utils.escapeHtml(c.id) + '">' + Utils.escapeHtml(c.name) + '</option>';
        }
        filter.innerHTML = html;
    }
};
