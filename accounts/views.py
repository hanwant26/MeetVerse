import secrets
from datetime import timedelta

from django.conf import settings
from django.contrib.auth import login
from django.contrib.auth.decorators import (
    login_required,
)
from django.contrib.auth.hashers import (
    check_password,
    make_password,
)
from django.contrib.auth.models import User
from django.core.mail import send_mail
from django.db import transaction
from django.db.models import Q
from django.shortcuts import (
    get_object_or_404,
    redirect,
    render,
)
from django.utils import timezone

from meetings.models import Meeting

from .forms import (
    ForgotPasswordOTPForm,
    RegisterForm,
    VerifyPasswordResetOTPForm,
)
from .models import PasswordResetOTP


OTP_EXPIRY_MINUTES = 10

OTP_MAX_ATTEMPTS = 5

OTP_REQUEST_COOLDOWN_SECONDS = 60


def generate_six_digit_otp():
    """
    Generate a cryptographically secure
    six-digit one-time password.
    """

    return str(
        secrets.randbelow(
            900000
        )
        + 100000
    )


def mask_email(email):
    """
    Hide part of an email address when it
    is displayed on the verification page.
    """

    if "@" not in email:
        return email

    username, domain = email.split(
        "@",
        1,
    )

    if len(username) <= 2:
        hidden_username = (
            username[0]
            + "*"
        )

    else:
        hidden_username = (
            username[:2]
            + "*" * max(
                len(username) - 2,
                2,
            )
        )

    return (
        hidden_username
        + "@"
        + domain
    )


def register_view(request):
    """
    Register a new MeetVerse user.
    """

    if request.user.is_authenticated:
        return redirect("dashboard")

    if request.method == "POST":
        form = RegisterForm(
            request.POST
        )

        if form.is_valid():
            user = form.save()

            login(
                request,
                user,
            )

            return redirect(
                "dashboard"
            )

    else:
        form = RegisterForm()

    return render(
        request,
        "registration/register.html",
        {
            "form": form,
        },
    )


def password_reset_otp_request_view(
    request
):
    """
    Send a six-digit password-reset OTP.
    """

    if request.user.is_authenticated:
        return redirect("dashboard")

    if request.method == "POST":
        form = ForgotPasswordOTPForm(
            request.POST
        )

        if form.is_valid():
            email = form.cleaned_data[
                "email"
            ]

            cooldown_time = (
                timezone.now()
                - timedelta(
                    seconds=(
                        OTP_REQUEST_COOLDOWN_SECONDS
                    )
                )
            )

            recent_request_exists = (
                PasswordResetOTP.objects
                .filter(
                    email__iexact=email,
                    created_at__gte=(
                        cooldown_time
                    ),
                )
                .exists()
            )

            if recent_request_exists:
                form.add_error(
                    "email",
                    (
                        "Please wait one minute "
                        "before requesting another "
                        "OTP."
                    ),
                )

            else:
                user = (
                    User.objects
                    .filter(
                        email__iexact=email,
                        is_active=True,
                    )
                    .order_by("id")
                    .first()
                )

                PasswordResetOTP.objects.filter(
                    email__iexact=email,
                    is_used=False,
                ).update(
                    is_used=True
                )

                otp = generate_six_digit_otp()

                reset_request = (
                    PasswordResetOTP.objects
                    .create(
                        user=user,
                        email=email,
                        otp_hash=(
                            make_password(otp)
                        ),
                        expires_at=(
                            timezone.now()
                            + timedelta(
                                minutes=(
                                    OTP_EXPIRY_MINUTES
                                )
                            )
                        ),
                        max_attempts=(
                            OTP_MAX_ATTEMPTS
                        ),
                    )
                )

                if user is not None:
                    email_message = (
                        f"Hello {user.username},\n\n"
                        "Your MeetVerse password "
                        "reset OTP is:\n\n"
                        f"{otp}\n\n"
                        "This OTP will expire in "
                        f"{OTP_EXPIRY_MINUTES} "
                        "minutes and can be used "
                        "only once.\n\n"
                        "If you did not request a "
                        "password reset, ignore this "
                        "email.\n\n"
                        "MeetVerse"
                    )

                    try:
                        send_mail(
                            subject=(
                                "Your MeetVerse "
                                "password reset OTP"
                            ),
                            message=email_message,
                            from_email=(
                                settings
                                .DEFAULT_FROM_EMAIL
                            ),
                            recipient_list=[
                                email,
                            ],
                            fail_silently=False,
                        )

                    except Exception:
                        reset_request.delete()

                        form.add_error(
                            "email",
                            (
                                "MeetVerse could not "
                                "send the OTP. Please "
                                "try again."
                            ),
                        )

                    else:
                        return redirect(
                            "password_reset_verify",
                            request_id=(
                                reset_request.id
                            ),
                        )

                else:
                    
                    # This branch intentionally uses
                    # the same verification page so
                    # the application does not reveal
                    # whether an account exists.
                    
                    return redirect(
                        "password_reset_verify",
                        request_id=(
                            reset_request.id
                        ),
                    )

    else:
        form = ForgotPasswordOTPForm()

    return render(
        request,
        (
            "registration/"
            "password_reset_form.html"
        ),
        {
            "form": form,
        },
    )


