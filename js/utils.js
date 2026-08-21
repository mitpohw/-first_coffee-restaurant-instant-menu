const Utils = {
    escapeHtml(str) {
        if (typeof str !== 'string') return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },

    sanitize(str) {
        return this.escapeHtml(str).trim();
    },

    isValidUrl(str) {
        if (typeof str !== 'string') return false;
        try {
            const url = new URL(str);
            return url.protocol === 'http:' || url.protocol === 'https:';
        } catch {
            return false;
        }
    },

    debounce(fn, delay) {
        let timer;
        return function (...args) {
            clearTimeout(timer);
            timer = setTimeout(() => fn.apply(this, args), delay);
        };
    },

    formatPrice(amount, currency) {
        const n = typeof amount === 'number' ? amount : parseFloat(amount);
        if (Number.isNaN(n)) return '0';
        const sym = (currency || 'ETB').trim() || 'ETB';
        return sym + ' ' + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    },

    slugify(str) {
        return str
            .toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/--+/g, '-')
            .trim();
    },

    clamp(val, min, max) {
        return Math.max(min, Math.min(max, val));
    }
};
