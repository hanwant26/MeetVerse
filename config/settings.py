"""
Django settings for MeetVerse.
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


def env_bool(name, default=False):
    value = os.getenv(name)

    if value is None:
        return default

    return value.strip().lower() in {
        "1",
        "true",
        "yes",
        "on",
    }


def env_list(name, default=""):
    value = os.getenv(name, default)

    return [
        item.strip()
        for item in value.split(",")
        if item.strip()
    ]


SECRET_KEY = os.getenv("DJANGO_SECRET_KEY")

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
    and RENDER_EXTERNAL_HOSTNAME not in ALLOWED_HOSTS
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

    if render_origin not in CSRF_TRUSTED_ORIGINS:
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

    "allauth",
    "allauth.account",
    "allauth.socialaccount",
    "allauth.socialaccount.providers.google",
    "allauth.socialaccount.providers.facebook",

    "accounts.apps.AccountsConfig",
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

    "allauth.account.middleware.AccountMiddleware",

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
                (
                    "accounts.context_processors."
                    "social_login_status"
                ),
            ],
        },
    },
]


WSGI_APPLICATION = "config.wsgi.application"


DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "",
).strip()


if DATABASE_URL:
    DATABASES = {
        "default": dj_database_url.parse(
            DATABASE_URL,
            conn_max_age=60,
        ),
    }

else:
    DATABASES = {
        "default": {
            "ENGINE": (
                "django.db.backends.sqlite3"
            ),
            "NAME": BASE_DIR / "db.sqlite3",
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


AUTHENTICATION_BACKENDS = [
    "django.contrib.auth.backends.ModelBackend",

    (
        "allauth.account.auth_backends."
        "AuthenticationBackend"
    ),
]


LANGUAGE_CODE = "en-us"

TIME_ZONE = "Asia/Kolkata"

USE_I18N = True

USE_TZ = True


STATIC_URL = "/static/"

STATICFILES_DIRS = [
    BASE_DIR / "static",
]

STATIC_ROOT = BASE_DIR / "staticfiles"


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


DEFAULT_AUTO_FIELD = (
    "django.db.models.BigAutoField"
)


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

SECURE_HSTS_INCLUDE_SUBDOMAINS = env_bool(
    "SECURE_HSTS_INCLUDE_SUBDOMAINS",
    False,
)

SECURE_HSTS_PRELOAD = env_bool(
    "SECURE_HSTS_PRELOAD",
    False,
)


# Local username/email accounts

ACCOUNT_LOGIN_METHODS = {
    "username",
    "email",
}

ACCOUNT_SIGNUP_FIELDS = [
    "username*",
    "email*",
    "password1*",
    "password2*",
]

ACCOUNT_EMAIL_VERIFICATION = "none"

ACCOUNT_LOGOUT_REDIRECT_URL = "home"


# Social authentication

SOCIALACCOUNT_AUTO_SIGNUP = True

SOCIALACCOUNT_LOGIN_ON_GET = False

SOCIALACCOUNT_STORE_TOKENS = False

SOCIALACCOUNT_EMAIL_AUTHENTICATION_AUTO_CONNECT = True


GOOGLE_CLIENT_ID = os.getenv(
    "GOOGLE_CLIENT_ID",
    "",
).strip()

GOOGLE_CLIENT_SECRET = os.getenv(
    "GOOGLE_CLIENT_SECRET",
    "",
).strip()


FACEBOOK_CLIENT_ID = os.getenv(
    "FACEBOOK_CLIENT_ID",
    "",
).strip()

FACEBOOK_CLIENT_SECRET = os.getenv(
    "FACEBOOK_CLIENT_SECRET",
    "",
).strip()


SOCIALACCOUNT_PROVIDERS = {
    "google": {
        "SCOPE": [
            "profile",
            "email",
        ],

        "AUTH_PARAMS": {
            "access_type": "online",
        },

        "OAUTH_PKCE_ENABLED": True,

        "EMAIL_AUTHENTICATION": True,
    },

    "facebook": {
        "METHOD": "oauth2",

        # Do not request the Facebook email
        # permission because Meta is rejecting
        # it for the current application.
        "SCOPE": [
            "public_profile",
        ],

        "FIELDS": [
            "id",
            "name",
            "first_name",
            "last_name",
            "picture",
        ],

        "VERIFIED_EMAIL": False,
    },
}


if GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET:
    SOCIALACCOUNT_PROVIDERS[
        "google"
    ]["APP"] = {
        "client_id": GOOGLE_CLIENT_ID,
        "secret": GOOGLE_CLIENT_SECRET,
        "key": "",
    }


if FACEBOOK_CLIENT_ID and FACEBOOK_CLIENT_SECRET:
    SOCIALACCOUNT_PROVIDERS[
        "facebook"
    ]["APP"] = {
        "client_id": FACEBOOK_CLIENT_ID,
        "secret": FACEBOOK_CLIENT_SECRET,
        "key": "",
    }





# OTP email delivery

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
    "MAILJET_API_KEY": MAILJET_API_KEY,
    "MAILJET_SECRET_KEY": MAILJET_SECRET_KEY,
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


# LiveKit

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