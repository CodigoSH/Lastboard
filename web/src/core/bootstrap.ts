import { i18n } from '../services/i18n';

/**
 * Shared bootstrapper for all application entry points.
 * Ensures critical services (like i18n) are ready before the UI renders.
 * 
 * @param initCallback The main application logic to run after successful bootstrap.
 */
export async function bootstrap(initCallback: () => void | Promise<void>) {
    try {
        await i18n.ensureInitialized();
        await initCallback();
    } catch (error) {
        console.error('[Bootstrap] Critical failure:', error);

        // Render a fatal error overlay if the app cannot start
        document.body.innerHTML = `
            <div style="
                display: flex; 
                flex-direction: column; 
                align-items: center; 
                justify-content: center; 
                height: 100vh; 
                background: #111; 
                color: #fff; 
                font-family: sans-serif;
                text-align: center;
            ">
                <h1 style="color: #fa5252;">System Error</h1>
                <p>Failed to initialize application resources.</p>
                <p style="opacity: 0.7; font-size: 0.9em;">Check console for details.</p>
                <button onclick="window.location.reload()" style="
                    margin-top: 20px;
                    padding: 10px 20px;
                    background: #333;
                    color: white;
                    border: 1px solid #555;
                    cursor: pointer;
                    border-radius: 4px;
                ">Reload</button>
            </div>
        `;
    }
}
