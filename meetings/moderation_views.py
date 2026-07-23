import logging

from asgiref.sync import async_to_sync
from django.conf import settings
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.http import HttpResponseForbidden
from django.shortcuts import get_object_or_404, redirect
from django.views.decorators.http import require_POST
from livekit import api

from .models import Meeting, MeetingParticipant


logger = logging.getLogger(__name__)


def get_livekit_http_url():
    """
    Convert the LiveKit WebSocket URL into an HTTP API URL.
    """

    livekit_url = str(
        settings.LIVEKIT_URL
    ).strip().rstrip("/")

    if livekit_url.startswith("wss://"):
        return (
            "https://"
            + livekit_url[len("wss://"):]
        )

    if livekit_url.startswith("ws://"):
        return (
            "http://"
            + livekit_url[len("ws://"):]
        )

    return livekit_url


def get_enum_name(message, field_name):
    """
    Return the name of a protobuf enum field.
    """

    try:
        field = (
            message.DESCRIPTOR
            .fields_by_name
            .get(field_name)
        )

        if (
            field is None
            or field.enum_type is None
        ):
            return ""

        field_value = int(
            getattr(message, field_name)
        )

        enum_value = (
            field.enum_type
            .values_by_number
            .get(field_value)
        )

        if enum_value is None:
            return ""

        return enum_value.name.upper()

    except (
        AttributeError,
        TypeError,
        ValueError,
    ):
        return ""


def normalise_values(values):
    """
    Remove empty values and normalise them for comparison.
    """

    return {
        str(value).strip().casefold()
        for value in values
        if value
    }


def find_target_participant(
    livekit_participants,
    candidate_identities,
    candidate_names,
):
    """
    Find the correct connected LiveKit participant.
    """

    normalised_identities = normalise_values(
        candidate_identities
    )

    normalised_names = normalise_values(
        candidate_names
    )

    # First try an exact identity match.
    for livekit_participant in livekit_participants:
        identity = str(
            livekit_participant.identity
            or ""
        ).strip().casefold()

        if identity in normalised_identities:
            return livekit_participant

    # Then try the participant's LiveKit display name.
    matching_names = []

    for livekit_participant in livekit_participants:
        name = str(
            livekit_participant.name
            or ""
        ).strip().casefold()

        if (
            name
            and name in normalised_names
        ):
            matching_names.append(
                livekit_participant
            )

    # Only use a name match when it is unambiguous.
    if len(matching_names) == 1:
        return matching_names[0]

    return None


def find_microphone_track(participant_info):
    """
    Find the microphone track published by a participant.
    """

    fallback_audio_track = None

    for track in participant_info.tracks:
        source_name = get_enum_name(
            track,
            "source",
        )

        track_type_name = get_enum_name(
            track,
            "type",
        )

        try:
            source_number = int(
                track.source
            )
        except (
            AttributeError,
            TypeError,
            ValueError,
        ):
            source_number = -1

        # LiveKit TrackSource.MICROPHONE is source 2.
        if (
            source_number == 2
            or "MICROPHONE" in source_name
        ):
            return track

        # Fallback for an audio track without source metadata.
        if (
            "AUDIO" in track_type_name
            and "SCREEN" not in source_name
        ):
            fallback_audio_track = track

    return fallback_audio_track


