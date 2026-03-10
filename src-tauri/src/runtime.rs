use std::sync::{mpsc::Sender, Arc, Mutex};

use rand::Rng;

use crate::discovery::DiscoveryState;
use crate::engine::behavior::BehaviorEngine;
use crate::engine::models::PersonalityConfig;
use crate::llm::memory::SessionMemory;
use crate::llm::models::ChatMessage;
use crate::llm::provider::LlmProvider;
use crate::persistence::PersistentMemory;
use crate::presence::PresenceState;

pub const DEFAULT_AVATAR_ID: &str = "rabbit_v2";

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
    pub personality: PersonalityConfig,
    pub presence: PresenceState,
    pub discovery: DiscoveryState,
}

impl RuntimeState {
    pub fn with_seed(seed: u64) -> Self {
        Self::with_seed_and_session_memory(seed, SessionMemory::default())
    }

    pub fn with_seed_and_session_memory(seed: u64, session_memory: SessionMemory) -> Self {
        Self {
            engine: BehaviorEngine::new(seed),
            running: false,
            stop_tx: None,
            seed,
            loop_generation: 0,
            chat_history: Vec::new(),
            session_memory,
            avatar_id: DEFAULT_AVATAR_ID.to_string(),
            personality: PersonalityConfig::default_for_species(DEFAULT_AVATAR_ID),
            presence: PresenceState::default(),
            discovery: DiscoveryState::default(),
        }
    }
}

#[derive(Clone)]
pub struct SharedRuntime(pub Arc<Mutex<RuntimeState>>);

pub struct SharedLlmClient(pub Arc<tokio::sync::Mutex<Box<dyn LlmProvider>>>);

pub enum PersistenceState {
    Available(PersistentMemory),
    Unavailable(String),
}

pub struct SharedPersistence(pub Arc<Mutex<PersistenceState>>);

impl SharedRuntime {
    fn with_seed_and_session_memory(seed: u64, session_memory: SessionMemory) -> Self {
        Self(Arc::new(Mutex::new(
            RuntimeState::with_seed_and_session_memory(seed, session_memory),
        )))
    }

    pub fn from_persistence(persistence: &SharedPersistence) -> Result<Self, String> {
        let mut rng = rand::thread_rng();
        let seed = rng.gen::<u64>();
        let session_memory = persistence.load_session_memory()?;
        let chat_history = persistence.load_chat_history().unwrap_or_else(|error| {
            eprintln!("[tokki] failed to restore chat history: {error}");
            Vec::new()
        });
        let runtime = Self::with_seed_and_session_memory(seed, session_memory);
        {
            let mut guard = runtime.0.lock().map_err(|e| format!("lock failed: {e}"))?;
            guard.chat_history = chat_history;
        }
        Ok(runtime)
    }

    pub fn restore_or_default(persistence: &SharedPersistence) -> (Self, Option<String>) {
        match Self::from_persistence(persistence) {
            Ok(runtime) => (runtime, None),
            Err(error) => (Self::default(), Some(error)),
        }
    }
}

pub fn request_shutdown(runtime: &SharedRuntime) -> Result<bool, String> {
    let (was_running, stop_tx) = {
        let mut guard = runtime
            .0
            .lock()
            .map_err(|error| format!("failed to lock runtime: {error}"))?;
        let was_running = guard.running || guard.stop_tx.is_some();
        guard.running = false;
        (was_running, guard.stop_tx.take())
    };

    if let Some(sender) = stop_tx {
        if sender.send(()).is_err() {
            eprintln!("[tokki] behavior loop stop receiver already dropped during shutdown");
        }
    }

    Ok(was_running)
}

impl SharedPersistence {
    pub fn load_session_memory(&self) -> Result<SessionMemory, String> {
        let guard = self
            .0
            .lock()
            .map_err(|error| format!("failed to lock persistence: {error}"))?;

        match &*guard {
            PersistenceState::Available(memory) => memory.load(),
            PersistenceState::Unavailable(error) => {
                Err(format!("persistent memory unavailable: {error}"))
            }
        }
    }

    pub fn save_session_memory(&self, memory: &SessionMemory) -> Result<(), String> {
        let guard = self
            .0
            .lock()
            .map_err(|error| format!("failed to lock persistence: {error}"))?;

        match &*guard {
            PersistenceState::Available(store) => store.save(memory),
            PersistenceState::Unavailable(error) => {
                Err(format!("persistent memory unavailable: {error}"))
            }
        }
    }

    pub fn load_chat_history(&self) -> Result<Vec<crate::llm::models::ChatMessage>, String> {
        let guard = self
            .0
            .lock()
            .map_err(|error| format!("failed to lock persistence: {error}"))?;

        match &*guard {
            PersistenceState::Available(store) => store.load_chat_history(),
            PersistenceState::Unavailable(error) => {
                Err(format!("persistent memory unavailable: {error}"))
            }
        }
    }

    pub fn save_chat_history(
        &self,
        history: &[crate::llm::models::ChatMessage],
    ) -> Result<(), String> {
        let guard = self
            .0
            .lock()
            .map_err(|error| format!("failed to lock persistence: {error}"))?;

        match &*guard {
            PersistenceState::Available(store) => store.save_chat_history(history),
            PersistenceState::Unavailable(error) => {
                Err(format!("persistent memory unavailable: {error}"))
            }
        }
    }

    #[cfg(test)]
    pub(crate) fn from_persistent_memory(memory: PersistentMemory) -> Self {
        Self(Arc::new(Mutex::new(PersistenceState::Available(memory))))
    }
}

impl Default for SharedRuntime {
    fn default() -> Self {
        let mut rng = rand::thread_rng();
        let seed = rng.gen::<u64>();
        Self::with_seed_and_session_memory(seed, SessionMemory::default())
    }
}

