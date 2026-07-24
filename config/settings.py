"""
Django settings for the MeetVerse project.
"""

import os
from pathlib import Path

import dj_database_url
from dotenv import load_dotenv


BASE_DIR = Path(__file__).resolve().parent.parent

load_dotenv(
    BASE_DIR / ".env",
    override=True,
)


def env_bool(
    name,
    default=False,
):
    """
    Read a Boolean environment variable.
    """

    value = os.getenv(name)

    if value is None:
        return default

    return value.strip().lower() in {
        "1",
        "true",
        "yes",
        "on",
    }


def env_list(
    name,
    default="",
):
    """
    Read a comma-separated environment variable.
    """

    value = os.getenv(
        name,
        default,
    )

    return [
        item.strip()
        for item in value.split(",")
        if item.strip()
    ]


SECRET_KEY = os.getenv(
    "DJANGO_SECRET_KEY",
)

if not SECRET_KEY:
    raise RuntimeError(
        "DJANGO_SECRET_KEY is missing."
    )


DEBUG = env_bool(
    "DEBUG",
    True,
)


RENDER_EXTERNAL_HOSTNAME = os.getenv(
    "RENDER_EXTERNAL_HOSTNAME",
    "",
).strip()


ALLOWED_HOSTS = env_list(
    "ALLOWED_HOSTS",
    "127.0.0.1,localhost",
)

if (
    RENDER_EXTERNAL_HOSTNAME
    and RENDER_EXTERNAL_HOSTNAME
    not in ALLOWED_HOSTS
):
    ALLOWED_HOSTS.append(
        RENDER_EXTERNAL_HOSTNAME
    )


CSRF_TRUSTED_ORIGINS = env_list(
    "CSRF_TRUSTED_ORIGINS",
)

if RENDER_EXTERNAL_HOSTNAME:
    render_origin = (
        "https://"
        + RENDER_EXTERNAL_HOSTNAME
    )

    if (
        render_origin
        not in CSRF_TRUSTED_ORIGINS
    ):
        CSRF_TRUSTED_ORIGINS.append(
            render_origin
        )


INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",

    "rest_framework",
    "anymail",

    "accounts",
    "meetings",
    "conferencing",
    "chat",
    "attendance",
]


MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",

    "whitenoise.middleware.WhiteNoiseMiddleware",

    "django.contrib.sessions.middleware.SessionMiddleware",

    "django.middleware.common.CommonMiddleware",

    "django.middleware.csrf.CsrfViewMiddleware",

    "django.contrib.auth.middleware.AuthenticationMiddleware",

    "django.contrib.messages.middleware.MessageMiddleware",

    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]


ROOT_URLCONF = "config.urls"


TEMPLATES = [
    {
        "BACKEND": (
            "django.template.backends."
            "django.DjangoTemplates"
        ),

        "DIRS": [
            BASE_DIR / "templates",
        ],

        "APP_DIRS": True,

        "OPTIONS": {
            "context_processors": [
                (
                    "django.template."
                    "context_processors.request"
                ),
                (
                    "django.contrib.auth."
                    "context_processors.auth"
                ),
                (
                    "django.contrib.messages."
                    "context_processors.messages"
                ),
            ],
        },
    },
]


WSGI_APPLICATION = (
    "config.wsgi.application"
)


DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "",
).strip()


if DATABASE_URL:
    DATABASES = {
        "default": (
            dj_database_url.parse(
                DATABASE_URL,
                conn_max_age=60,
            )
        ),
    }

else:
    DATABASES = {
        "default": {
            "ENGINE": (
                "django.db.backends.sqlite3"
            ),

            "NAME": (
                BASE_DIR / "db.sqlite3"
            ),
        },
    }


AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": (
            "django.contrib.auth."
            "password_validation."
            "UserAttributeSimilarityValidator"
        ),
    },
    {
        "NAME": (
            "django.contrib.auth."
            "password_validation."
            "MinimumLengthValidator"
        ),
    },
    {
        "NAME": (
            "django.contrib.auth."
            "password_validation."
            "CommonPasswordValidator"
        ),
    },
    {
        "NAME": (
            "django.contrib.auth."
            "password_validation."
            "NumericPasswordValidator"
        ),
    },
]


LANGUAGE_CODE = "en-us"

TIME_ZONE = "Asia/Kolkata"

USE_I18N = True

USE_TZ = True


STATIC_URL = "/static/"

STATICFILES_DIRS = [
    BASE_DIR / "static",
]

STATIC_ROOT = (
    BASE_DIR / "staticfiles"
)


STORAGES = {
    "default": {
        "BACKEND": (
            "django.core.files.storage."
            "FileSystemStorage"
        ),
    },

    "staticfiles": {
        "BACKEND": (
            "whitenoise.storage."
            "CompressedManifestStaticFilesStorage"
        ),
    },
}


LOGIN_URL = "login"

LOGIN_REDIRECT_URL = "dashboard"

LOGOUT_REDIRECT_URL = "home"


SESSION_COOKIE_NAME = (
    "meetverse_sessionid_v2"
)

SESSION_COOKIE_PATH = "/"

SESSION_COOKIE_SAMESITE = "Lax"

SESSION_COOKIE_HTTPONLY = True

SESSION_COOKIE_SECURE = not DEBUG


CSRF_COOKIE_SAMESITE = "Lax"

CSRF_COOKIE_SECURE = not DEBUG


SECURE_PROXY_SSL_HEADER = (
    "HTTP_X_FORWARDED_PROTO",
    "https",
)

SECURE_SSL_REDIRECT = env_bool(
    "SECURE_SSL_REDIRECT",
    not DEBUG,
)

SECURE_CONTENT_TYPE_NOSNIFF = True

X_FRAME_OPTIONS = "DENY"


SECURE_HSTS_SECONDS = int(
    os.getenv(
        "SECURE_HSTS_SECONDS",
        "0",
    )
)

SECURE_HSTS_INCLUDE_SUBDOMAINS = (
    env_bool(
        "SECURE_HSTS_INCLUDE_SUBDOMAINS",
        False,
    )
)

SECURE_HSTS_PRELOAD = env_bool(
    "SECURE_HSTS_PRELOAD",
    False,
)


PASSWORD_RESET_TIMEOUT = int(
    os.getenv(
        "PASSWORD_RESET_TIMEOUT",
        "3600",
    )
)


EMAIL_BACKEND = os.getenv(
    "EMAIL_BACKEND",
    (
        "django.core.mail.backends."
        "console.EmailBackend"
    ),
)


MAILJET_API_KEY = os.getenv(
    "MAILJET_API_KEY",
    "",
).strip()


MAILJET_SECRET_KEY = os.getenv(
    "MAILJET_SECRET_KEY",
    "",
).strip()


ANYMAIL = {
    "MAILJET_API_KEY": (
        MAILJET_API_KEY
    ),

    "MAILJET_SECRET_KEY": (
        MAILJET_SECRET_KEY
    ),
}


DEFAULT_FROM_EMAIL = os.getenv(
    "DEFAULT_FROM_EMAIL",
    (
        "MeetVerse "
        "<noreply@meetverse.local>"
    ),
)


SERVER_EMAIL = os.getenv(
    "SERVER_EMAIL",
    DEFAULT_FROM_EMAIL,
)


EMAIL_TIMEOUT = int(
    os.getenv(
        "EMAIL_TIMEOUT",
        "20",
    )
)


LIVEKIT_URL = os.getenv(
    "LIVEKIT_URL",
    "",
)

LIVEKIT_API_KEY = os.getenv(
    "LIVEKIT_API_KEY",
    "",
)

LIVEKIT_API_SECRET = os.getenv(
    "LIVEKIT_API_SECRET",
    "",
)