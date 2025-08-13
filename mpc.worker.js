// Web Worker for Model Predictive Control planning
// Runs MPC computation on a background thread to prevent UI blocking

// Import the MPC classes
importScripts('mpc.js');

// Initialize the planner
let planner = null;
let initialized = false;

// Initialize planner on first message or when needed
function initPlanner() {
    if (!initialized) {
        planner = new MPCPlanner();
        initialized = true;
        console.log('MPC Worker: Planner initialized');
    }
}

// Handle messages from main thread
self.onmessage = function(e) {
    const { id, type, state, config } = e.data;
    
    // Handle different message types
    switch(type) {
        case 'init':
            // Initialize or reconfigure planner
            initPlanner();
            if (config) {
                // Apply configuration if provided
                if (config.horizon) planner.horizon = config.horizon;
                if (config.numSequences) planner.numSequences = config.numSequences;
                if (config.generations) planner.generations = config.generations;
                if (config.weights) planner.weights = { ...planner.weights, ...config.weights };
            }
            self.postMessage({ id, type: 'ready' });
            break;
            
        case 'plan':
            // Perform planning with time budget
            initPlanner();
            
            try {
                const startTime = performance.now();
                const timeBudget = e.data.timeBudget || 4; // Default 4ms budget
                
                // Convert plain object back to GameState
                const gameState = GameState.fromPlainObject ? 
                    GameState.fromPlainObject(state) : 
                    Object.assign(new GameState(), state);
                
                // Run planning with time constraint
                const bestSequence = planner.planWithBudget(gameState, timeBudget);
                
                const elapsed = performance.now() - startTime;
                
                // Extract just the first action to send back
                let bestAction = null;
                if (bestSequence && bestSequence.actions && bestSequence.actions.length > 0) {
                    bestAction = bestSequence.actions[0];
                }
                
                // Send result back to main thread
                self.postMessage({
                    id,
                    type: 'result',
                    bestAction,
                    score: bestSequence ? bestSequence.score : -Infinity,
                    elapsed,
                    sequencesEvaluated: planner.lastSequencesEvaluated || 0
                });
                
            } catch (error) {
                // Send error back to main thread
                self.postMessage({
                    id,
                    type: 'error',
                    error: error.message
                });
                console.error('MPC Worker error:', error);
            }
            break;
            
        case 'reset':
            // Reset planner state
            if (planner) {
                planner.lastBestSequence = null;
                planner.planCache = [];
            }
            self.postMessage({ id, type: 'reset_complete' });
            break;
            
        default:
            console.warn('MPC Worker: Unknown message type:', type);
    }
};

// Extend MPCPlanner with time-budgeted planning
MPCPlanner.prototype.planWithBudget = function(gameState, timeBudgetMs) {
    const startTime = performance.now();
    const endTime = startTime + timeBudgetMs;
    
    // Track how many sequences we evaluate
    this.lastSequencesEvaluated = 0;
    
    // Generate initial population
    let population = this.generateInitialPopulation();
    let bestOverall = null;
    let bestScore = -Infinity;
    
    // Run evolution for as many generations as time allows
    for (let gen = 0; gen < this.generations; gen++) {
        // Check time budget
        if (performance.now() >= endTime) {
            break;
        }
        
        // Evaluate sequences that haven't been scored yet
        for (const seq of population) {
            // Check time budget frequently
            if (performance.now() >= endTime) {
                break;
            }
            
            if (seq.score === -Infinity) {
                seq.score = this.evaluateSequence(seq, gameState);
                this.lastSequencesEvaluated++;
                
                // Track best
                if (seq.score > bestScore) {
                    bestScore = seq.score;
                    bestOverall = seq;
                }
            }
        }
        
        // If we're out of time, return best so far
        if (performance.now() >= endTime) {
            break;
        }
        
        // Sort population
        population.sort((a, b) => b.score - a.score);
        
        // If this is the last generation or we're out of time, stop
        if (gen === this.generations - 1 || performance.now() >= endTime - 0.5) {
            break;
        }
        
        // Generate next generation
        const elite = population.slice(0, Math.min(this.numSequences / 4, population.length));
        const newPop = [...elite];
        
        while (newPop.length < this.numSequences && performance.now() < endTime) {
            const parent1 = elite[Math.floor(Math.random() * elite.length)];
            const parent2 = elite[Math.floor(Math.random() * elite.length)];
            
            if (Math.random() < 0.7) {
                const child = ActionSequence.crossover(parent1, parent2);
                newPop.push(child);
            } else {
                const mutant = parent1.mutate(0.2);
                newPop.push(mutant);
            }
        }
        
        population = newPop;
    }
    
    // Ensure we have at least one evaluated sequence
    if (!bestOverall && population.length > 0) {
        // Quickly evaluate at least one sequence
        for (const seq of population) {
            if (seq.score === -Infinity) {
                seq.score = this.evaluateSequence(seq, gameState);
                this.lastSequencesEvaluated++;
                if (!bestOverall || seq.score > bestScore) {
                    bestOverall = seq;
                    bestScore = seq.score;
                }
                break; // Just evaluate one
            }
        }
    }
    
    // Cache the best for next iteration
    if (bestOverall) {
        this.lastBestSequence = bestOverall;
    }
    
    return bestOverall || population[0] || new ActionSequence(1);
};

// Notify that worker is ready
self.postMessage({ type: 'worker_ready' });