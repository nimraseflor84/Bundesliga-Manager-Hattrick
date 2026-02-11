import { eventBus } from './EventBus.js';

class HashRouter {
    constructor() {
        this._screens = {};
        this._currentScreen = null;
        this._appEl = null;
    }

    init(appEl) {
        this._appEl = appEl;
        window.addEventListener('hashchange', () => this._onHashChange());
    }

    register(hash, screen) {
        this._screens[hash] = screen;
    }

    navigate(hash) {
        window.location.hash = hash;
    }

    start() {
        const hash = window.location.hash || '#title';
        window.location.hash = hash;
        this._onHashChange();
    }

    _onHashChange() {
        const hash = window.location.hash || '#title';
        const screen = this._screens[hash];

        if (!screen) {
            console.warn(`No screen registered for hash: ${hash}`);
            return;
        }

        if (this._currentScreen) {
            this._currentScreen.unmount();
        }

        this._appEl.innerHTML = '';
        this._currentScreen = screen;
        screen.mount(this._appEl);
        eventBus.emit('route:changed', hash);
    }

    getCurrentHash() {
        return window.location.hash || '#title';
    }
}

export const router = new HashRouter();
