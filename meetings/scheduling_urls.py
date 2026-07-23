from django.urls import path

from . import (
    calendar_views,
    scheduling_views,
)


urlpatterns = [
    path(
        "",
        scheduling_views.schedule_meeting,
        name="schedule_meeting",
    ),

    path(
        "<str:meeting_code>/start/",
        scheduling_views.start_scheduled_meeting,
        name="start_scheduled_meeting",
    ),

    path(
        "<str:meeting_code>/edit/",
        scheduling_views.edit_scheduled_meeting,
        name="edit_scheduled_meeting",
    ),

    path(
        "<str:meeting_code>/cancel/",
        scheduling_views.cancel_scheduled_meeting,
        name="cancel_scheduled_meeting",
    ),

    path(
        "<str:meeting_code>/calendar.ics",
        calendar_views.download_meeting_calendar,
        name="download_meeting_calendar",
    ),

    path(
        "<str:meeting_code>/",
        scheduling_views.scheduled_meeting_success,
        name="scheduled_meeting_success",
    ),
]