impl Default for SharedLlmClient {
    fn default() -> Self {
        let config = crate::llm::config::ProviderConfig::load();
        eprintln!(
            "[tokki] LLM provider={:?} endpoint={} model={} api_key_present={}",
            config.provider,
            config.effective_endpoint(),
            config.effective_model(),
            !config.effective_api_key().is_empty(),
        );
        let provider = match crate::llm::provider::create_provider(&config) {
            Ok(p) => p,
            Err(error) => {
                eprintln!(
                    "[tokki] failed to create LLM provider: {error}; falling back to offline mode"
                );
                Box::new(crate::llm::offline::OfflineProvider::new()) as Box<dyn LlmProvider>
            }
        };
        Self(Arc::new(tokio::sync::Mutex::new(provider)))
    }
}

impl Default for SharedPersistence {
    fn default() -> Self {
        match PersistentMemory::open() {
            Ok(memory) => Self(Arc::new(Mutex::new(PersistenceState::Available(memory)))),
            Err(error) => Self(Arc::new(Mutex::new(PersistenceState::Unavailable(error)))),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::mpsc::channel;

    #[test]
    fn shared_runtime_restores_chat_history_from_persistence() {
        use crate::llm::models::ChatMessage;

        let persistent_memory = PersistentMemory::in_memory();
        let messages = vec![
            ChatMessage {
                role: "user".to_string(),
                content: "Remember me?".to_string(),
                timestamp: 100,
            },
            ChatMessage {
                role: "assistant".to_string(),
                content: "Of course! 🐰".to_string(),
                timestamp: 101,
            },
        ];
        persistent_memory
            .save_chat_history(&messages)
            .expect("chat history should save");

        let persistence = SharedPersistence::from_persistent_memory(persistent_memory);
        let runtime =
            SharedRuntime::from_persistence(&persistence).expect("runtime should restore");

        let guard = runtime.0.lock().expect("runtime lock");
        assert_eq!(guard.chat_history.len(), 2);
        assert_eq!(guard.chat_history[0].role, "user");
        assert_eq!(guard.chat_history[0].content, "Remember me?");
        assert_eq!(guard.chat_history[1].role, "assistant");
    }

    #[test]
    fn shared_runtime_restores_empty_chat_history_when_none_persisted() {
        let persistent_memory = PersistentMemory::in_memory();
        let persistence = SharedPersistence::from_persistent_memory(persistent_memory);
        let runtime =
            SharedRuntime::from_persistence(&persistence).expect("runtime should restore");

        let guard = runtime.0.lock().expect("runtime lock");
        assert!(guard.chat_history.is_empty());
    }

    #[test]
    fn shared_runtime_restores_session_memory_from_persistence() {
        let persistent_memory = PersistentMemory::in_memory();
        let mut session_memory = SessionMemory::default();
        session_memory.update("My name is Alice", "greet", "playful");
        session_memory.update("tell me about cats", "help", "curious");
        session_memory.update("I love sleepy playlists", "help", "sleepy");
        session_memory.update("I'm learning Tauri", "think", "playful");
        persistent_memory
            .save(&session_memory)
            .expect("session memory should save");

        let persistence = SharedPersistence::from_persistent_memory(persistent_memory);
        let runtime =
            SharedRuntime::from_persistence(&persistence).expect("runtime should restore memory");

        let guard = runtime.0.lock().expect("runtime lock");
        assert_eq!(guard.session_memory.user_name, Some("Alice".to_string()));
        assert_eq!(guard.session_memory.topics, vec!["cats"]);
        assert_eq!(
            guard.session_memory.preferences[0].summary(),
            "loves sleepy playlists"
        );
        assert_eq!(
            guard.session_memory.conversation_highlights[0].summary,
            "Learning Tauri"
        );
        assert_eq!(guard.session_memory.message_count, 4);
    }

    #[test]
    fn shared_runtime_restore_or_default_reports_unavailable_persistence() {
        let persistence = SharedPersistence(Arc::new(Mutex::new(PersistenceState::Unavailable(
            "credential manager offline".to_string(),
        ))));

        let (runtime, restore_error) = SharedRuntime::restore_or_default(&persistence);

        assert_eq!(
            restore_error.as_deref(),
            Some("persistent memory unavailable: credential manager offline")
        );

        let guard = runtime.0.lock().expect("runtime lock");
        assert_eq!(guard.avatar_id, DEFAULT_AVATAR_ID);
        assert_eq!(
            guard.personality,
            PersonalityConfig::default_for_species(DEFAULT_AVATAR_ID)
        );
        assert_eq!(guard.session_memory.message_count, 0);
    }

    #[test]
    fn request_shutdown_stops_running_runtime_and_notifies_loop() {
        let runtime = SharedRuntime::default();
        let (tx, rx) = channel();
        {
            let mut guard = runtime.0.lock().expect("runtime lock");
            guard.running = true;
            guard.stop_tx = Some(tx);
        }

        let stopped = request_shutdown(&runtime).expect("shutdown should succeed");

        assert!(stopped);
        rx.try_recv().expect("stop signal should be sent");

        let guard = runtime.0.lock().expect("runtime lock");
        assert!(!guard.running);
        assert!(guard.stop_tx.is_none());
    }

    #[test]
    fn request_shutdown_is_noop_when_runtime_is_already_idle() {
        let runtime = SharedRuntime::default();

        let stopped = request_shutdown(&runtime).expect("shutdown should succeed");

        assert!(!stopped);
        let guard = runtime.0.lock().expect("runtime lock");
        assert!(!guard.running);
        assert!(guard.stop_tx.is_none());
    }
}
