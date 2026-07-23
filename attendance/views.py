import csv
import json

from django.contrib.auth.decorators import login_required
from django.http import (
    HttpResponse,
    HttpResponseForbidden,
    JsonResponse,
)
from django.shortcuts import get_object_or_404, render
from django.utils import timezone
from django.views.decorators.http import require_GET, require_POST

from meetings.models import Meeting, MeetingParticipant

from .models import AttendanceSession


def get_request_data(request):
    """
    Read JSON data or normal form data from a request.
    """

    content_type = request.content_type or ""

    if "application/json" in content_type:
        try:
            return json.loads(
                request.body.decode("utf-8")
            )
        except (
            json.JSONDecodeError,
            UnicodeDecodeError,
        ):
            return {}

    return request.POST


def get_participant_access(user, meeting):
    """
    Check whether a user can enter the meeting.
    """

    if meeting.host_id == user.id:
        return {
            "allowed": True,
            "participant": None,
            "display_name": (
                user.get_full_name()
                or user.username
            ),
            "role": "Host",
        }

    participant = (
        MeetingParticipant.objects
        .filter(
            meeting=meeting,
            user=user,
            status=MeetingParticipant.Status.ADMITTED,
        )
        .first()
    )

    if participant is None:
        return {
            "allowed": False,
            "participant": None,
            "display_name": "",
            "role": "",
        }

    display_name = (
        participant.display_name
        or user.get_full_name()
        or user.username
    )

    try:
        role = participant.get_role_display()
    except AttributeError:
        role = "Participant"

    return {
        "allowed": True,
        "participant": participant,
        "display_name": display_name,
        "role": role,
    }


def format_duration(total_seconds):
    """
    Convert seconds into HH:MM:SS format.
    """

    total_seconds = max(
        int(total_seconds or 0),
        0,
    )

    hours, remainder = divmod(
        total_seconds,
        3600,
    )

    minutes, seconds = divmod(
        remainder,
        60,
    )

    return (
        f"{hours:02d}:"
        f"{minutes:02d}:"
        f"{seconds:02d}"
    )


def format_datetime(value):
    """
    Convert a saved datetime to readable local time.
    """

    if value is None:
        return "Still connected"

    try:
        value = timezone.localtime(value)
    except ValueError:
        pass

    return value.strftime(
        "%d %b %Y, %I:%M:%S %p"
    )


def build_attendance_report(meeting):
    """
    Combine all sessions belonging to the same user.
    """

    current_time = timezone.now()

    sessions = (
        AttendanceSession.objects
        .filter(meeting=meeting)
        .select_related(
            "user",
            "participant",
        )
        .order_by("joined_at")
    )

    users = {}

    for session in sessions:
        if session.is_active:
            session_duration = max(
                int(
                    (
                        current_time
                        - session.joined_at
                    ).total_seconds()
                ),
                0,
            )
        else:
            session_duration = (
                session.duration_seconds
            )

        if session.user_id not in users:
            users[session.user_id] = {
                "user_id": session.user_id,
                "display_name": session.display_name,
                "role": session.role,
                "first_joined": session.joined_at,
                "last_left": session.left_at,
                "total_seconds": 0,
                "session_count": 0,
                "is_active": False,
            }

        row = users[session.user_id]

        row["total_seconds"] += (
            session_duration
        )

        row["session_count"] += 1

        if session.joined_at < row["first_joined"]:
            row["first_joined"] = (
                session.joined_at
            )

        if session.is_active:
            row["is_active"] = True
            row["last_left"] = None

        elif not row["is_active"]:
            if (
                row["last_left"] is None
                or (
                    session.left_at is not None
                    and session.left_at
                    > row["last_left"]
                )
            ):
                row["last_left"] = (
                    session.left_at
                )

    report_rows = list(
        users.values()
    )

    report_rows.sort(
        key=lambda row: row["first_joined"]
    )

    for row in report_rows:
        row["first_joined_display"] = (
            format_datetime(
                row["first_joined"]
            )
        )

        row["last_left_display"] = (
            format_datetime(
                row["last_left"]
            )
        )

        row["duration_display"] = (
            format_duration(
                row["total_seconds"]
            )
        )

    return report_rows


def csv_safe(value):
    """
    Prevent spreadsheet formula execution.
    """

    text = str(value or "")

    if text.startswith(
        (
            "=",
            "+",
            "-",
            "@",
        )
    ):
        return f"'{text}"

    return text


