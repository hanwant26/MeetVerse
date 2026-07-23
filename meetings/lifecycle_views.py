from asgiref.sync import async_to_sync
from django.conf import settings
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.shortcuts import get_object_or_404, redirect
from django.urls import reverse
from django.utils import timezone
from django.views.decorators.http import require_POST
from livekit import api

from .models import Meeting, MeetingParticipant


def get_livekit_http_url():
    """
    Convert the browser WebSocket URL into the HTTPS URL used
    by the LiveKit server API.
    """

    url = settings.LIVEKIT_URL.strip()

    if url.startswith("wss://"):
        return url.replace("wss://", "https://", 1)

    if url.startswith("ws://"):
        return url.replace("ws://", "http://", 1)

    return url


async def remove_livekit_participant(
    room_name,
    participant_identity,
):
    """Remove one connected participant from LiveKit."""

    async with api.LiveKitAPI(
        url=get_livekit_http_url(),
        api_key=settings.LIVEKIT_API_KEY,
        api_secret=settings.LIVEKIT_API_SECRET,
    ) as livekit_api:
        await livekit_api.room.remove_participant(
            api.RoomParticipantIdentity(
                room=room_name,
                identity=participant_identity,
            )
        )


async def delete_livekit_room(room_name):
    """Delete a LiveKit room and disconnect everyone."""

    async with api.LiveKitAPI(
        url=get_livekit_http_url(),
        api_key=settings.LIVEKIT_API_KEY,
        api_secret=settings.LIVEKIT_API_SECRET,
    ) as livekit_api:
        await livekit_api.room.delete_room(
            api.DeleteRoomRequest(
                room=room_name,
            )
        )


@login_required
@require_POST
def leave_meeting(request, meeting_code):
    """Mark the current participant as having left."""

    meeting = get_object_or_404(
        Meeting,
        meeting_code=meeting_code,
    )

    participation = MeetingParticipant.objects.filter(
        meeting=meeting,
        user=request.user,
    ).first()

    if participation is not None:
        participation.status = MeetingParticipant.Status.LEFT
        participation.left_at = timezone.now()

        participation.save(
            update_fields=[
                "status",
                "left_at",
            ]
        )

    return JsonResponse(
        {
            "success": True,
            "redirect_url": reverse("dashboard"),
        }
    )


@login_required
@require_POST
def remove_participant(
    request,
    meeting_code,
    participant_id,
):
    """Allow the host to remove an admitted participant."""

    meeting = get_object_or_404(
        Meeting,
        meeting_code=meeting_code,
        host=request.user,
    )

    participant = get_object_or_404(
        MeetingParticipant,
        id=participant_id,
        meeting=meeting,
        role=MeetingParticipant.Role.PARTICIPANT,
    )

    participant.status = MeetingParticipant.Status.LEFT
    participant.left_at = timezone.now()

    participant.save(
        update_fields=[
            "status",
            "left_at",
        ]
    )

    livekit_identity = (
        f"meetverse-user-{participant.user_id}"
    )

    try:
        async_to_sync(
            remove_livekit_participant
        )(
            meeting.meeting_code,
            livekit_identity,
        )

        messages.success(
            request,
            (
                f"{participant.display_name} "
                "was removed from the meeting."
            ),
        )

    except Exception as error:
        messages.warning(
            request,
            (
                f"{participant.display_name} was marked as removed, "
                "but LiveKit returned an error: "
                f"{error}"
            ),
        )

    return redirect(
        "meeting_detail",
        meeting_code=meeting.meeting_code,
    )


@login_required
@require_POST
def end_meeting(request, meeting_code):
    """Allow the host to end the meeting for everyone."""

    meeting = get_object_or_404(
        Meeting,
        meeting_code=meeting_code,
        host=request.user,
    )

    if meeting.status == Meeting.Status.ENDED:
        messages.info(
            request,
            "This meeting has already ended.",
        )

        return redirect("dashboard")

    current_time = timezone.now()

    meeting.status = Meeting.Status.ENDED
    meeting.ended_at = current_time

    meeting.save(
        update_fields=[
            "status",
            "ended_at",
        ]
    )

    meeting.participants.update(
        status=MeetingParticipant.Status.LEFT,
        left_at=current_time,
    )

    try:
        async_to_sync(
            delete_livekit_room
        )(
            meeting.meeting_code
        )

        messages.success(
            request,
            "The meeting was ended for everyone.",
        )

    except Exception as error:
        messages.warning(
            request,
            (
                "The meeting was marked as ended, "
                "but LiveKit returned an error: "
                f"{error}"
            ),
        )

    return redirect("dashboard")