const QR = {
    currentDataUrl: null,

    generate() {
        const urlInput = document.getElementById('qr-url');
        const sizeInput = document.getElementById('qr-size');
        const marginInput = document.getElementById('qr-margin');
        const fgInput = document.getElementById('qr-fg');
        const bgInput = document.getElementById('qr-bg');
        const previewWrap = document.getElementById('qr-preview-wrap');
        const previewImg = document.getElementById('qr-preview-img');
        const fallbackUrl = document.getElementById('qr-fallback-url');
        const actions = document.getElementById('qr-actions');

        const url = urlInput?.value?.trim() || window.location.href.split('?')[0];
        if (!Utils.isValidUrl(url)) {
            App.showToast('Please enter a valid URL', 'error');
            return;
        }

        const size = Math.max(100, Math.min(1200, parseInt(sizeInput?.value) || 400));
        const margin = Math.max(0, Math.min(10, parseInt(marginInput?.value) || 2));
        const fg = fgInput?.value || '#4A2C2A';
        const bg = bgInput?.value || '#FFFFFF';

        if (typeof QRCode === 'undefined') {
            App.showToast('QR library not loaded. Check your connection.', 'error');
            return;
        }

        QRCode.toDataURL(url, {
            width: size,
            margin: margin,
            color: { dark: fg, light: bg },
            errorCorrectionLevel: 'M'
        }, (err, dataUrl) => {
            if (err) {
                console.error(err);
                App.showToast('QR generation failed', 'error');
                return;
            }
            this.currentDataUrl = dataUrl;
            if (previewImg) previewImg.src = dataUrl;
            if (previewWrap) previewWrap.hidden = false;
            if (fallbackUrl) fallbackUrl.textContent = url;
            if (actions) actions.hidden = false;
        });
    },

    download() {
        if (!this.currentDataUrl) { App.showToast('Generate a QR code first', 'error'); return; }
        const a = document.createElement('a');
        a.href = this.currentDataUrl;
        a.download = 'first-coffee-qr.png';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        App.showToast('QR downloaded');
    },

    copyUrl() {
        const urlInput = document.getElementById('qr-url');
        const url = urlInput?.value?.trim() || window.location.href.split('?')[0];
        if (!url) return;
        navigator.clipboard.writeText(url).then(() => App.showToast('URL copied')).catch(() => App.showToast('Copy failed', 'error'));
    },

    printPoster() {
        const previewImg = document.getElementById('qr-preview-img');
        if (!previewImg || !previewImg.src) { App.showToast('Generate a QR code first', 'error'); return; }
        const win = window.open('', '_blank');
        if (!win) { App.showToast('Popup blocked. Allow popups to print.', 'error'); return; }
        win.document.write('<!DOCTYPE html><html><head><title>QR Poster - First Coffee</title><style>body{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;margin:0;font-family:sans-serif;text-align:center;padding:2rem;}img{max-width:80vmin;}h1{font-size:1.5rem;margin-bottom:0.5rem;}p{color:#666;}</style></head><body><h1>First Coffee Restaurant</h1><p>Scan to view our menu</p><img src="' + previewImg.src + '"><p>' + (document.getElementById('qr-fallback-url')?.textContent || '') + '</p></body></html>');
        win.document.close();
        win.focus();
        setTimeout(() => win.print(), 400);
    }
};
