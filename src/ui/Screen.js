import { eventBus } from '../core/EventBus.js';

/**
 * Base class for all screens.
 * Manages subscriptions and provides mount/unmount lifecycle.
 */
export class Screen {
    constructor() {
        this._subscriptions = [];
        this._el = null;
    }

    /**
     * Subscribe to an event. Auto-cleaned on unmount.
     */
    subscribe(event, callback) {
        const unsub = eventBus.on(event, callback);
        this._subscriptions.push(unsub);
    }

    /**
     * Mount this screen into the given container element.
     */
    mount(container) {
        this._el = container;
        this.render();
    }

    /**
     * Unmount this screen. Cleans up all subscriptions.
     */
    unmount() {
        for (const unsub of this._subscriptions) {
            unsub();
        }
        this._subscriptions = [];
        this._el = null;
    }

    /**
     * Render the screen content. Override in subclasses.
     */
    render() {
        // Override
    }

    /**
     * Helper: create an HTML element from a template string.
     */
    html(template) {
        const div = document.createElement('div');
        div.innerHTML = template.trim();
        return div.firstChild;
    }

    /**
     * Helper: set innerHTML safely.
     */
    setContent(htmlString) {
        if (this._el) {
            this._el.innerHTML = htmlString;
        }
    }
}
