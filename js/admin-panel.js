/* ============================================
   ADMIN PANEL — Menu Manager
   First Coffee Restaurant
   ============================================ */

(function () {
    'use strict';

    // State
    let data = null;
    let editingSectionId = null;
    let editingItemId = null;
    let activeTab = 'sections';

    // DOM refs
    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => document.querySelectorAll(sel);

    // Init
    function init() {
        if (!Auth.requireAuth()) return;

        const app = $('#admin-app');
        if (app) {
            app.style.display = '';
        }

        data = Storage.load();
        bindEvents();
        renderAll();
        renderAdmins();
        setupPermissionUI();

        if (new URLSearchParams(window.location.search).has('change-password')) {
            switchTab('admins');
            const pwForm = $('#change-password-form');
            if (pwForm) {
                pwForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
                showToast('Please change your password for security', '');
            }
        }
    }

    function bindEvents() {
        // Tabs
        $$('.admin-tab').forEach(tab => {
            tab.addEventListener('click', () => switchTab(tab.dataset.tab));
        });

        // Header actions
        $('#admin-logout')?.addEventListener('click', () => {
            if (confirm('Are you sure you want to log out?')) {
                Auth.logout();
                window.location.href = 'admin-login.html';
            }
        });
        $('#admin-preview')?.addEventListener('click', () => {
            window.location.href = 'index.html';
        });

        // Sections
        $('#add-section-btn')?.addEventListener('click', () => openSectionModal());
        $('#section-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            saveSection();
        });
        $('#section-cancel')?.addEventListener('click', closeSectionModal);

        // Items
        $('#add-item-btn')?.addEventListener('click', () => openItemModal());
        $('#item-section-filter')?.addEventListener('change', () => renderItems());
        $('#item-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            saveItem();
        });
        $('#item-cancel')?.addEventListener('click', closeItemModal);

        // Restaurant settings
        $('#restaurant-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            saveRestaurant();
        });

        // Data management
        $('#export-data')?.addEventListener('click', () => {
            Storage.exportJSON(data);
            showToast('Menu exported successfully');
        });
        $('#import-data')?.addEventListener('change', (e) => handleImport(e));
        $('#reset-data')?.addEventListener('click', () => {
            if (confirm('Reset all data to demo defaults? This cannot be undone.')) {
                data = Storage.reset();
                renderAll();
                showToast('Data reset to defaults');
            }
        });

        // QR Code
        const genBtn = $('#qr-generate-btn');
        if (genBtn) {
            genBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                try {
                    await generateQRCode();
                } catch (err) {
                    console.error('QR Click Error:', err);
                    showToast('Click error: ' + err.message, 'error');
                }
            });
        }
        $('#qr-print-btn')?.addEventListener('click', printQRPoster);
        $('#qr-download-btn')?.addEventListener('click', downloadQRCode);
        $('#qr-logo')?.addEventListener('change', handleLogoUpload);
        $('#qr-restaurant-display')?.addEventListener('input', (e) => {
            const nameEl = $('#qr-restaurant-name');
            if (nameEl) nameEl.textContent = e.target.value || (data.restaurant || {}).name || 'First Coffee Restaurant';
        });

        // Admins
        $('#add-admin-btn')?.addEventListener('click', () => openAdminModal());
        $('#admin-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            saveAdmin();
        });
        $('#admin-cancel')?.addEventListener('click', closeAdminModal);
        $('#change-password-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            changePassword();
        });

        // Modal close buttons
        $$('.modal-close').forEach(btn => {
            btn.addEventListener('click', () => {
                closeSectionModal();
                closeItemModal();
                closeAdminModal();
            });
        });

        // Modal overlay clicks
        $$('.modal-overlay').forEach(overlay => {
            overlay.addEventListener('click', () => {
                closeSectionModal();
                closeItemModal();
                closeAdminModal();
            });
        });

        // Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                closeSectionModal();
                closeItemModal();
                closeAdminModal();
            }
        });
    }

    function switchTab(tabId) {
        activeTab = tabId;
        $$('.admin-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tabId));
        $$('.admin-tab-content').forEach(content => {
            content.classList.toggle('active', content.id === 'tab-' + tabId);
        });
    }

    // =====================
    // SECTIONS
    // =====================

    function renderSections() {
        const list = $('#section-list');
        if (!list) return;

        const parentSelect = $('#s-parent');
        if (parentSelect) {
            parentSelect.innerHTML = '<option value="">None (Top-level)</option>' +
                data.categories.map(c =>
                    `<option value="${Utils.escapeHtml(c.id)}">${Utils.escapeHtml(c.name)}</option>`
                ).join('');
        }

        if (data.categories.length === 0) {
            list.innerHTML = `
                <li class="admin-list-item">
                    <div class="admin-list-item-info">
                        <span class="admin-list-item-name" style="color:#7A6A5E;">No sections yet. Create your first menu section to begin.</span>
                    </div>
                </li>`;
            return;
        }

        const sorted = [...data.categories].sort((a, b) => (a.order || 0) - (b.order || 0));

        list.innerHTML = sorted.map(section => {
            const itemCount = data.items.filter(i => i.categoryId === section.id).length;
            const parent = section.parentId ? data.categories.find(c => c.id === section.parentId) : null;
            const indent = parent ? 'margin-left: 1.5rem; border-left: 2px solid #E8E0D8; padding-left: 1rem;' : '';

            return `
                <li class="admin-list-item" data-id="${Utils.escapeHtml(section.id)}">
                    <div class="admin-list-item-info">
                        <div class="admin-list-item-name" style="${indent}">
                            ${parent ? '<span style="color:#D4A373;font-size:0.75rem;margin-right:0.5rem;">↳</span>' : ''}
                            ${Utils.escapeHtml(section.name)}
                        </div>
                        <div class="admin-list-item-meta">
                            ${itemCount} item${itemCount !== 1 ? 's' : ''}
                            ${parent ? ' · Sub-section of ' + Utils.escapeHtml(parent.name) : ' · Top-level section'}
                        </div>
                    </div>
                    <div class="admin-list-actions">
                        <button class="admin-btn-icon" data-action="up" title="Move up" aria-label="Move up">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m18 15-6-6-6 6"/></svg>
                        </button>
                        <button class="admin-btn-icon" data-action="down" title="Move down" aria-label="Move down">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                        </button>
                        <button class="admin-btn-icon" data-action="edit" title="Edit" aria-label="Edit section">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                        </button>
                        <button class="admin-btn-icon delete" data-action="delete" title="Delete" aria-label="Delete section">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                        </button>
                    </div>
                </li>`;
        }).join('');

        // Bind section actions
        list.querySelectorAll('.admin-btn-icon').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const li = btn.closest('.admin-list-item');
                const id = li?.dataset.id;
                const action = btn.dataset.action;
                if (!id) return;

                switch (action) {
                    case 'up': moveSection(id, -1); break;
                    case 'down': moveSection(id, 1); break;
                    case 'edit': editSection(id); break;
                    case 'delete': deleteSection(id); break;
                }
            });
        });
    }

    function openSectionModal(section = null) {
        editingSectionId = section ? section.id : null;
        const modal = $('#section-modal');
        const title = $('#section-modal-title');
        const form = $('#section-form');

        if (!modal || !form) return;

        title.textContent = section ? 'Edit Section' : 'Add Section';
        form.reset();

        if (section) {
            $('#s-name').value = section.name || '';
            $('#s-order').value = section.order || 1;
            $('#s-parent').value = section.parentId || '';
        } else {
            $('#s-order').value = data.categories.length + 1;
        }

        // Update parent select
        const parentSelect = $('#s-parent');
        parentSelect.innerHTML = '<option value="">None (Top-level)</option>' +
            data.categories
                .filter(c => c.id !== editingSectionId)
                .map(c =>
                    `<option value="${Utils.escapeHtml(c.id)}" ${section && section.parentId === c.id ? 'selected' : ''}>${Utils.escapeHtml(c.name)}</option>`
                ).join('');

        modal.hidden = false;
        requestAnimationFrame(() => modal.classList.add('show'));
        $('#s-name')?.focus();
    }

    function closeSectionModal() {
        const modal = $('#section-modal');
        if (modal) {
            modal.classList.remove('show');
            setTimeout(() => { modal.hidden = true; }, 300);
        }
        editingSectionId = null;
    }

    function saveSection() {
        const name = $('#s-name')?.value.trim();
        const order = parseInt($('#s-order')?.value) || 1;
        const parentId = $('#s-parent')?.value || '';

        if (!name) {
            showToast('Section name is required', 'error');
            return;
        }

        if (editingSectionId) {
            const idx = data.categories.findIndex(c => c.id === editingSectionId);
            if (idx >= 0) {
                data.categories[idx] = { ...data.categories[idx], name, order, parentId };
            }
        } else {
            data.categories.push({
                id: generateId('cat'),
                name,
                order,
                parentId: parentId || undefined
            });
        }

        Storage.save(data);
        renderSections();
        renderItems();
        updateItemSectionFilter();
        closeSectionModal();
        showToast(editingSectionId ? 'Section updated' : 'Section added');
    }

    function editSection(id) {
        const section = data.categories.find(c => c.id === id);
        if (section) openSectionModal(section);
    }

    function deleteSection(id) {
        if (!confirm('Delete this section and all its items?')) return;
        data.categories = data.categories.filter(c => c.id !== id);
        data.items = data.items.filter(i => i.categoryId !== id);
        Storage.save(data);
        renderSections();
        renderItems();
        updateItemSectionFilter();
        showToast('Section deleted');
    }

    function moveSection(id, direction) {
        const sorted = [...data.categories].sort((a, b) => (a.order || 0) - (b.order || 0));
        const idx = sorted.findIndex(c => c.id === id);
        if (idx < 0) return;
        const newIdx = idx + direction;
        if (newIdx < 0 || newIdx >= sorted.length) return;

        const tmp = sorted[idx].order || 0;
        sorted[idx].order = sorted[newIdx].order || 0;
        sorted[newIdx].order = tmp;

        data.categories = sorted;
        Storage.save(data);
        renderSections();
    }

    // =====================
    // ITEMS
    // =====================

    function renderItems() {
        const list = $('#item-list');
        if (!list) return;

        const filter = $('#item-section-filter')?.value || 'all';
        let items = [...data.items].sort((a, b) => (a.order || 0) - (b.order || 0));

        if (filter !== 'all') {
            items = items.filter(i => i.categoryId === filter);
        }

        if (items.length === 0) {
            list.innerHTML = `
                <li class="admin-list-item">
                    <div class="admin-list-item-info">
                        <span class="admin-list-item-name" style="color:#7A6A5E;">No items yet. Add your first menu item to begin.</span>
                    </div>
                </li>`;
            return;
        }

        list.innerHTML = items.map(item => {
            const section = data.categories.find(c => c.id === item.categoryId);
            const isAvailable = item.available !== false;
            const isFeatured = !!item.featured;

            return `
                <li class="admin-list-item" data-id="${Utils.escapeHtml(item.id)}">
                    <div class="admin-list-item-info">
                        <div class="admin-list-item-name">
                            ${Utils.escapeHtml(item.name) || '<em style="color:#7A6A5E;">Unnamed item</em>'}
                            ${isFeatured ? '<span class="status-badge featured" title="Featured">★</span>' : ''}
                            ${!isAvailable ? '<span class="status-badge unavailable" title="Out of stock">Unavailable</span>' : ''}
                        </div>
                        <div class="admin-list-item-meta">
                            ${Utils.formatPrice(item.price, data.restaurant.currency)}
                            · ${section ? Utils.escapeHtml(section.name) : 'Unknown section'}
                        </div>
                    </div>
                    <div class="admin-list-actions">
                        <button class="admin-btn-icon ${isFeatured ? 'active' : ''}" data-action="toggle-featured" title="${isFeatured ? 'Unfeature' : 'Feature'}" aria-label="Toggle featured">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="${isFeatured ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                        </button>
                        <button class="admin-btn-icon ${isAvailable ? '' : 'inactive'}" data-action="toggle-available" title="${isAvailable ? 'Mark Unavailable' : 'Mark Available'}" aria-label="Toggle availability">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                ${isAvailable
                                    ? '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>'
                                    : '<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>'}
                            </svg>
                        </button>
                        <button class="admin-btn-icon" data-action="up" title="Move up" aria-label="Move up">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m18 15-6-6-6 6"/></svg>
                        </button>
                        <button class="admin-btn-icon" data-action="down" title="Move down" aria-label="Move down">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                        </button>
                        <button class="admin-btn-icon" data-action="edit" title="Edit" aria-label="Edit item">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                        </button>
                        <button class="admin-btn-icon delete" data-action="delete" title="Delete" aria-label="Delete item">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                        </button>
                    </div>
                </li>`;
        }).join('');

        // Bind item actions
        list.querySelectorAll('.admin-btn-icon').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const li = btn.closest('.admin-list-item');
                const id = li?.dataset.id;
                const action = btn.dataset.action;
                if (!id) return;

                switch (action) {
                    case 'toggle-featured': toggleItemProperty(id, 'featured'); break;
                    case 'toggle-available': toggleItemProperty(id, 'available'); break;
                    case 'up': moveItem(id, -1); break;
                    case 'down': moveItem(id, 1); break;
                    case 'edit': editItem(id); break;
                    case 'delete': deleteItem(id); break;
                }
            });
        });
    }

    function openItemModal(item = null) {
        editingItemId = item ? item.id : null;
        const modal = $('#item-modal');
        const title = $('#item-modal-title');
        const form = $('#item-form');

        if (!modal || !form) return;

        title.textContent = item ? 'Edit Item' : 'Add Item';
        form.reset();

        if (item) {
            $('#i-name').value = item.name || '';
            $('#i-price').value = item.price || '';
            $('#i-section').value = item.categoryId || '';
            $('#i-available').checked = item.available !== false;
            $('#i-featured').checked = !!item.featured;
        } else {
            $('#i-available').checked = true;
            $('#i-featured').checked = false;
        }

        updateItemSectionSelect();
        modal.hidden = false;
        requestAnimationFrame(() => modal.classList.add('show'));
        $('#i-name')?.focus();
    }

    function closeItemModal() {
        const modal = $('#item-modal');
        if (modal) {
            modal.classList.remove('show');
            setTimeout(() => { modal.hidden = true; }, 300);
        }
        editingItemId = null;
    }

    function saveItem() {
        const name = $('#i-name')?.value.trim();
        const price = parseFloat($('#i-price')?.value) || 0;
        const categoryId = $('#i-section')?.value;
        const available = $('#i-available')?.checked;
        const featured = $('#i-featured')?.checked;

        if (!name) {
            showToast('Item name is required', 'error');
            return;
        }
        if (!categoryId) {
            showToast('Please select a section', 'error');
            return;
        }

        if (editingItemId) {
            const idx = data.items.findIndex(i => i.id === editingItemId);
            if (idx >= 0) {
                data.items[idx] = { ...data.items[idx], name, price, categoryId, available, featured };
            }
        } else {
            const maxOrder = data.items.reduce((m, i) => Math.max(m, i.order || 0), 0);
            data.items.push({
                id: generateId('item'),
                name,
                price,
                categoryId,
                order: maxOrder + 1,
                available: available !== false,
                featured: !!featured,
                popular: false
            });
        }

        Storage.save(data);
        renderItems();
        closeItemModal();
        showToast(editingItemId ? 'Item updated' : 'Item added');
    }

    function editItem(id) {
        const item = data.items.find(i => i.id === id);
        if (item) openItemModal(item);
    }

    function deleteItem(id) {
        if (!confirm('Delete this item?')) return;
        data.items = data.items.filter(i => i.id !== id);
        Storage.save(data);
        renderItems();
        showToast('Item deleted');
    }

    function moveItem(id, direction) {
        const items = [...data.items].sort((a, b) => (a.order || 0) - (b.order || 0));
        const idx = items.findIndex(i => i.id === id);
        if (idx < 0) return;
        const newIdx = idx + direction;
        if (newIdx < 0 || newIdx >= items.length) return;

        const tmp = items[idx].order || 0;
        items[idx].order = items[newIdx].order || 0;
        items[newIdx].order = tmp;

        data.items = items;
        Storage.save(data);
        renderItems();
    }

    function toggleItemProperty(id, property) {
        const item = data.items.find(i => i.id === id);
        if (!item) return;

        if (property === 'available') {
            item.available = item.available === false;
        } else if (property === 'featured') {
            item.featured = !item.featured;
        }

        Storage.save(data);
        renderItems();
        showToast(`Item ${property} status updated`);
    }

    // =====================
    // SETTINGS
    // =====================

    function renderSettings() {
        const r = data.restaurant || {};
        $('#r-name').value = r.name || '';
        $('#r-tagline').value = r.tagline || '';
        $('#r-address').value = r.address || '';
        $('#r-phone').value = r.phone || '';
        $('#r-hours').value = r.hours || '';
        $('#r-currency').value = r.currency || '';
        $('#r-social').value = r.social || '';
    }

    function saveRestaurant() {
        const fields = ['name', 'tagline', 'address', 'phone', 'hours', 'currency', 'social'];
        const updates = {};
        fields.forEach(field => {
            const el = $('#r-' + field);
            if (el) updates[field] = el.value.trim();
        });

        if (!updates.name) {
            showToast('Restaurant name is required', 'error');
            return;
        }

        data.restaurant = { ...data.restaurant, ...updates };
        Storage.save(data);
        showToast('Restaurant settings saved');
    }

    // =====================
    // DATA MANAGEMENT
    // =====================

    async function handleImport(e) {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const imported = await Storage.importJSON(file);
            data = imported;
            Storage.save(data);
            renderAll();
            showToast('Menu imported successfully');
        } catch (err) {
            showToast(err.message || 'Import failed', 'error');
        }
        e.target.value = '';
    }

    // =====================
    // HELPERS
    // =====================

    function updateItemSectionFilter() {
        const filter = $('#item-section-filter');
        if (!filter) return;
        filter.innerHTML = '<option value="all">All Sections</option>' +
            data.categories.map(c =>
                `<option value="${Utils.escapeHtml(c.id)}">${Utils.escapeHtml(c.name)}</option>`
            ).join('');
    }

    function updateItemSectionSelect() {
        const select = $('#i-section');
        if (!select) return;
        select.innerHTML = data.categories.map(c =>
            `<option value="${Utils.escapeHtml(c.id)}">${Utils.escapeHtml(c.name)}</option>`
        ).join('');
    }

    function renderAll() {
        renderSections();
        renderItems();
        renderSettings();
        renderAdmins();
        updateItemSectionFilter();
        renderQrDefaults();
    }

    function renderQrDefaults() {
        const urlInput = $('#qr-url');
        const displayInput = $('#qr-restaurant-display');
        if (urlInput && !urlInput.value) {
            urlInput.value = 'https://first-coffee-restaurant-instant-men.vercel.app/';
        }
        if (displayInput && data.restaurant && !displayInput.value) {
            displayInput.value = data.restaurant.name || '';
        }
    }

    let toastTimeout = null;

    function showToast(message, type = '') {
        const toast = $('#toast');
        if (!toast) return;
        if (toastTimeout) clearTimeout(toastTimeout);
        toast.textContent = message;
        toast.className = 'toast show' + (type ? ' ' + type : '');
        toastTimeout = setTimeout(() => {
            toast.classList.remove('show');
            toastTimeout = null;
        }, 3000);
    }

    // =====================
    // AUTH & ADMINS
    // =====================

    function renderAdmins() {
        const list = $('#admin-list');
        if (!list) return;

        const admins = Auth.getAllAdmins();
        const currentSession = Auth.getSession();

        if (admins.length === 0) {
            list.innerHTML = '<li class="admin-list-item"><span class="admin-list-item-name" style="color:#7A6A5E;">No admins found</span></li>';
            return;
        }

        list.innerHTML = admins.map(admin => {
            const canEdit = Auth.isSuperAdmin() && admin.id !== currentSession?.id;
            const roleLabel = admin.role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
            
            return `
                <li class="admin-list-item" data-id="${Utils.escapeHtml(admin.id)}">
                    <div class="admin-list-item-info">
                        <div class="admin-list-item-name">
                            ${Utils.escapeHtml(admin.username)}
                            ${admin.id === currentSession?.id ? '<span style="color:#D4A373;font-size:0.75rem;margin-left:0.5rem;">(You)</span>' : ''}
                        </div>
                        <div class="admin-list-item-meta">
                            ${roleLabel}
                            · ${admin.hasPassword ? 'Password set' : 'No password'}
                            ${admin.mustChangePassword ? ' · Must change password' : ''}
                        </div>
                    </div>
                    <div class="admin-list-actions">
                        ${canEdit ? `
                            <button class="admin-btn-icon" data-action="edit" title="Edit" aria-label="Edit admin">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                            </button>
                            <button class="admin-btn-icon delete" data-action="delete" title="Delete" aria-label="Delete admin">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                            </button>
                        ` : ''}
                    </div>
                </li>`;
        }).join('');

        // Bind admin actions
        list.querySelectorAll('.admin-btn-icon').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const li = btn.closest('.admin-list-item');
                const id = li?.dataset.id;
                const action = btn.dataset.action;
                if (!id) return;

                if (action === 'edit') editAdmin(id);
                if (action === 'delete') deleteAdmin(id);
            });
        });
    }

    function openAdminModal(admin = null) {
        if (!Auth.isSuperAdmin()) {
            showToast('Only Super Admins can manage admins', 'error');
            return;
        }

        const modal = $('#admin-modal');
        const title = $('#admin-modal-title');
        const form = $('#admin-form');

        if (!modal || !form) return;

        title.textContent = admin ? 'Edit Admin' : 'Add Admin';
        form.reset();

        if (admin) {
            $('#admin-username').value = admin.username || '';
            $('#admin-role').value = admin.role || 'editor';
            $('#admin-password').required = false;
            $('#admin-password').placeholder = 'Leave blank to keep current password';
        } else {
            $('#admin-username').value = '';
            $('#admin-role').value = 'editor';
            $('#admin-password').required = true;
            $('#admin-password').placeholder = 'Enter password';
        }

        modal.hidden = false;
        requestAnimationFrame(() => modal.classList.add('show'));
        $('#admin-username')?.focus();
    }

    function closeAdminModal() {
        const modal = $('#admin-modal');
        if (modal) {
            modal.classList.remove('show');
            setTimeout(() => { modal.hidden = true; }, 300);
        }
    }

    async function saveAdmin() {
        if (!Auth.isSuperAdmin()) {
            showToast('Only Super Admins can manage admins', 'error');
            return;
        }

        const username = $('#admin-username')?.value.trim();
        const password = $('#admin-password')?.value;
        const role = $('#admin-role')?.value;

        if (!username) {
            showToast('Username is required', 'error');
            return;
        }

        const editingId = $('#admin-modal').dataset.editingId;

        if (editingId) {
            const result = Auth.updateAdminRole(editingId, role);
            if (result.success) {
                if (password) {
                    const pwResult = await Auth.changePassword(editingId, password);
                    if (!pwResult.success) {
                        showToast('Password update failed', 'error');
                        return;
                    }
                }
                showToast('Admin updated');
            } else {
                showToast(result.message || 'Update failed', 'error');
            }
        } else {
            if (!password) {
                showToast('Password is required for new admin', 'error');
                return;
            }
            const result = Auth.addAdmin(username, role);
            if (result.success) {
                const pwResult = await Auth.changePassword(result.admin.id, password);
                if (!pwResult.success) {
                    showToast('Admin created but password setup failed', 'error');
                    return;
                }
                showToast('Admin added');
            } else {
                showToast(result.message || 'Add failed', 'error');
            }
        }

        closeAdminModal();
        renderAdmins();
    }

    function editAdmin(id) {
        const admins = Auth.getAllAdmins();
        const admin = admins.find(a => a.id === id);
        if (admin) {
            const modal = $('#admin-modal');
            if (modal) modal.dataset.editingId = id;
            openAdminModal(admin);
        }
    }

    function deleteAdmin(id) {
        if (!confirm('Delete this admin? This action cannot be undone.')) return;
        const result = Auth.removeAdmin(id);
        if (result.success) {
            showToast('Admin deleted');
            renderAdmins();
        } else {
            showToast(result.message || 'Delete failed', 'error');
        }
    }

    async function changePassword() {
        const current = $('#current-password')?.value;
        const newPass = $('#new-password')?.value;
        const confirm = $('#confirm-password')?.value;

        if (!current || !newPass || !confirm) {
            showToast('Please fill in all password fields', 'error');
            return;
        }

        if (newPass !== confirm) {
            showToast('New passwords do not match', 'error');
            return;
        }

        if (newPass.length < 6) {
            showToast('Password must be at least 6 characters', 'error');
            return;
        }

        const session = Auth.getSession();
        if (!session) return;

        const result = await Auth.changePassword(session.id, newPass, current);
        if (result.success) {
            showToast('Password updated successfully');
            $('#change-password-form').reset();
        } else {
            showToast(result.message || 'Password update failed', 'error');
        }
    }

    function setupPermissionUI() {
        const session = Auth.getSession();
        if (!session) return;

        const isSuperAdmin = Auth.isSuperAdmin();
        
        // Hide/show tabs based on role
        const adminsTab = document.querySelector('[data-tab="admins"]');
        if (adminsTab) {
            adminsTab.style.display = isSuperAdmin ? '' : 'none';
        }

        const dataTab = document.querySelector('[data-tab="data"]');
        if (dataTab) {
            const canManageData = Auth.hasPermission('manage_settings') || isSuperAdmin;
            dataTab.style.display = canManageData ? '' : 'none';
        }
    }

    let qrLogoDataUrl = null;

    function handleLogoUpload(e) {
        const file = e.target?.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            showToast('Please upload an image file (PNG, JPG, etc.)', 'error');
            return;
        }

        // 5MB limit for logo
        if (file.size > 5 * 1024 * 1024) {
            showToast('Logo must be under 5MB', 'error');
            return;
        }

        showToast('Processing logo...', '');

        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                qrLogoDataUrl = ev.target.result;
                updateQrLogoDisplay();
                // Clear the "Processing" toast and show success
                setTimeout(() => showToast('Logo uploaded successfully'), 200);
            } catch (err) {
                console.error('Logo Display Error:', err);
                showToast('Failed to process logo image', 'error');
            }
        };
        reader.onerror = () => {
            showToast('Error reading image file', 'error');
        };
        reader.readAsDataURL(file);
    }

    function updateQrLogoDisplay() {
        const logoPlaceholder = $('#qr-logo-display');
        const logocutout = $('#qr-logo-cutout');
        if (!logoPlaceholder || !logocutout) return;

        if (qrLogoDataUrl) {
            let imgHtml = '<img src="' + qrLogoDataUrl + '" alt="Client Logo" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">';
            logoPlaceholder.innerHTML = imgHtml;
            logoPlaceholder.style.border = 'none';
            logoPlaceholder.style.padding = '0';

            logocutout.innerHTML = imgHtml;
            logocutout.style.background = 'white';
            logocutout.style.padding = '2px';
        } else {
            logoPlaceholder.innerHTML = '☕';
            logoPlaceholder.style.border = '2px dashed #E8E0D8';
            logocutout.innerHTML = '☕';
        }
    }

    async function generateQRCode() {
        const urlInput = $('#qr-url');
        const sizeInput = $('#qr-size');
        const fgInput = $('#qr-fg');
        const bgInput = $('#qr-bg');
        const resultDiv = $('#qr-result');
        const qrImage = $('#qr-image');
        const restaurantNameEl = $('#qr-restaurant-name');

        if (!urlInput || !qrImage || !resultDiv) {
            showToast('Technical error: Missing QR elements', 'error');
            return;
        }

        const url = urlInput.value.trim() || 'https://first-coffee-restaurant-instant-men.vercel.app/';

        if (!Utils.isValidUrl(url)) {
            showToast('Please enter a valid URL (starting with https://)', 'error');
            return;
        }

        const size = parseInt(sizeInput?.value) || 600;
        const fg = fgInput?.value || '#1A1412';
        const bg = bgInput?.value || '#FAF7F2';

        const displayInput = $('#qr-restaurant-display');
        const restaurantName = (displayInput?.value?.trim() || (data.restaurant || {}).name || 'First Coffee Restaurant');
        if (restaurantNameEl) restaurantNameEl.textContent = restaurantName;

        if (typeof window.QrCode === 'undefined') {
            showToast('QR engine not initialized. Please refresh.', 'error');
            return;
        }

        showToast('Generating QR code...', '');
        const btn = $('#qr-generate-btn');
        if (btn) {
            btn.disabled = true;
            btn.textContent = 'Generating...';
        }

        try {
            // Step 1: Generate the QR matrix using the reliable danielgjackson library
            const matrix = window.QrCode.generate(url, {
                errorCorrectionLevel: 2 // Q level for better reliability with logos
            });

            // Step 2: Render to SVG Data URI
            const dataUrl = window.QrCode.render('svg-uri', matrix, {
                color: fg,
                white: bg,
                moduleRound: 0.1, // Slight rounding for premium look
                finderRound: 0.2
            });

            qrImage.src = dataUrl;
            resultDiv.removeAttribute('hidden');
            resultDiv.style.setProperty('display', 'block', 'important');

            // Allow time for the image to render before scrolling
            setTimeout(() => {
                resultDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);

            showToast('QR code generated successfully');
        } catch (err) {
            console.error('QR Generation Error:', err);
            showToast('QR generation failed: ' + err.message, 'error');
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.textContent = 'Generate QR Code';
            }
        }
    }

    function downloadQRCode() {
        const resultDiv = $('#qr-result');
        const qrImage = $('#qr-image');
        const poster = $('#qr-poster');

        if (!resultDiv || resultDiv.hidden || !qrImage || !qrImage.src || !poster) {
            showToast('Generate a QR code first', 'error');
            return;
        }

        showToast('Preparing high-quality download...', '');

        if (typeof html2canvas !== 'undefined') {
            const originalBg = poster.style.background;
            poster.style.background = 'var(--color-ivory)';
            html2canvas(poster, {
                scale: 3,
                useXHR: false,
                logging: false,
                backgroundColor: '#FAF7F2',
                allowTaint: true,
                foreignObjectRendering: false
            }).then(canvas => {
                poster.style.background = originalBg;
                const a = document.createElement('a');
                a.href = canvas.toDataURL('image/png', 1.0);
                a.download = 'first-coffee-qr-poster.png';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                showToast('High-quality poster downloaded');
            }).catch(err => {
                poster.style.background = originalBg;
                console.error('Download failed:', err);
                showToast('High-quality download failed, trying standard download', 'error');
                standardDownload(qrImage);
            });
        } else {
            standardDownload(qrImage);
        }
    }

    function standardDownload(qrImage) {
        const a = document.createElement('a');
        a.href = qrImage.src;
        a.download = 'first-coffee-qr.png';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        showToast('QR code downloaded');
    }

    function printQRPoster() {
        const resultDiv = $('#qr-result');
        if (!resultDiv || resultDiv.hidden || !$('#qr-image') || !$('#qr-image').src) {
            showToast('Generate a QR code first', 'error');
            return;
        }

        const actions = $('.qr-actions');
        if (actions) actions.style.display = 'none';
        window.print();
        setTimeout(() => { if (actions) actions.style.display = ''; }, 500);
    }

    // Start
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
