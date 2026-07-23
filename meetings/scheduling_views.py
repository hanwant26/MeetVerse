from datetime import timedelta

from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.db import transaction
from django.shortcuts import (
    get_object_or_404,
    redirect,
    render,
)
from django.utils import timezone
from django.views.decorators.http import (
    require_http_methods,
    require_POST,
)

from .models import (
    Meeting,
    MeetingParticipant,
)
from .scheduling_forms import ScheduleMeetingForm


def get_default_schedule_values():
    """
    Return a default meeting time approximately
    30 minutes ahead, rounded to five minutes.
    """

    initial_time = timezone.localtime(
        timezone.now()
        + timedelta(minutes=30)
    ).replace(
        second=0,
        microsecond=0,
    )

    remaining_minutes = (
        5 - initial_time.minute % 5
    ) % 5

    initial_time += timedelta(
        minutes=remaining_minutes
    )

    hour_12 = initial_time.hour % 12

    if hour_12 == 0:
        hour_12 = 12

    period = (
        "AM"
        if initial_time.hour < 12
        else "PM"
    )

    return {
        "schedule_date": (
            initial_time.date()
        ),
        "schedule_hour": str(
            hour_12
        ),
        "schedule_minute": (
            f"{initial_time.minute:02d}"
        ),
        "schedule_period": period,
        "duration_minutes": 60,
        "waiting_room_enabled": True,
    }


@login_required
@require_http_methods(
    [
        "GET",
        "POST",
    ]
)
def schedule_meeting(request):
    """
    Create a new scheduled meeting.
    """

    if request.method == "POST":
        form = ScheduleMeetingForm(
            request.POST
        )

        if form.is_valid():
            with transaction.atomic():
                meeting = form.save(
                    commit=False
                )

                meeting.host = request.user
                meeting.status = (
                    Meeting.Status.UPCOMING
                )

                meeting.started_at = None
                meeting.ended_at = None

                meeting.set_password(
                    form.cleaned_data.get(
                        "meeting_password"
                    )
                )

                meeting.save()

                display_name = (
                    request.user.get_full_name()
                    or request.user.username
                )

                MeetingParticipant.objects.create(
                    meeting=meeting,
                    user=request.user,
                    display_name=display_name,
                    role=(
                        MeetingParticipant
                        .Role
                        .HOST
                    ),
                    status=(
                        MeetingParticipant
                        .Status
                        .ADMITTED
                    ),
                    admitted_at=timezone.now(),
                )

            messages.success(
                request,
                (
                    "Your meeting has "
                    "been scheduled."
                ),
            )

            return redirect(
                "scheduled_meeting_success",
                meeting_code=(
                    meeting.meeting_code
                ),
            )

    else:
        form = ScheduleMeetingForm(
            initial=(
                get_default_schedule_values()
            )
        )

    return render(
        request,
        "meetings/schedule_meeting.html",
        {
            "form": form,
        },
    )


@login_required
@require_POST
def start_scheduled_meeting(
    request,
    meeting_code,
):
    """
    Start an upcoming scheduled meeting.

    Only the host can perform this action.
    """

    with transaction.atomic():
        meeting = get_object_or_404(
            Meeting.objects.select_for_update(),
            meeting_code=meeting_code,
            host=request.user,
        )

        if (
            meeting.status
            == Meeting.Status.ENDED
        ):
            messages.error(
                request,
                (
                    "This meeting has already "
                    "ended and cannot be reopened."
                ),
            )

            return redirect(
                "dashboard"
            )

        if (
            meeting.status
            == Meeting.Status.LIVE
        ):
            messages.info(
                request,
                (
                    "This meeting is "
                    "already live."
                ),
            )

            return redirect(
                "meeting_detail",
                meeting_code=(
                    meeting.meeting_code
                ),
            )

        if meeting.scheduled_at is None:
            messages.error(
                request,
                (
                    "This is not a "
                    "scheduled meeting."
                ),
            )

            return redirect(
                "dashboard"
            )

        current_time = timezone.now()

        meeting.status = (
            Meeting.Status.LIVE
        )

        meeting.started_at = (
            current_time
        )

        meeting.ended_at = None

        meeting.save(
            update_fields=[
                "status",
                "started_at",
                "ended_at",
            ]
        )

        display_name = (
            request.user.get_full_name()
            or request.user.username
        )

        MeetingParticipant.objects.update_or_create(
            meeting=meeting,
            user=request.user,
            defaults={
                "display_name": display_name,
                "role": (
                    MeetingParticipant
                    .Role
                    .HOST
                ),
                "status": (
                    MeetingParticipant
                    .Status
                    .ADMITTED
                ),
                "admitted_at": (
                    current_time
                ),
                "left_at": None,
            },
        )

    messages.success(
        request,
        (
            "The scheduled meeting "
            "is now live."
        ),
    )

    return redirect(
        "meeting_detail",
        meeting_code=(
            meeting.meeting_code
        ),
    )


