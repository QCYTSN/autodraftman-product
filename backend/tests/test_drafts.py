import uuid

import pytest
from pydantic import ValidationError

from autodraftman_backend.modules.drafts.schemas import DraftCreate, DraftUpdate


def test_text_draft_discards_reference_asset() -> None:
    draft = DraftCreate(
        prompt="A method figure",
        mode="text",
        reference_asset_id=uuid.uuid4(),
    )

    assert draft.reference_asset_id is None


def test_draft_rejects_unsupported_output_options() -> None:
    with pytest.raises(ValidationError):
        DraftCreate(prompt="A method figure", aspect_ratio="3:2")  # type: ignore[arg-type]

    with pytest.raises(ValidationError):
        DraftCreate(prompt="A method figure", output_format="TIFF")  # type: ignore[arg-type]


def test_partial_draft_update_preserves_omitted_fields() -> None:
    update = DraftUpdate(prompt="Changed")

    assert update.model_dump(exclude_unset=True) == {"prompt": "Changed"}
