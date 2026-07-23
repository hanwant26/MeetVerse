from datetime import timedelta

from django.conf import settings
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.http import HttpResponseForbidden, JsonResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.urls import reverse
from django.utils import timezone
from django.views.decorators.cache import never_cache
from django.views.decorators.http import require_GET, require_POST
from livekit import api

from .forms import CreateMeetingForm, JoinMeetingForm
from .models import Meeting, MeetingParticipant


def home(request):
    """
    Display the public MeetVerse home page.
    """

    return render(
        request,
        "home.html",
    )


@login_required
def create_meeting(request):
    """
    Create and immediately start an instant meeting.
    """

    if request.method == "POST":
        form = CreateMeetingForm(
            request.POST
        )

        if form.is_valid():
            meeting = form.save(
                commit=False
            )

            meeting.host = request.user
            meeting.status = Meeting.Status.LIVE
            meeting.started_at = timezone.now()

            raw_password = (
                form.cleaned_data.get(
                    "password"
                )
            )

            meeting.set_password(
                raw_password
            )

            meeting.save()

            MeetingParticipant.objects.update_or_create(
                meeting=meeting,
                user=request.user,
                defaults={
                    "display_name": (
                        request.user.get_full_name()
                        or request.user.username
                    ),
                    "role": (
                        MeetingParticipant.Role.HOST
                    ),
                    "status": (
                        MeetingParticipant.Status.ADMITTED
                    ),
                    "admitted_at": timezone.now(),
                    "left_at": None,
                },
            )

            messages.success(
                request,
                (
                    "Your meeting was created "
                    "successfully."
                ),
            )

            return redirect(
                "meeting_detail",
                meeting_code=(
                    meeting.meeting_code
                ),
            )

    else:
        form = CreateMeetingForm()

    return render(
        request,
        "meetings/create_meeting.html",
        {
            "form": form,
        },
    )


@login_required
def join_meeting(request):
    """
    Allow a signed-in user to request entry
    into a live meeting.
    """

    initial_code = request.GET.get(
        "code",
        "",
    )

    if request.method == "POST":
        form = JoinMeetingForm(
            request.POST
        )

        if form.is_valid():
            meeting_code = (
                form.cleaned_data[
                    "meeting_code"
                ]
            )

            raw_password = (
                form.cleaned_data[
                    "password"
                ]
            )

            meeting = (
                Meeting.objects.filter(
                    meeting_code=meeting_code
                ).first()
            )

            if meeting is None:
                form.add_error(
                    "meeting_code",
                    (
                        "No meeting was found "
                        "with this code."
                    ),
                )

            elif (
                meeting.status
                == Meeting.Status.ENDED
            ):
                form.add_error(
                    "meeting_code",
                    (
                        "This meeting has "
                        "already ended."
                    ),
                )

            elif (
                meeting.status
                == Meeting.Status.UPCOMING
            ):
                form.add_error(
                    "meeting_code",
                    (
                        "The host has not started "
                        "this meeting yet."
                    ),
                )

            elif (
                meeting.status
                != Meeting.Status.LIVE
            ):
                form.add_error(
                    "meeting_code",
                    (
                        "This meeting is not "
                        "currently available."
                    ),
                )

            elif (
                meeting.is_locked
                and meeting.host
                != request.user
            ):
                form.add_error(
                    "meeting_code",
                    (
                        "This meeting has been "
                        "locked by the host."
                    ),
                )

            elif not meeting.check_meeting_password(
                raw_password
            ):
                form.add_error(
                    "password",
                    (
                        "The meeting password "
                        "is incorrect."
                    ),
                )

            elif meeting.host == request.user:
                return redirect(
                    "meeting_detail",
                    meeting_code=(
                        meeting.meeting_code
                    ),
                )

            else:
                display_name = (
                    request.user.get_full_name()
                    or request.user.username
                )

                participation, created = (
                    MeetingParticipant.objects
                    .get_or_create(
                        meeting=meeting,
                        user=request.user,
                        defaults={
                            "display_name": (
                                display_name
                            ),
                            "role": (
                                MeetingParticipant
                                .Role
                                .PARTICIPANT
                            ),
                            "status": (
                                MeetingParticipant
                                .Status
                                .WAITING
                            ),
                        },
                    )
                )

                if (
                    participation.status
                    == MeetingParticipant
                    .Status
                    .ADMITTED
                ):
                    return redirect(
                        "meeting_detail",
                        meeting_code=(
                            meeting.meeting_code
                        ),
                    )

                participation.display_name = (
                    display_name
                )

                participation.role = (
                    MeetingParticipant
                    .Role
                    .PARTICIPANT
                )

                participation.left_at = None

                if (
                    meeting.waiting_room_enabled
                ):
                    participation.status = (
                        MeetingParticipant
                        .Status
                        .WAITING
                    )

                    participation.admitted_at = (
                        None
                    )

                else:
                    participation.status = (
                        MeetingParticipant
                        .Status
                        .ADMITTED
                    )

                    participation.admitted_at = (
                        timezone.now()
                    )

                participation.save(
                    update_fields=[
                        "display_name",
                        "role",
                        "status",
                        "admitted_at",
                        "left_at",
                    ]
                )

                if (
                    meeting.waiting_room_enabled
                ):
                    return redirect(
                        "waiting_room",
                        meeting_code=(
                            meeting.meeting_code
                        ),
                    )

                return redirect(
                    "meeting_detail",
                    meeting_code=(
                        meeting.meeting_code
                    ),
                )

    else:
        form = JoinMeetingForm(
            initial={
                "meeting_code": initial_code,
            }
        )

    return render(
        request,
        "meetings/join_meeting.html",
        {
            "form": form,
        },
    )


