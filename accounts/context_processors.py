from django.conf import settings


def social_login_status(request):
    """
    Show social-login buttons only when the
    required provider credentials are configured.
    """

    return {
        "google_login_enabled": bool(
            settings.GOOGLE_CLIENT_ID
            and settings.GOOGLE_CLIENT_SECRET
        ),

        "facebook_login_enabled": bool(
            settings.FACEBOOK_CLIENT_ID
            and settings.FACEBOOK_CLIENT_SECRET
        ),
    }