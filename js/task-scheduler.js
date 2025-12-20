// Task Scheduler - Utility for breaking up long tasks
// Uses scheduler.yield() API with setTimeout fallback

async function yieldToMain() {
    if (globalThis.scheduler?.yield) {
        return scheduler.yield();
    }
    // Fallback for browsers without scheduler.yield()
    return new Promise(resolve => {
        setTimeout(resolve, 0);
    });
}

// Process array of items with yielding every N items
async function processArrayWithYield(items, callback, yieldInterval = 10) {
    for (let i = 0; i < items.length; i++) {
        await callback(items[i], i);
        
        // Yield every N items
        if ((i + 1) % yieldInterval === 0) {
            await yieldToMain();
        }
    }
}

// Execute multiple functions sequentially, yielding between each
async function executeSequentially(tasks) {
    for (const task of tasks) {
        task();
        await yieldToMain();
    }
}
