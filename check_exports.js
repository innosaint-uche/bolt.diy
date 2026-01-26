
async function check() {
    try {
        const uiUtils = await import('@ai-sdk/ui-utils');
        console.log('Exports of @ai-sdk/ui-utils:', Object.keys(uiUtils));
    } catch (e) {
        console.error('Error loading @ai-sdk/ui-utils:', e.message);
    }

    try {
        const ai = await import('ai');
        console.log('Exports of ai:', Object.keys(ai));
    } catch (e) {
        console.error('Error loading ai:', e.message);
    }
}

check();