async def mute_livekit_microphone(
    room_name,
    candidate_identities,
    candidate_names,
):
    """
    Find the connected participant and mute their microphone.
    """

    livekit_api = api.LiveKitAPI(
        url=get_livekit_http_url(),
        api_key=settings.LIVEKIT_API_KEY,
        api_secret=settings.LIVEKIT_API_SECRET,
    )

    try:
        participant_response = (
            await livekit_api.room.list_participants(
                api.ListParticipantsRequest(
                    room=room_name,
                )
            )
        )

        livekit_participants = list(
            participant_response.participants
        )

        participant_debug_data = [
            {
                "identity": participant.identity,
                "name": participant.name,
                "track_count": len(
                    participant.tracks
                ),
            }
            for participant in livekit_participants
        ]

        logger.warning(
            "LiveKit participants in room %s: %s",
            room_name,
            participant_debug_data,
        )

        target_participant = (
            find_target_participant(
                livekit_participants,
                candidate_identities,
                candidate_names,
            )
        )

        if target_participant is None:
            return {
                "success": False,
                "reason": "participant_not_found",
            }

        microphone_track = (
            find_microphone_track(
                target_participant
            )
        )

        track_debug_data = [
            {
                "sid": track.sid,
                "source": get_enum_name(
                    track,
                    "source",
                ),
                "type": get_enum_name(
                    track,
                    "type",
                ),
                "muted": track.muted,
            }
            for track in target_participant.tracks
        ]

        logger.warning(
            "LiveKit tracks for %s: %s",
            target_participant.identity,
            track_debug_data,
        )

        if microphone_track is None:
            return {
                "success": False,
                "reason": "microphone_not_found",
            }

        if microphone_track.muted:
            return {
                "success": True,
                "already_muted": True,
                "identity": (
                    target_participant.identity
                ),
                "track_sid": (
                    microphone_track.sid
                ),
            }

        mute_response = (
            await livekit_api.room
            .mute_published_track(
                api.MuteRoomTrackRequest(
                    room=room_name,
                    identity=(
                        target_participant.identity
                    ),
                    track_sid=(
                        microphone_track.sid
                    ),
                    muted=True,
                )
            )
        )

        return {
            "success": True,
            "already_muted": bool(
                mute_response.track.muted
            ),
            "identity": (
                target_participant.identity
            ),
            "track_sid": (
                microphone_track.sid
            ),
        }

    finally:
        await livekit_api.aclose()


@login_required
@require_POST
def mute_participant_microphone(
    request,
    meeting_code,
    participant_id,
):
    """
    Allow only the meeting host to mute a participant.
    """

    meeting = get_object_or_404(
        Meeting,
        meeting_code=meeting_code,
    )

    if meeting.host_id != request.user.id:
        return HttpResponseForbidden(
            "Only the meeting host can mute participants."
        )

    if meeting.status == Meeting.Status.ENDED:
        messages.error(
            request,
            "This meeting has already ended.",
        )

        return redirect(
            "meeting_detail",
            meeting_code=meeting.meeting_code,
        )

    participant = get_object_or_404(
        MeetingParticipant.objects.select_related(
            "user"
        ),
        id=participant_id,
        meeting=meeting,
        status=MeetingParticipant.Status.ADMITTED,
    )

    if participant.user_id == request.user.id:
        messages.warning(
            request,
            "Use your own microphone button to mute yourself.",
        )

        return redirect(
            "meeting_detail",
            meeting_code=meeting.meeting_code,
        )

    participant_name = (
        participant.display_name
        or participant.user.get_full_name()
        or participant.user.username
    )

    candidate_identities = [
        f"meetverse-user-{participant.user_id}",
        f"user-{participant.user_id}",
        str(participant.user_id),
        participant.user.username,
    ]

    candidate_names = [
        participant.display_name,
        participant.user.get_full_name(),
        participant.user.username,
    ]

    try:
        result = async_to_sync(
            mute_livekit_microphone
        )(
            meeting.meeting_code,
            candidate_identities,
            candidate_names,
        )

    except Exception as error:
        logger.exception(
            "LiveKit mute request failed."
        )

        messages.error(
            request,
            (
                f"Could not mute {participant_name}. "
                "Check the PowerShell terminal for the error."
            ),
        )

        return redirect(
            "meeting_detail",
            meeting_code=meeting.meeting_code,
        )

    if not result["success"]:
        reason = result.get("reason")

        if reason == "participant_not_found":
            messages.error(
                request,
                (
                    f"{participant_name} was not found "
                    "in the active LiveKit room."
                ),
            )

        elif reason == "microphone_not_found":
            messages.warning(
                request,
                (
                    f"{participant_name} has not turned "
                    "on or published a microphone."
                ),
            )

        else:
            messages.error(
                request,
                "The participant could not be muted.",
            )

    elif result.get("already_muted"):
        messages.info(
            request,
            (
                f"{participant_name}'s microphone "
                "is already muted."
            ),
        )

    else:
        messages.success(
            request,
            (
                f"{participant_name}'s microphone "
                "has been muted."
            ),
        )

    return redirect(
        "meeting_detail",
        meeting_code=meeting.meeting_code,
    )