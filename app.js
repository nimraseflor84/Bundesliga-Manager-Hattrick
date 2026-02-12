import { router } from './src/core/Router.js';
import { audioManager } from './src/core/AudioManager.js';
import { TitleScreen } from './src/ui/TitleScreen.js';
import { NewGameScreen } from './src/ui/NewGameScreen.js';
import { DashboardScreen } from './src/ui/DashboardScreen.js';
import { MatchDayScreen } from './src/ui/MatchDayScreen.js';
import { LeagueTableScreen } from './src/ui/LeagueTableScreen.js';
import { FixturesScreen } from './src/ui/FixturesScreen.js';
import { SquadScreen } from './src/ui/SquadScreen.js';
import { TacticsScreen } from './src/ui/TacticsScreen.js';
import { FinancesScreen } from './src/ui/FinancesScreen.js';
import { StadiumScreen } from './src/ui/StadiumScreen.js';
import { TransferScreen } from './src/ui/TransferScreen.js';
import { TrainingScreen } from './src/ui/TrainingScreen.js';

// Register all screens
router.register('#title', new TitleScreen());
router.register('#new-game', new NewGameScreen());
router.register('#dashboard', new DashboardScreen());
router.register('#matchday', new MatchDayScreen());
router.register('#table', new LeagueTableScreen());
router.register('#fixtures', new FixturesScreen());
router.register('#squad', new SquadScreen());
router.register('#tactics', new TacticsScreen());
router.register('#finances', new FinancesScreen());
router.register('#stadium', new StadiumScreen());
router.register('#transfers', new TransferScreen());
router.register('#training', new TrainingScreen());

// Initialize
const appEl = document.getElementById('app');
router.init(appEl);
router.start();

// Global button click sound
document.addEventListener('click', (e) => {
    if (e.target.closest('.dos-btn') || e.target.closest('.nav-btn')) {
        audioManager.playButtonClick();
    }
});

// Audio toggle button
const audioToggle = document.getElementById('audio-toggle');
if (audioToggle) {
    audioToggle.textContent = audioManager.isMuted() ? '\uD83D\uDD07' : '\uD83D\uDD0A';
    audioToggle.addEventListener('click', () => {
        const muted = audioManager.toggleMute();
        audioToggle.textContent = muted ? '\uD83D\uDD07' : '\uD83D\uDD0A';
    });
}
