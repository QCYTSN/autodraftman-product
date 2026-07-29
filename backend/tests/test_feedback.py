import pytest
from pydantic import ValidationError

from autodraftman_backend.modules.feedback.schemas import FeedbackCreate


def test_feedback_normalizes_message_and_email() -> None:
    feedback = FeedbackCreate(
        category="bug",
        message="  The reference preview does not refresh.  ",
        contact_email=" Researcher@Example.org ",
        locale="en",
    )

    assert feedback.message == "The reference preview does not refresh."
    assert feedback.contact_email == "researcher@example.org"


def test_feedback_rejects_short_message_and_invalid_email() -> None:
    with pytest.raises(ValidationError):
        FeedbackCreate(category="product", message="Too short")

    with pytest.raises(ValidationError):
        FeedbackCreate(
            category="account",
            message="Please help me inspect this account issue.",
            contact_email="not-an-email",
        )
