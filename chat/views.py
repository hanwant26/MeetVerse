import json

from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.views.decorators.http import require_GET, require_POST

from meetings.models import Meeting, MeetingParticipant

from .models import ChatMessage


def user_can_access_meeting(user, meeting):
    """
    Check whether a user is allowed to access the meeting chat.
    """

    if meeting.host == user:
        return True

    return MeetingParticipant.objects.filter(
        meeting=meeting,
        user=user,
        status=MeetingParticipant.Status.ADMITTED,
    ).exists()


@login_required
@require_GET
def chat_history(request, meeting_code):
    """
    Return up to 200 saved chat messages for a meeting.
    """

    meeting = get_object_or_404(
        Meeting,
        meeting_code=meeting_code,
    )

    if not user_can_access_meeting(
        request.user,
        meeting,
    ):
        return JsonResponse(
            {
                "error": (
                    "You do not have permission "
                    "to view this meeting chat."
                )
            },
            status=403,
        )

    saved_messages = (
        meeting.chat_messages
        .select_related("sender")
        .order_by("created_at")[:200]
    )

    message_data = []

    for chat_message in saved_messages:
        sender_name = (
            chat_message.sender.get_full_name()
            or chat_message.sender.username
        )

        message_data.append(
            {
                "id": chat_message.id,
                "sender_id": chat_message.sender_id,
                "sender_name": sender_name,
                "message": chat_message.message,
                "created_at": (
                    chat_message.created_at.isoformat()
                ),
                "is_own": (
                    chat_message.sender_id
                    == request.user.id
                ),
            }
        )

    return JsonResponse(
        {
            "messages": message_data,
        }
    )


@login_required
@require_POST
def save_chat_message(request, meeting_code):
    """
    Save a meeting chat message in the database.
    """

    meeting = get_object_or_404(
        Meeting,
        meeting_code=meeting_code,
    )

    if not user_can_access_meeting(
        request.user,
        meeting,
    ):
        return JsonResponse(
            {
                "error": (
                    "You do not have permission "
                    "to send messages in this meeting."
                )
            },
            status=403,
        )

    if meeting.status == Meeting.Status.ENDED:
        return JsonResponse(
            {
                "error": (
                    "Messages cannot be sent because "
                    "this meeting has ended."
                )
            },
            status=403,
        )

    try:
        body = json.loads(
            request.body.decode("utf-8")
        )
    except (
        json.JSONDecodeError,
        UnicodeDecodeError,
    ):
        return JsonResponse(
            {
                "error": "Invalid request data.",
            },
            status=400,
        )

    message_text = str(
        body.get("message", "")
    ).strip()

    if not message_text:
        return JsonResponse(
            {
                "error": "The message cannot be empty.",
            },
            status=400,
        )

    if len(message_text) > 1000:
        return JsonResponse(
            {
                "error": (
                    "The message cannot contain "
                    "more than 1000 characters."
                )
            },
            status=400,
        )

    chat_message = ChatMessage.objects.create(
        meeting=meeting,
        sender=request.user,
        message=message_text,
    )

    sender_name = (
        request.user.get_full_name()
        or request.user.username
    )

    return JsonResponse(
        {
            "success": True,
            "message": {
                "id": chat_message.id,
                "sender_id": request.user.id,
                "sender_name": sender_name,
                "message": chat_message.message,
                "created_at": (
                    chat_message.created_at.isoformat()
                ),
                "is_own": True,
            },
        },
        status=201,
    )