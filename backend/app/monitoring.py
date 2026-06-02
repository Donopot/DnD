"""
Monitoring Sentry — initialisation conditionnelle.

Active uniquement si SENTRY_DSN est defini dans l'environnement.
A ajouter dans main.py : init_sentry() au debut de startup().
"""

import os

import sentry_sdk


def init_sentry() -> None:
    """Initialise Sentry si le DSN est configure."""
    dsn = os.getenv("SENTRY_DSN")
    if not dsn:
        return

    environment = os.getenv("BACKEND_ENV", "development")

    sentry_sdk.init(
        dsn=dsn,
        environment=environment,
        traces_sample_rate=0.1 if environment == "production" else 1.0,
        send_default_pii=False,
    )
