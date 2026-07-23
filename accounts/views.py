from django.contrib.auth import login
from django.contrib.auth.decorators import login_required
from django.db.models import Q
from django.shortcuts import redirect, render
from django.utils import timezone

from meetings.models import Meeting

from .forms import RegisterForm


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

    future_meetings = upcoming_meetings.filter(
        scheduled_at__gte=current_time
    )

    overdue_meetings = upcoming_meetings.filter(
        scheduled_at__lt=current_time
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
            Q(status=Meeting.Status.LIVE)
            | Q(status=Meeting.Status.UPCOMING)
            | Q(status=Meeting.Status.ENDED)
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

            "current_time": (
                current_time
            ),
        },
    )