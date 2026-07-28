from django.contrib.auth import (
    views as auth_views,
)
from django.urls import (
    include,
    path,
)

from . import views
from .forms import (
    UsernameOrEmailAuthenticationForm,
)


urlpatterns = [
    path(
        "register/",
        views.register_view,
        name="register",
    ),

    path(
        "login/",
        auth_views.LoginView.as_view(
            template_name=(
                "registration/login.html"
            ),
            authentication_form=(
                UsernameOrEmailAuthenticationForm
            ),
            redirect_authenticated_user=True,
        ),
        name="login",
    ),

    path(
        "logout/",
        auth_views.LogoutView.as_view(),
        name="logout",
    ),

    path(
        "forgot-password/",
        views.password_reset_otp_request_view,
        name="password_reset",
    ),

    path(
        (
            "forgot-password/"
            "verify/<uuid:request_id>/"
        ),
        views.password_reset_otp_verify_view,
        name="password_reset_verify",
    ),

    path(
        "forgot-password/complete/",
        views.password_reset_complete_view,
        name="password_reset_complete",
    ),

    path(
        "dashboard/",
        views.dashboard_view,
        name="dashboard",
    ),

    # Google and Facebook authentication URLs.
    path(
        "",
        include("allauth.urls"),
    ),
]