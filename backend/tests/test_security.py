from autodraftman_backend.core.security import (
    hash_opaque_token,
    new_opaque_token,
    new_pkce_verifier,
    pkce_challenge,
)


def test_opaque_tokens_are_random_and_only_hashes_need_persisting() -> None:
    first = new_opaque_token()
    second = new_opaque_token()

    assert first != second
    assert len(first) >= 48
    assert len(hash_opaque_token(first)) == 64
    assert hash_opaque_token(first) == hash_opaque_token(first)


def test_pkce_challenge_is_stable_and_url_safe() -> None:
    verifier = new_pkce_verifier()
    challenge = pkce_challenge(verifier)

    assert len(verifier) >= 43
    assert len(challenge) == 43
    assert "=" not in challenge
    assert challenge == pkce_challenge(verifier)
