/* ============================================
   MICRO-INTERACTIONS
   First Coffee Restaurant — Luxury Menu
   Using Motion One (Framer Motion vanilla equivalent)
   ============================================ */

const MicroInteractions = {
    init() {
        if (typeof motion === 'undefined') return;

        this.animateFeaturedCards();
        this.animateCategoryNav();
        this.animateFilterReveal();
        this.setupHoverEffects();
        this.setupLazyImageReveal();
    },

    animateFeaturedCards() {
        const cards = document.querySelectorAll('.featured-card');
        if (!cards.length) return;

        motion.stagger(cards, {
            animate: { opacity: [0, 1], y: [12, 0] },
            duration: 0.45,
            easing: [0.22, 1, 0.36, 1],
            delay: 0.1
        });
    },

    animateCategoryNav() {
        const nav = document.querySelector('.category-nav');
        if (!nav) return;

        const buttons = nav.querySelectorAll('.cat-btn');
        if (buttons.length && typeof motion !== 'undefined') {
            motion.stagger(buttons, {
                animate: { opacity: [0, 1], y: [-6, 0] },
                duration: 0.35,
                easing: [0.22, 1, 0.36, 1]
            });
        }
    },

    animateFilterReveal() {
        const filterBar = document.getElementById('filter-bar');
        if (!filterBar || filterBar.hidden) return;

        motion.animate(filterBar, {
            opacity: [0, 1],
            y: [10, 0]
        }, {
            duration: 0.3,
            easing: [0.22, 1, 0.36, 1]
        });
    },

    setupHoverEffects() {
        if (typeof motion === 'undefined') return;

        document.querySelectorAll('.featured-card, .menu-item-card').forEach(card => {
            card.addEventListener('mouseenter', () => {
                motion.animate(card, { scale: 1.02 }, { duration: 0.3, easing: [0.22, 1, 0.36, 1] });
            });
            card.addEventListener('mouseleave', () => {
                motion.animate(card, { scale: 1 }, { duration: 0.3, easing: [0.22, 1, 0.36, 1] });
            });
        });

        document.querySelectorAll('.filter-chip').forEach(chip => {
            chip.addEventListener('mouseenter', () => {
                motion.animate(chip, { scale: 1.04 }, { duration: 0.2, easing: [0.22, 1, 0.36, 1] });
            });
            chip.addEventListener('mouseleave', () => {
                if (!chip.classList.contains('active')) {
                    motion.animate(chip, { scale: 1 }, { duration: 0.2, easing: [0.22, 1, 0.36, 1] });
                }
            });
        });
    },

    setupLazyImageReveal() {
        const lazyImages = document.querySelectorAll('img.lazyload[data-src]');
        if (!lazyImages.length) return;

        if ('IntersectionObserver' in window) {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        const src = img.getAttribute('data-src');
                        if (src) {
                            img.src = src;
                            img.classList.add('lazy-loaded');
                            if (typeof motion !== 'undefined') {
                                motion.animate(img, { opacity: [0, 1] }, { duration: 0.4, easing: [0.22, 1, 0.36, 1] });
                            } else {
                                img.style.opacity = '1';
                            }
                        }
                        observer.unobserve(img);
                    }
                });
            }, { rootMargin: '50px 0px', threshold: 0.01 });

            lazyImages.forEach(img => observer.observe(img));
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => MicroInteractions.init(), 150);
});
