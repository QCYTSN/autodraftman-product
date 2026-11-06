"""Versioned, salted password hashes; no plaintext credential persistence."""

import hashlib
import hmac
import secrets


def _derive(password: str, salt: bytes) -> bytes:
    # OWASP scrypt profile: N=2^15, r=8, p=3 (32 MiB per computation).
    return hashlib.scrypt(
        password.encode("utf-8"),
        salt=salt,
        n=32768,
        r=8,
        p=3,
        maxmem=64 * 1024 * 1024,
        dklen=32,
    )


def hash_password(password: str) -> str:
    if not 8 <= len(password) <= 128:
        raise ValueError("Password must contain 8 to 128 characters")
    salt = secrets.token_bytes(16)
    return f"scrypt-v1${salt.hex()}${_derive(password, salt).hex()}"


def verify_password(password: str, encoded: str) -> bool:
    try:
        version, salt, expected = encoded.split("$")
        if version != "scrypt-v1" or len(salt) != 32 or len(expected) != 64:
            return False
        return hmac.compare_digest(_derive(password, bytes.fromhex(salt)), bytes.fromhex(expected))
    except (ValueError, TypeError):
        return False


# Unknown accounts take the same expensive verification path as known accounts.
DUMMY_HASH = hash_password(secrets.token_urlsafe(32))