@login_required
@require_POST
def join_attendance(request, meeting_code):
    """
    Start an attendance session after LiveKit connects.
    """

    meeting = get_object_or_404(
        Meeting,
        meeting_code=meeting_code,
    )

    if meeting.status == Meeting.Status.ENDED:
        return JsonResponse(
            {
                "error": (
                    "Attendance cannot be started "
                    "because the meeting has ended."
                ),
            },
            status=403,
        )

    access = get_participant_access(
        request.user,
        meeting,
    )

    if not access["allowed"]:
        return JsonResponse(
            {
                "error": (
                    "You are not allowed to enter "
                    "this meeting."
                ),
            },
            status=403,
        )

    current_time = timezone.now()

    active_sessions = (
        AttendanceSession.objects
        .filter(
            meeting=meeting,
            user=request.user,
            is_active=True,
        )
    )

    for active_session in active_sessions:
        active_session.close_session(
            current_time
        )

    attendance_session = (
        AttendanceSession.objects.create(
            meeting=meeting,
            participant=access["participant"],
            user=request.user,
            display_name=access["display_name"],
            role=access["role"],
            joined_at=current_time,
            is_active=True,
        )
    )

    return JsonResponse(
        {
            "success": True,
            "session_id": attendance_session.id,
            "joined_at": (
                attendance_session
                .joined_at
                .isoformat()
            ),
        },
        status=201,
    )


@login_required
@require_POST
def leave_attendance(request, meeting_code):
    """
    Close the active attendance session.
    """

    meeting = get_object_or_404(
        Meeting,
        meeting_code=meeting_code,
    )

    request_data = get_request_data(
        request
    )

    session_id = request_data.get(
        "session_id"
    )

    active_sessions = (
        AttendanceSession.objects
        .filter(
            meeting=meeting,
            user=request.user,
            is_active=True,
        )
        .order_by("-joined_at")
    )

    if session_id:
        active_sessions = (
            active_sessions.filter(
                id=session_id
            )
        )

    attendance_session = (
        active_sessions.first()
    )

    if attendance_session is None:
        return JsonResponse(
            {
                "success": True,
                "message": (
                    "No active attendance "
                    "session was found."
                ),
            }
        )

    attendance_session.close_session(
        timezone.now()
    )

    return JsonResponse(
        {
            "success": True,
            "session_id": attendance_session.id,
            "duration_seconds": (
                attendance_session
                .duration_seconds
            ),
            "duration": format_duration(
                attendance_session
                .duration_seconds
            ),
        }
    )


@login_required
@require_GET
def attendance_report(request, meeting_code):
    """
    Show the attendance report to the meeting host.
    """

    meeting = get_object_or_404(
        Meeting,
        meeting_code=meeting_code,
    )

    if meeting.host_id != request.user.id:
        return HttpResponseForbidden(
            "Only the meeting host can view "
            "the attendance report."
        )

    report_rows = build_attendance_report(
        meeting
    )

    total_attendance_seconds = sum(
        row["total_seconds"]
        for row in report_rows
    )

    return render(
        request,
        "attendance/report.html",
        {
            "meeting": meeting,
            "report_rows": report_rows,
            "participant_count": len(
                report_rows
            ),
            "total_attendance": (
                format_duration(
                    total_attendance_seconds
                )
            ),
        },
    )


@login_required
@require_GET
def download_attendance_csv(
    request,
    meeting_code,
):
    """
    Download the host attendance report as CSV.
    """

    meeting = get_object_or_404(
        Meeting,
        meeting_code=meeting_code,
    )

    if meeting.host_id != request.user.id:
        return HttpResponseForbidden(
            "Only the meeting host can download "
            "the attendance report."
        )

    report_rows = build_attendance_report(
        meeting
    )

    filename = (
        "meetverse-attendance-"
        f"{meeting.meeting_code}.csv"
    )

    response = HttpResponse(
        content_type=(
            "text/csv; charset=utf-8"
        )
    )

    response["Content-Disposition"] = (
        f'attachment; filename="{filename}"'
    )

    response.write("\ufeff")

    writer = csv.writer(response)

    writer.writerow(
        [
            "Meeting Title",
            "Meeting Code",
            "Participant",
            "Role",
            "First Joined",
            "Last Left",
            "Number of Sessions",
            "Total Duration",
            "Current Status",
        ]
    )

    for row in report_rows:
        writer.writerow(
            [
                csv_safe(meeting.title),
                csv_safe(
                    meeting.meeting_code
                ),
                csv_safe(
                    row["display_name"]
                ),
                csv_safe(row["role"]),
                row[
                    "first_joined_display"
                ],
                row[
                    "last_left_display"
                ],
                row["session_count"],
                row["duration_display"],
                (
                    "Connected"
                    if row["is_active"]
                    else "Left"
                ),
            ]
        )

    return response