@login_required
def waiting_room(
    request,
    meeting_code,
):
    """
    Display the waiting room while host approval
    is pending.
    """

    meeting = get_object_or_404(
        Meeting,
        meeting_code=meeting_code,
    )

    if (
        meeting.status
        == Meeting.Status.UPCOMING
    ):
        messages.warning(
            request,
            (
                "The host has not started "
                "this meeting yet."
            ),
        )

        return redirect(
            "dashboard"
        )

    if (
        meeting.status
        == Meeting.Status.ENDED
    ):
        messages.warning(
            request,
            (
                "This meeting has "
                "already ended."
            ),
        )

        return redirect(
            "dashboard"
        )

    if (
        meeting.status
        != Meeting.Status.LIVE
    ):
        messages.error(
            request,
            (
                "This meeting is not "
                "currently available."
            ),
        )

        return redirect(
            "dashboard"
        )

    if meeting.host == request.user:
        return redirect(
            "meeting_detail",
            meeting_code=(
                meeting.meeting_code
            ),
        )

    participation = get_object_or_404(
        MeetingParticipant,
        meeting=meeting,
        user=request.user,
    )

    if (
        participation.status
        == MeetingParticipant
        .Status
        .ADMITTED
    ):
        return redirect(
            "meeting_detail",
            meeting_code=(
                meeting.meeting_code
            ),
        )

    return render(
        request,
        "meetings/waiting_room.html",
        {
            "meeting": meeting,
            "participation": participation,
        },
    )


@login_required
def waiting_room_status(
    request,
    meeting_code,
):
    """
    Return the participant's waiting-room status.
    """

    meeting = get_object_or_404(
        Meeting,
        meeting_code=meeting_code,
    )

    if (
        meeting.status
        != Meeting.Status.LIVE
    ):
        return JsonResponse(
            {
                "status": meeting.status,
                "meeting_status": (
                    meeting.status
                ),
                "redirect_url": reverse(
                    "dashboard"
                ),
            }
        )

    participation = get_object_or_404(
        MeetingParticipant,
        meeting=meeting,
        user=request.user,
    )

    redirect_url = None

    if (
        participation.status
        == MeetingParticipant
        .Status
        .ADMITTED
    ):
        redirect_url = reverse(
            "meeting_detail",
            kwargs={
                "meeting_code": (
                    meeting.meeting_code
                ),
            },
        )

    return JsonResponse(
        {
            "status": (
                participation.status
            ),
            "meeting_status": (
                meeting.status
            ),
            "redirect_url": (
                redirect_url
            ),
        }
    )


