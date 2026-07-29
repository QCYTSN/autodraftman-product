from sqlalchemy.dialects import postgresql
from sqlalchemy.schema import CreateTable

from autodraftman_backend.core.database import Base
from autodraftman_backend.modules.assets import models as asset_models  # noqa: F401
from autodraftman_backend.modules.credits import models as credit_models  # noqa: F401
from autodraftman_backend.modules.drafts import models as draft_models  # noqa: F401
from autodraftman_backend.modules.feedback import models as feedback_models  # noqa: F401
from autodraftman_backend.modules.identity import models as identity_models  # noqa: F401


def test_all_foundation_tables_compile_for_postgresql() -> None:
    expected_tables = {
        "users",
        "auth_identities",
        "user_sessions",
        "guest_identities",
        "oauth_login_attempts",
        "assets",
        "credit_accounts",
        "credit_transactions",
        "drafts",
        "feedback",
    }

    assert expected_tables == set(Base.metadata.tables)

    for table in Base.metadata.sorted_tables:
        ddl = str(CreateTable(table).compile(dialect=postgresql.dialect()))
        assert f"CREATE TABLE {table.name}" in ddl
