import { Screen } from './Screen.js';
import { router } from '../core/Router.js';
import { saveManager } from '../core/SaveManager.js';
import { gameState } from '../core/GameState.js';
import { audioManager } from '../core/AudioManager.js';

export class TitleScreen extends Screen {
    mount(container) {
        super.mount(container);
        // Start title music on first user interaction (autoplay policy)
        this._musicStarted = false;
        this._startMusicHandler = () => {
            if (!this._musicStarted) {
                this._musicStarted = true;
                audioManager.startTitleMusic();
            }
        };
        document.addEventListener('click', this._startMusicHandler, { once: true });
    }

    unmount() {
        audioManager.stopMusic();
        if (this._startMusicHandler) {
            document.removeEventListener('click', this._startMusicHandler);
            this._startMusicHandler = null;
        }
        super.unmount();
    }

    render() {
        const hasSave = saveManager.hasSave('auto');

        this.setContent(`
            <div class="title-screen fade-in">
                <div class="title-ascii">
 ____  _   _ _   _ ____  _____ ____  _     ___ ____    _
| __ )| | | | \\ | |  _ \\| ____/ ___|| |   |_ _/ ___|  / \\
|  _ \\| | | |  \\| | | | |  _| \\___ \\| |    | | |  _  / _ \\
| |_) | |_| | |\\  | |_| | |___ ___) | |___ | | |_| |/ ___ \\
|____/ \\___/|_| \\_|____/|_____|____/|_____|___\\____/_/   \\_\\

 __  __    _    _   _    _    ____ _____ ____
|  \\/  |  / \\  | \\ | |  / \\  / ___| ____|  _ \\
| |\\/| | / _ \\ |  \\| | / _ \\| |  _|  _| | |_) |
| |  | |/ ___ \\| |\\  |/ ___ \\ |_| | |___|  _ <
|_|  |_/_/   \\_\\_| \\_/_/   \\_\\____|_____|_| \\_\\
                </div>
                <div class="title-subtitle">
                    ★ HATTRICK ★
                </div>
                <div class="title-subtitle" style="font-size: 0.45rem; color: var(--text-primary);">
                    SAISON 2025/26
                </div>
                <div class="flex-center mt-3" style="flex-direction: column; gap: 12px;">
                    <button class="dos-btn dos-btn-primary" id="btn-new-game"
                            style="font-size: 1.2rem; padding: 8px 32px;">
                        NEUES SPIEL
                    </button>
                    ${hasSave ? `
                    <button class="dos-btn" id="btn-continue"
                            style="font-size: 1.2rem; padding: 8px 32px;">
                        WEITERSPIELEN
                    </button>
                    ` : ''}
                </div>
                <div class="mt-3 blink" style="color: var(--text-cyan); font-family: var(--font-heading); font-size: 0.45rem;">
                    DRUECKE EINE TASTE...
                </div>
                <div class="mt-3" style="color: var(--text-muted); font-size: 0.85rem;">
                    Ein Browserspiel erstellt von Armin R. (Tribute to BMH 1994)
                </div>
            </div>
        `);

        this._el.querySelector('#btn-new-game').addEventListener('click', () => {
            router.navigate('#new-game');
        });

        if (hasSave) {
            this._el.querySelector('#btn-continue').addEventListener('click', () => {
                const data = saveManager.load('auto');
                if (data && data.version >= 2 && data.players) {
                    gameState.init(data);
                    router.navigate('#dashboard');
                } else {
                    // Incompatible save, delete and start fresh
                    saveManager.deleteSave('auto');
                    router.navigate('#new-game');
                }
            });
        }
    }
}
