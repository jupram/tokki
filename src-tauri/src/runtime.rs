use std::sync::{mpsc::Sender, Arc, Mutex};

use rand::Rng;

use crate::engine::behavior::BehaviorEngine;

#[derive(Debug)]
pub struct RuntimeState {
    pub engine: BehaviorEngine,
    pub running: bool,
    pub stop_tx: Option<Sender<()>>,
    pub seed: u64,
    pub loop_generation: u64,
}

impl RuntimeState {
    pub fn with_seed(seed: u64) -> Self {
        Self {
            engine: BehaviorEngine::new(seed),
            running: false,
            stop_tx: None,
            seed,
            loop_generation: 0,
        }
    }
}

#[derive(Clone)]
pub struct SharedRuntime(pub Arc<Mutex<RuntimeState>>);

impl Default for SharedRuntime {
    fn default() -> Self {
        let mut rng = rand::thread_rng();
        let seed = rng.gen::<u64>();
        Self(Arc::new(Mutex::new(RuntimeState::with_seed(seed))))
    }
}