def password_reset_otp_verify_view(
    request,
    request_id
):
    """
    Verify an OTP and update the password.
    """

    if request.user.is_authenticated:
        return redirect("dashboard")

    reset_request = get_object_or_404(
        PasswordResetOTP,
        id=request_id,
    )

    form = VerifyPasswordResetOTPForm(
        request.POST or None,
        user=reset_request.user,
    )

    if (
        request.method == "POST"
        and form.is_valid()
    ):
        with transaction.atomic():
            locked_request = (
                PasswordResetOTP.objects
                .select_for_update()
                .get(
                    id=request_id
                )
            )

            if locked_request.is_used:
                form.add_error(
                    None,
                    (
                        "This OTP has already been "
                        "used. Request a new OTP."
                    ),
                )

            elif locked_request.is_expired:
                locked_request.is_used = True

                locked_request.save(
                    update_fields=[
                        "is_used",
                    ]
                )

                form.add_error(
                    None,
                    (
                        "This OTP has expired. "
                        "Request a new OTP."
                    ),
                )

            elif locked_request.is_blocked:
                form.add_error(
                    None,
                    (
                        "Too many incorrect attempts. "
                        "Request a new OTP."
                    ),
                )

            else:
                submitted_otp = (
                    form.cleaned_data["otp"]
                )

                otp_is_valid = (
                    locked_request.user
                    is not None
                    and check_password(
                        submitted_otp,
                        locked_request.otp_hash,
                    )
                )

                if not otp_is_valid:
                    locked_request.attempts += 1

                    locked_request.save(
                        update_fields=[
                            "attempts",
                        ]
                    )

                    if locked_request.is_blocked:
                        form.add_error(
                            "otp",
                            (
                                "Too many incorrect "
                                "attempts. Request a "
                                "new OTP."
                            ),
                        )

                    else:
                        form.add_error(
                            "otp",
                            (
                                "Incorrect OTP. "
                                f"{locked_request.attempts_remaining} "
                                "attempts remaining."
                            ),
                        )

                else:
                    user = locked_request.user

                    user.set_password(
                        form.cleaned_data[
                            "new_password1"
                        ]
                    )

                    user.save(
                        update_fields=[
                            "password",
                        ]
                    )

                    PasswordResetOTP.objects.filter(
                        email__iexact=(
                            locked_request.email
                        ),
                        is_used=False,
                    ).update(
                        is_used=True
                    )

                    return redirect(
                        "password_reset_complete"
                    )

        reset_request.refresh_from_db()

    return render(
        request,
        (
            "registration/"
            "password_reset_verify.html"
        ),
        {
            "form": form,

            "reset_request": (
                reset_request
            ),

            "masked_email": mask_email(
                reset_request.email
            ),

            "otp_expired": (
                reset_request.is_expired
            ),

            "otp_blocked": (
                reset_request.is_blocked
            ),
        },
    )


def password_reset_complete_view(
    request
):
    """
    Display the successful reset page.
    """

    return render(
        request,
        (
            "registration/"
            "password_reset_complete.html"
        ),
    )


@login_required
def dashboard_view(request):
    """
    Display the user's hosted meetings,
    upcoming meetings and meeting history.
    """

    current_time = timezone.now()

    hosted_meetings = Meeting.objects.filter(
        host=request.user
    )

    live_meetings = (
        hosted_meetings
        .filter(
            status=Meeting.Status.LIVE,
        )
        .order_by(
            "-started_at",
            "-created_at",
        )
    )

    upcoming_meetings = (
        hosted_meetings
        .filter(
            status=Meeting.Status.UPCOMING,
            scheduled_at__isnull=False,
        )
        .order_by(
            "scheduled_at",
        )
    )

    future_meetings = (
        upcoming_meetings
        .filter(
            scheduled_at__gte=current_time
        )
    )

    overdue_meetings = (
        upcoming_meetings
        .filter(
            scheduled_at__lt=current_time
        )
    )

    ended_meetings = (
        hosted_meetings
        .filter(
            status=Meeting.Status.ENDED,
        )
        .order_by(
            "-ended_at",
            "-created_at",
        )
    )

    recent_meetings = (
        hosted_meetings
        .filter(
            Q(
                status=Meeting.Status.LIVE
            )
            | Q(
                status=Meeting.Status.UPCOMING
            )
            | Q(
                status=Meeting.Status.ENDED
            )
        )
        .order_by(
            "-created_at",
        )[:10]
    )

    meeting_counts = {
        "all": hosted_meetings.count(),

        "live": live_meetings.count(),

        "upcoming": future_meetings.count(),

        "overdue": overdue_meetings.count(),

        "ended": ended_meetings.count(),
    }

    return render(
        request,
        "dashboard.html",
        {
            "live_meetings": live_meetings,

            "upcoming_meetings": (
                future_meetings
            ),

            "overdue_meetings": (
                overdue_meetings
            ),

            "ended_meetings": (
                ended_meetings[:10]
            ),

            "recent_meetings": (
                recent_meetings
            ),

            "meeting_counts": (
                meeting_counts
            ),

            "current_time": current_time,
        },
    )