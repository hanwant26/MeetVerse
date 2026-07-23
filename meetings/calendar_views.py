from datetime import (
    timedelta,
    timezone as datetime_timezone,
)
from urllib.parse import urlencode

from django.contrib.auth.decorators import login_required
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.urls import reverse
from django.utils import timezone
from django.views.decorators.http import require_GET

from .models import Meeting


def escape_ical_text(value):
    """
    Escape text characters that have special meaning
    inside an iCalendar file.
    """

    text = str(value or "")

    return (
        text
        .replace("\\", "\\\\")
        .replace("\r\n", "\\n")
        .replace("\r", "\\n")
        .replace("\n", "\\n")
        .replace(",", "\\,")
        .replace(";", "\\;")
    )


def format_ical_datetime(value):
    """
    Convert a Django datetime to iCalendar UTC format.

    Example:
    20260725T103000Z
    """

    utc_value = value.astimezone(
        datetime_timezone.utc
    )

    return utc_value.strftime(
        "%Y%m%dT%H%M%SZ"
    )


def fold_ical_line(line):
    """
    Fold long iCalendar lines while preserving
    UTF-8 characters.
    """

    if len(line.encode("utf-8")) <= 75:
        return line

    folded_lines = []
    remaining_text = line
    first_line = True

    while remaining_text:
        byte_limit = (
            75
            if first_line
            else 74
        )

        current_chunk = ""
        current_bytes = 0

        for character in remaining_text:
            character_bytes = len(
                character.encode("utf-8")
            )

            if (
                current_chunk
                and current_bytes
                + character_bytes
                > byte_limit
            ):
                break

            current_chunk += character
            current_bytes += (
                character_bytes
            )

        if first_line:
            folded_lines.append(
                current_chunk
            )
        else:
            folded_lines.append(
                f" {current_chunk}"
            )

        remaining_text = (
            remaining_text[
                len(current_chunk):
            ]
        )

        first_line = False

    return "\r\n".join(
        folded_lines
    )


def create_join_url(
    request,
    meeting,
):
    """
    Generate an absolute meeting join URL.
    """

    query_string = urlencode(
        {
            "code": meeting.meeting_code,
        }
    )

    relative_url = (
        f"{reverse('join_meeting')}"
        f"?{query_string}"
    )

    return request.build_absolute_uri(
        relative_url
    )


def build_calendar_content(
    request,
    meeting,
):
    """
    Build an RFC-style iCalendar meeting event.
    """

    start_time = meeting.scheduled_at

    end_time = (
        start_time
        + timedelta(
            minutes=(
                meeting.duration_minutes
            )
        )
    )

    join_url = create_join_url(
        request,
        meeting,
    )

    description_parts = []

    if meeting.description:
        description_parts.append(
            meeting.description.strip()
        )

    description_parts.extend(
        [
            (
                "MeetVerse meeting code: "
                f"{meeting.meeting_code}"
            ),
            f"Join meeting: {join_url}",
        ]
    )

    event_description = "\n".join(
        description_parts
    )

    host_name = (
        meeting.host.get_full_name()
        or meeting.host.username
    )

    uid = (
        f"meetverse-"
        f"{meeting.pk}-"
        f"{meeting.meeting_code}"
        "@meetverse.local"
    )

    calendar_lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        (
            "PRODID:-//MeetVerse//"
            "Meeting Calendar//EN"
        ),
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        "BEGIN:VEVENT",
        f"UID:{uid}",
        (
            "DTSTAMP:"
            f"{format_ical_datetime(timezone.now())}"
        ),
        (
            "DTSTART:"
            f"{format_ical_datetime(start_time)}"
        ),
        (
            "DTEND:"
            f"{format_ical_datetime(end_time)}"
        ),
        (
            "SUMMARY:"
            f"{escape_ical_text(meeting.title)}"
        ),
        (
            "DESCRIPTION:"
            f"{escape_ical_text(event_description)}"
        ),
        (
            "LOCATION:"
            "MeetVerse Online Meeting"
        ),
        (
            "ORGANIZER;CN="
            f"{escape_ical_text(host_name)}:"
            "mailto:noreply@meetverse.local"
        ),
        f"URL:{join_url}",
        "STATUS:CONFIRMED",
        "TRANSP:OPAQUE",
        "END:VEVENT",
        "END:VCALENDAR",
    ]

    folded_lines = [
        fold_ical_line(line)
        for line in calendar_lines
    ]

    return (
        "\r\n".join(folded_lines)
        + "\r\n"
    )


@login_required
@require_GET
def download_meeting_calendar(
    request,
    meeting_code,
):
    """
    Download a scheduled meeting as an .ics file.

    Only the meeting host may download it.
    """

    meeting = get_object_or_404(
        Meeting.objects.select_related(
            "host"
        ),
        meeting_code=meeting_code,
        host=request.user,
        scheduled_at__isnull=False,
    )

    calendar_content = (
        build_calendar_content(
            request,
            meeting,
        )
    )

    filename = (
        "meetverse-"
        f"{meeting.meeting_code}.ics"
    )

    response = HttpResponse(
        calendar_content,
        content_type=(
            "text/calendar; "
            "charset=utf-8"
        ),
    )

    response[
        "Content-Disposition"
    ] = (
        f'attachment; filename="{filename}"'
    )

    response[
        "Cache-Control"
    ] = "private, no-store"

    return response