@login_required
@require_GET
@never_cache
def livekit_token(
    request,
    meeting_code,
):
    """
    Generate a secure LiveKit token for the host
    or an admitted participant.
    """

    meeting = get_object_or_404(
        Meeting,
        meeting_code=meeting_code,
    )

    if (
        meeting.status
        == Meeting.Status.UPCOMING
    ):
        return JsonResponse(
            {
                "error": (
                    "The host has not started "
                    "this meeting yet."
                ),
            },
            status=403,
        )

    if (
        meeting.status
        == Meeting.Status.ENDED
    ):
        return JsonResponse(
            {
                "error": (
                    "This meeting has ended."
                ),
            },
            status=403,
        )

    if (
        meeting.status
        != Meeting.Status.LIVE
    ):
        return JsonResponse(
            {
                "error": (
                    "This meeting is not live."
                ),
            },
            status=403,
        )

    is_host = (
        meeting.host == request.user
    )

    if not is_host:
        participation = (
            MeetingParticipant.objects
            .filter(
                meeting=meeting,
                user=request.user,
                status=(
                    MeetingParticipant
                    .Status
                    .ADMITTED
                ),
            )
            .first()
        )

        if participation is None:
            return JsonResponse(
                {
                    "error": (
                        "You must be admitted "
                        "before connecting to "
                        "this meeting."
                    ),
                },
                status=403,
            )

    if not all(
        [
            settings.LIVEKIT_URL,
            settings.LIVEKIT_API_KEY,
            settings.LIVEKIT_API_SECRET,
        ]
    ):
        return JsonResponse(
            {
                "error": (
                    "LiveKit credentials have "
                    "not been configured. "
                    "Check your .env file."
                ),
            },
            status=500,
        )

    identity = (
        f"meetverse-user-"
        f"{request.user.id}"
    )

    display_name = (
        request.user.get_full_name()
        or request.user.username
    )

    try:
        token = (
            api.AccessToken(
                settings.LIVEKIT_API_KEY,
                settings.LIVEKIT_API_SECRET,
            )
            .with_identity(identity)
            .with_name(display_name)
            .with_grants(
                api.VideoGrants(
                    room_join=True,
                    room=(
                        meeting.meeting_code
                    ),
                    can_publish=True,
                    can_subscribe=True,
                    can_publish_data=True,
                )
            )
            .with_ttl(
                timedelta(hours=2)
            )
            .to_jwt()
        )

    except (
        TypeError,
        ValueError,
    ) as error:
        return JsonResponse(
            {
                "error": (
                    "MeetVerse could not "
                    "generate the meeting token."
                ),
                "details": (
                    str(error)
                    if settings.DEBUG
                    else ""
                ),
            },
            status=500,
        )

    return JsonResponse(
        {
            "token": token,
            "url": settings.LIVEKIT_URL,
            "identity": identity,
            "name": display_name,
            "room": meeting.meeting_code,
        }
    )


