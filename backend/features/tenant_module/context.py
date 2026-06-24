import threading

_thread_locals = threading.local()


def set_current_organization(organization):
    """Binds the active organization context to the executing request thread."""
    setattr(_thread_locals, 'organization', organization)


def get_current_organization():
    """Retrieves the active organization context for the executing request thread."""
    return getattr(_thread_locals, 'organization', None)


def clear_current_organization():
    """Tears down thread-local reference to prevent leakages across thread execution reuse."""
    if hasattr(_thread_locals, 'organization'):
        delattr(_thread_locals, 'organization')
