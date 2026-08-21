const Storage = {
    KEY: 'first-coffee-menu-data',
    VERSION: 1,

    getDefaultData() {
        return {
            version: this.VERSION,
            restaurant: { ...DEFAULT_RESTAURANT },
            categories: DEFAULT_CATEGORIES.map(c => ({ ...c })),
            items: DEFAULT_ITEMS.map(i => ({ ...i }))
        };
    },

    load() {
        try {
            const raw = localStorage.getItem(this.KEY);
            if (!raw) return this.getDefaultData();
            const data = JSON.parse(raw);
            if (!this.validate(data)) {
                console.warn('Invalid stored data, resetting to defaults.');
                return this.getDefaultData();
            }
            return data;
        } catch (e) {
            console.error('Storage load failed:', e);
            return this.getDefaultData();
        }
    },

    save(data) {
        try {
            const clean = {
                version: this.VERSION,
                restaurant: { ...data.restaurant },
                categories: (data.categories || []).map(c => ({ ...c })),
                items: (data.items || []).map(i => ({ ...i }))
            };
            localStorage.setItem(this.KEY, JSON.stringify(clean));
            return true;
        } catch (e) {
            console.error('Storage save failed:', e);
            return false;
        }
    },

    validate(data) {
        if (!data || typeof data !== 'object') return false;
        if (typeof data.version !== 'number') return false;
        if (!data.restaurant || typeof data.restaurant !== 'object') return false;
        if (!Array.isArray(data.categories)) return false;
        if (!Array.isArray(data.items)) return false;
        for (const c of data.categories) {
            if (typeof c.id !== 'string' || typeof c.name !== 'string') return false;
        }
        for (const i of data.items) {
            if (typeof i.id !== 'string' || typeof i.name !== 'string') return false;
        }
        return true;
    },

    reset() {
        try {
            localStorage.removeItem(this.KEY);
            return this.getDefaultData();
        } catch (e) {
            console.error('Storage reset failed:', e);
            return this.getDefaultData();
        }
    },

    exportJSON(data) {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'first-coffee-menu-' + new Date().toISOString().slice(0, 10) + '.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    async importJSON(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    if (!this.validate(data)) {
                        reject(new Error('Invalid menu data format'));
                        return;
                    }
                    resolve(data);
                } catch (err) {
                    reject(new Error('Failed to parse JSON file'));
                }
            };
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    },

    isStorageAvailable() {
        try {
            localStorage.setItem('test', 'test');
            localStorage.removeItem('test');
            return true;
        } catch {
            return false;
        }
    }
};
