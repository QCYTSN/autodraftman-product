import os
from contextlib import contextmanager
from pathlib import Path


@contextmanager
def exclusive(path: Path):
    """Also prevents an orphaned worker and a restarted server spending concurrently."""
    with path.open("a+b") as handle:
        if os.name == "nt":
            import msvcrt

            if handle.tell() == 0:
                handle.write(b"0")
                handle.flush()
            handle.seek(0)
            msvcrt.locking(handle.fileno(), msvcrt.LK_NBLCK, 1)
        else:
            import fcntl

            fcntl.flock(handle, fcntl.LOCK_EX | fcntl.LOCK_NB)
        yield
