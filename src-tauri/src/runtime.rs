use std::sync::{mpsc::Sender, Arc, Mutex};

use rand::Rng;

use crate::engine::behavior::BehaviorEngine;
use crate::llm::client::LlmClient;
use crate::llm::memory::SessionMemory;
use crate::llm::models::ChatMessage;

#[derive(Debug)]
pub struct RuntimeState {
    pub engine: BehaviorEngine,
    pub running: bool,
    pub stop_tx: Option<Sender<()>>,
    pub seed: u64,
    pub loop_generation: u64,
    pub chat_history: Vec<ChatMessage>,
    pub session_memory: SessionMemory,
    pub avatar_id: String,
}

impl RuntimeState {
    pub fn with_seed(seed: u64) -> Self {
        Self {
            engine: BehaviorEngine::new(seed),
            running: false,
            stop_tx: None,
            seed,
            loop_generation: 0,
            chat_history: Vec::new(),
            session_memory: SessionMemory::default(),
            avatar_id: "rabbit_v1".to_string(),
        }
    }
}

#[derive(Clone)]
pub struct SharedRuntime(pub Arc<Mutex<RuntimeState>>);

pub struct SharedLlmClient(pub Arc<tokio::sync::Mutex<LlmClient>>);

impl Default for SharedRuntime {
    fn default() -> Self {
        let mut rng = rand::thread_rng();
        let seed = rng.gen::<u64>();
        Self(Arc::new(Mutex::new(RuntimeState::with_seed(seed))))
    }
}

impl Default for SharedLlmClient {
    fn default() -> Self {
        Self(Arc::new(tokio::sync::Mutex::new(LlmClient::new())))
    }
}