@login_required
def meeting_detail(
    request,
    meeting_code,
):
    """
    Display a live meeting room for the host
    or an admitted participant.
    """

    meeting = get_object_or_404(
        Meeting,
        meeting_code=meeting_code,
    )

    is_host = (
        meeting.host == request.user
    )

    if (
        meeting.status
        == Meeting.Status.ENDED
    ):
        messages.warning(
            request,
            (
                "This meeting has "
                "already ended."
            ),
        )

        return redirect(
            "dashboard"
        )

    if (
        meeting.status
        == Meeting.Status.UPCOMING
    ):
        if is_host:
            messages.info(
                request,
                (
                    "Start the meeting before "
                    "opening the meeting room."
                ),
            )

            return redirect(
                "scheduled_meeting_success",
                meeting_code=(
                    meeting.meeting_code
                ),
            )

        messages.warning(
            request,
            (
                "The host has not started "
                "this meeting yet."
            ),
        )

        return redirect(
            "dashboard"
        )

    if (
        meeting.status
        != Meeting.Status.LIVE
    ):
        messages.error(
            request,
            (
                "This meeting is not "
                "currently available."
            ),
        )

        return redirect(
            "dashboard"
        )

    if is_host:
        MeetingParticipant.objects.update_or_create(
            meeting=meeting,
            user=request.user,
            defaults={
                "display_name": (
                    request.user.get_full_name()
                    or request.user.username
                ),
                "role": (
                    MeetingParticipant.Role.HOST
                ),
                "status": (
                    MeetingParticipant
                    .Status
                    .ADMITTED
                ),
                "admitted_at": timezone.now(),
                "left_at": None,
            },
        )

    else:
        participation = (
            MeetingParticipant.objects
            .filter(
                meeting=meeting,
                user=request.user,
            )
            .first()
        )

        if participation is None:
            messages.error(
                request,
                (
                    "You must join the "
                    "meeting first."
                ),
            )

            return redirect(
                "join_meeting"
            )

        if (
            participation.status
            == MeetingParticipant
            .Status
            .WAITING
        ):
            return redirect(
                "waiting_room",
                meeting_code=(
                    meeting.meeting_code
                ),
            )

        if (
            participation.status
            != MeetingParticipant
            .Status
            .ADMITTED
        ):
            messages.error(
                request,
                (
                    "You do not have permission "
                    "to enter this meeting."
                ),
            )

            return redirect(
                "dashboard"
            )

    pending_participants = (
        meeting.participants
        .filter(
            status=(
                MeetingParticipant
                .Status
                .WAITING
            )
        )
        .select_related("user")
    )

    admitted_participants = (
        meeting.participants
        .filter(
            status=(
                MeetingParticipant
                .Status
                .ADMITTED
            )
        )
        .select_related("user")
    )

    return render(
        request,
        "meetings/meeting_detail.html",
        {
            "meeting": meeting,
            "is_host": is_host,
            "pending_participants": (
                pending_participants
            ),
            "admitted_participants": (
                admitted_participants
            ),
        },
    )


@login_required
@require_POST
def admit_participant(
    request,
    meeting_code,
    participant_id,
):
    """
    Allow the host to admit a waiting participant.
    """

    meeting = get_object_or_404(
        Meeting,
        meeting_code=meeting_code,
        host=request.user,
    )

    if (
        meeting.status
        != Meeting.Status.LIVE
    ):
        messages.error(
            request,
            (
                "Participants can only be "
                "admitted while the meeting "
                "is live."
            ),
        )

        return redirect(
            "dashboard"
        )

    participant = get_object_or_404(
        MeetingParticipant,
        id=participant_id,
        meeting=meeting,
        status=(
            MeetingParticipant
            .Status
            .WAITING
        ),
    )

    if (
        participant.role
        == MeetingParticipant.Role.HOST
    ):
        return HttpResponseForbidden(
            "The host cannot be modified."
        )

    participant.status = (
        MeetingParticipant
        .Status
        .ADMITTED
    )

    participant.admitted_at = (
        timezone.now()
    )

    participant.left_at = None

    participant.save(
        update_fields=[
            "status",
            "admitted_at",
            "left_at",
        ]
    )

    messages.success(
        request,
        (
            f"{participant.display_name} "
            "was admitted."
        ),
    )

    return redirect(
        "meeting_detail",
        meeting_code=(
            meeting.meeting_code
        ),
    )


@login_required
@require_POST
def reject_participant(
    request,
    meeting_code,
    participant_id,
):
    """
    Allow the host to reject a waiting participant.
    """

    meeting = get_object_or_404(
        Meeting,
        meeting_code=meeting_code,
        host=request.user,
    )

    if (
        meeting.status
        != Meeting.Status.LIVE
    ):
        messages.error(
            request,
            (
                "Participant requests can only "
                "be managed while the meeting "
                "is live."
            ),
        )

        return redirect(
            "dashboard"
        )

    participant = get_object_or_404(
        MeetingParticipant,
        id=participant_id,
        meeting=meeting,
        status=(
            MeetingParticipant
            .Status
            .WAITING
        ),
    )

    if (
        participant.role
        == MeetingParticipant.Role.HOST
    ):
        return HttpResponseForbidden(
            "The host cannot be modified."
        )

    participant.status = (
        MeetingParticipant
        .Status
        .REJECTED
    )

    participant.admitted_at = None

    participant.save(
        update_fields=[
            "status",
            "admitted_at",
        ]
    )

    messages.warning(
        request,
        (
            f"{participant.display_name}'s "
            "request was rejected."
        ),
    )

    return redirect(
        "meeting_detail",
        meeting_code=(
            meeting.meeting_code
        ),
    )