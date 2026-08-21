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
        data = Storage.load();
        bindEvents();
        renderAll();
    }

    function bindEvents() {
        // Tabs
        $$('.admin-tab').forEach(tab => {
            tab.addEventListener('click', () => switchTab(tab.dataset.tab));
        });

        // Header actions
        $('#admin-exit')?.addEventListener('click', () => {
            window.location.href = 'index.html';
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
        $('#qr-generate-btn')?.addEventListener('click', generateQRCode);
        $('#qr-print-btn')?.addEventListener('click', printQRPoster);
        $('#qr-download-btn')?.addEventListener('click', downloadQRCode);

        // Modal close buttons
        $$('.modal-close').forEach(btn => {
            btn.addEventListener('click', () => {
                closeSectionModal();
                closeItemModal();
            });
        });

        // Modal overlay clicks
        $$('.modal-overlay').forEach(overlay => {
            overlay.addEventListener('click', () => {
                closeSectionModal();
                closeItemModal();
            });
        });

        // Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                closeSectionModal();
                closeItemModal();
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
            return `
                <li class="admin-list-item" data-id="${Utils.escapeHtml(item.id)}">
                    <div class="admin-list-item-info">
                        <div class="admin-list-item-name">${Utils.escapeHtml(item.name) || '<em style="color:#7A6A5E;">Unnamed item</em>'}</div>
                        <div class="admin-list-item-meta">
                            ${Utils.formatPrice(item.price, data.restaurant.currency)}
                            · ${section ? Utils.escapeHtml(section.name) : 'Unknown section'}
                            ${!item.available ? ' · Unavailable' : ''}
                        </div>
                    </div>
                    <div class="admin-list-actions">
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
                data.items[idx] = { ...data.items[idx], name, price, categoryId };
            }
        } else {
            const maxOrder = data.items.reduce((m, i) => Math.max(m, i.order || 0), 0);
            data.items.push({
                id: generateId('item'),
                name,
                price,
                categoryId,
                order: maxOrder + 1,
                available: true,
                featured: false,
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
        updateItemSectionFilter();
    }

    function showToast(message, type = '') {
        const toast = $('#toast');
        if (!toast) return;
        toast.textContent = message;
        toast.className = 'toast show' + (type ? ' ' + type : '');
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }

    // =====================
    // QR CODE GENERATOR
    // =====================

    function generateQRCode() {
        const urlInput = $('#qr-url');
        const sizeInput = $('#qr-size');
        const fgInput = $('#qr-fg');
        const bgInput = $('#qr-bg');
        const resultDiv = $('#qr-result');
        const qrImage = $('#qr-image');

        if (!urlInput || !qrImage || !resultDiv) return;

        let url = urlInput.value.trim();
        if (!url) {
            url = window.location.href.split('?')[0];
            urlInput.value = url;
        }

        if (!Utils.isValidUrl(url)) {
            showToast('Please enter a valid URL', 'error');
            return;
        }

        const size = Math.max(200, Math.min(1200, parseInt(sizeInput?.value) || 600));
        const fg = fgInput?.value || '#0a0a0a';
        const bg = bgInput?.value || '#faf8f5';

        if (typeof QRCode === 'undefined') {
            showToast('QR library not loaded. Check your connection.', 'error');
            return;
        }

        QRCode.toDataURL(url, {
            width: size,
            margin: 2,
            color: { dark: fg, light: bg },
            errorCorrectionLevel: 'M'
        }, (err, dataUrl) => {
            if (err) {
                console.error(err);
                showToast('QR generation failed', 'error');
                return;
            }
            qrImage.src = dataUrl;
            resultDiv.hidden = false;
            showToast('QR code generated successfully');
        });
    }

    function printQRPoster() {
        const resultDiv = $('#qr-result');
        if (!resultDiv || resultDiv.hidden) {
            showToast('Generate a QR code first', 'error');
            return;
        }
        window.print();
    }

    function downloadQRCode() {
        const qrImage = $('#qr-image');
        if (!qrImage || !qrImage.src) {
            showToast('Generate a QR code first', 'error');
            return;
        }
        const a = document.createElement('a');
        a.href = qrImage.src;
        a.download = 'first-coffee-qr.png';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        showToast('QR code downloaded');
    }

    // Start
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
