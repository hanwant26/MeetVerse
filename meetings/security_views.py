from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.db import transaction
from django.shortcuts import get_object_or_404, redirect
from django.utils import timezone
from django.views.decorators.http import require_POST

from .models import Meeting, MeetingParticipant


def redirect_after_security_action(meeting):
    """
    Return the correct page after changing
    a meeting security setting.
    """

    if (
        meeting.status == Meeting.Status.UPCOMING
        and meeting.scheduled_at
    ):
        return redirect(
            "scheduled_meeting_success",
            meeting_code=meeting.meeting_code,
        )

    if meeting.status == Meeting.Status.LIVE:
        return redirect(
            "meeting_detail",
            meeting_code=meeting.meeting_code,
        )

    return redirect("dashboard")


@login_required
@require_POST
def toggle_meeting_lock(
    request,
    meeting_code,
):
    """
    Allow the host to lock or unlock a live meeting.
    """

    with transaction.atomic():
        meeting = get_object_or_404(
            Meeting.objects.select_for_update(),
            meeting_code=meeting_code,
            host=request.user,
        )

        if meeting.status == Meeting.Status.ENDED:
            messages.error(
                request,
                (
                    "This meeting has already ended and "
                    "cannot be locked or unlocked."
                ),
            )

            return redirect("dashboard")

        if meeting.status != Meeting.Status.LIVE:
            messages.warning(
                request,
                (
                    "The meeting must be live before "
                    "you can lock or unlock it."
                ),
            )

            return redirect_after_security_action(
                meeting
            )

        meeting.is_locked = not meeting.is_locked

        meeting.save(
            update_fields=[
                "is_locked",
            ]
        )

    if meeting.is_locked:
        messages.success(
            request,
            (
                "The meeting is now locked. "
                "New participants cannot join."
            ),
        )
    else:
        messages.success(
            request,
            (
                "The meeting is now unlocked. "
                "New participants may join."
            ),
        )

    return redirect_after_security_action(
        meeting
    )


@login_required
@require_POST
def toggle_waiting_room(
    request,
    meeting_code,
):
    """
    Enable or disable the waiting room.

    Disabling it automatically admits users
    who are currently waiting.
    """

    with transaction.atomic():
        meeting = get_object_or_404(
            Meeting.objects.select_for_update(),
            meeting_code=meeting_code,
            host=request.user,
        )

        if meeting.status == Meeting.Status.ENDED:
            messages.error(
                request,
                (
                    "This meeting has already ended. "
                    "Its waiting-room setting cannot "
                    "be changed."
                ),
            )

            return redirect("dashboard")

        if meeting.status != Meeting.Status.LIVE:
            messages.warning(
                request,
                (
                    "The meeting must be live before "
                    "you can change its waiting-room "
                    "setting."
                ),
            )

            return redirect_after_security_action(
                meeting
            )

        meeting.waiting_room_enabled = (
            not meeting.waiting_room_enabled
        )

        meeting.save(
            update_fields=[
                "waiting_room_enabled",
            ]
        )

        admitted_count = 0

        if not meeting.waiting_room_enabled:
            current_time = timezone.now()

            admitted_count = (
                MeetingParticipant.objects.filter(
                    meeting=meeting,
                    status=(
                        MeetingParticipant
                        .Status
                        .WAITING
                    ),
                ).update(
                    status=(
                        MeetingParticipant
                        .Status
                        .ADMITTED
                    ),
                    admitted_at=current_time,
                    left_at=None,
                )
            )

    if meeting.waiting_room_enabled:
        messages.success(
            request,
            (
                "The waiting room is now enabled. "
                "New participants will require "
                "host approval."
            ),
        )

    elif admitted_count > 0:
        messages.success(
            request,
            (
                "The waiting room is now disabled. "
                f"{admitted_count} waiting participant"
                f"{'s were' if admitted_count != 1 else ' was'} "
                "automatically admitted."
            ),
        )

    else:
        messages.success(
            request,
            (
                "The waiting room is now disabled. "
                "New participants will join directly."
            ),
        )

    return redirect_after_security_action(
        meeting
    )