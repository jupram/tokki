use ring::aead::{Aad, LessSafeKey, Nonce, UnboundKey, AES_256_GCM};
use ring::rand::{SecureRandom, SystemRandom};

const NONCE_LEN: usize = 12;

/// A 256-bit AES-GCM encryption key.
#[derive(Clone)]
pub struct EncryptionKey {
    raw: [u8; 32],
}

impl EncryptionKey {
    /// Generate a new random 256-bit key.
    pub fn generate() -> Result<Self, String> {
        let rng = SystemRandom::new();
        let mut raw = [0u8; 32];
        rng.fill(&mut raw).map_err(|e| format!("RNG failed: {e}"))?;
        Ok(Self { raw })
    }

    /// Create from raw bytes.
    pub fn from_bytes(bytes: &[u8]) -> Result<Self, String> {
        if bytes.len() != 32 {
            return Err(format!("key must be 32 bytes, got {}", bytes.len()));
        }
        let mut raw = [0u8; 32];
        raw.copy_from_slice(bytes);
        Ok(Self { raw })
    }

    /// Export raw bytes (for storing in credential manager).
    pub fn as_bytes(&self) -> &[u8; 32] {
        &self.raw
    }

    fn to_less_safe_key(&self) -> Result<LessSafeKey, String> {
        let unbound =
            UnboundKey::new(&AES_256_GCM, &self.raw).map_err(|e| format!("bad key: {e}"))?;
        Ok(LessSafeKey::new(unbound))
    }
}

/// Encrypt plaintext with AES-256-GCM.
/// Returns `nonce || ciphertext || tag` (12 + len + 16 bytes).
pub fn encrypt(key: &EncryptionKey, plaintext: &[u8]) -> Result<Vec<u8>, String> {
    let rng = SystemRandom::new();
    let mut nonce_bytes = [0u8; NONCE_LEN];
    rng.fill(&mut nonce_bytes)
        .map_err(|e| format!("RNG failed: {e}"))?;

    let less_safe = key.to_less_safe_key()?;
    let nonce = Nonce::assume_unique_for_key(nonce_bytes);

    let mut in_out = plaintext.to_vec();
    less_safe
        .seal_in_place_append_tag(nonce, Aad::empty(), &mut in_out)
        .map_err(|e| format!("encrypt failed: {e}"))?;

    let mut result = Vec::with_capacity(NONCE_LEN + in_out.len());
    result.extend_from_slice(&nonce_bytes);
    result.extend_from_slice(&in_out);
    Ok(result)
}

/// Decrypt data produced by `encrypt`.
/// Input is `nonce || ciphertext || tag`.
pub fn decrypt(key: &EncryptionKey, data: &[u8]) -> Result<Vec<u8>, String> {
    if data.len() < NONCE_LEN + 16 {
        return Err("ciphertext too short".to_string());
    }

    let (nonce_bytes, ciphertext_and_tag) = data.split_at(NONCE_LEN);
    let nonce = Nonce::assume_unique_for_key(
        nonce_bytes
            .try_into()
            .map_err(|_| "bad nonce length".to_string())?,
    );

    let less_safe = key.to_less_safe_key()?;

    let mut in_out = ciphertext_and_tag.to_vec();
    let plaintext = less_safe
        .open_in_place(nonce, Aad::empty(), &mut in_out)
        .map_err(|_| "decrypt failed: bad key or corrupted data".to_string())?;

    Ok(plaintext.to_vec())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn round_trip_encrypt_decrypt() {
        let key = EncryptionKey::generate().expect("keygen");
        let plaintext = b"Hello, Tokki!";
        let cipher = encrypt(&key, plaintext).expect("encrypt");
        let decrypted = decrypt(&key, &cipher).expect("decrypt");
        assert_eq!(decrypted, plaintext);
    }

    #[test]
    fn wrong_key_fails() {
        let key1 = EncryptionKey::generate().expect("keygen");
        let key2 = EncryptionKey::generate().expect("keygen");
        let cipher = encrypt(&key1, b"secret").expect("encrypt");
        assert!(decrypt(&key2, &cipher).is_err());
    }

    #[test]
    fn short_ciphertext_rejected() {
        let key = EncryptionKey::generate().expect("keygen");
        assert!(decrypt(&key, &[0u8; 10]).is_err());
    }

    #[test]
    fn key_from_bytes_rejects_wrong_length() {
        assert!(EncryptionKey::from_bytes(&[0u8; 16]).is_err());
        assert!(EncryptionKey::from_bytes(&[0u8; 32]).is_ok());
    }
}