@login_required
@require_http_methods(
    [
        "GET",
        "POST",
    ]
)
def edit_scheduled_meeting(
    request,
    meeting_code,
):
    """
    Edit an upcoming scheduled meeting.
    """

    meeting = get_object_or_404(
        Meeting,
        meeting_code=meeting_code,
        host=request.user,
        status=Meeting.Status.UPCOMING,
        scheduled_at__isnull=False,
    )

    if request.method == "POST":
        form = ScheduleMeetingForm(
            request.POST,
            instance=meeting,
            editing=True,
        )

        if form.is_valid():
            with transaction.atomic():
                updated_meeting = (
                    form.save(
                        commit=False
                    )
                )

                new_password = (
                    form.cleaned_data.get(
                        "meeting_password"
                    )
                )

                if new_password:
                    updated_meeting.set_password(
                        new_password
                    )

                updated_meeting.save()

            messages.success(
                request,
                (
                    "The scheduled meeting "
                    "was updated."
                ),
            )

            return redirect(
                "scheduled_meeting_success",
                meeting_code=(
                    updated_meeting
                    .meeting_code
                ),
            )

    else:
        form = ScheduleMeetingForm(
            instance=meeting,
            editing=True,
        )

    return render(
        request,
        (
            "meetings/"
            "edit_scheduled_meeting.html"
        ),
        {
            "form": form,
            "meeting": meeting,
        },
    )


@login_required
@require_http_methods(
    [
        "GET",
        "POST",
    ]
)
def cancel_scheduled_meeting(
    request,
    meeting_code,
):
    """
    Permanently cancel an upcoming
    scheduled meeting.
    """

    meeting = get_object_or_404(
        Meeting,
        meeting_code=meeting_code,
        host=request.user,
        status=Meeting.Status.UPCOMING,
        scheduled_at__isnull=False,
    )

    if request.method == "POST":
        meeting_title = (
            meeting.title
        )

        meeting.delete()

        messages.success(
            request,
            (
                f'"{meeting_title}" was '
                "cancelled successfully."
            ),
        )

        return redirect(
            "dashboard"
        )

    return render(
        request,
        (
            "meetings/"
            "cancel_scheduled_meeting.html"
        ),
        {
            "meeting": meeting,
        },
    )


@login_required
def scheduled_meeting_success(
    request,
    meeting_code,
):
    """
    Display and manage scheduled meeting
    information.
    """

    meeting = get_object_or_404(
        Meeting,
        meeting_code=meeting_code,
        host=request.user,
    )

    scheduled_end_at = None

    if meeting.scheduled_at:
        scheduled_end_at = (
            meeting.scheduled_at
            + timedelta(
                minutes=(
                    meeting.duration_minutes
                )
            )
        )

    return render(
        request,
        (
            "meetings/"
            "scheduled_meeting_success.html"
        ),
        {
            "meeting": meeting,
            "scheduled_end_at": (
                scheduled_end_at
            ),
            "current_timezone": (
                timezone
                .get_current_timezone_name()
            ),
        },
    )