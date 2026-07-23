from django.urls import path

from . import (
    lifecycle_views,
    security_views,
    views,
)


urlpatterns = [
    path(
        "",
        views.home,
        name="home",
    ),

    path(
        "meetings/new/",
        views.create_meeting,
        name="create_meeting",
    ),

    path(
        "meetings/join/",
        views.join_meeting,
        name="join_meeting",
    ),

    path(
        "meetings/<str:meeting_code>/waiting/",
        views.waiting_room,
        name="waiting_room",
    ),

    path(
        "meetings/<str:meeting_code>/waiting/status/",
        views.waiting_room_status,
        name="waiting_room_status",
    ),

    path(
        "meetings/<str:meeting_code>/admit/<int:participant_id>/",
        views.admit_participant,
        name="admit_participant",
    ),

    path(
        "meetings/<str:meeting_code>/reject/<int:participant_id>/",
        views.reject_participant,
        name="reject_participant",
    ),

    path(
        "meetings/<str:meeting_code>/token/",
        views.livekit_token,
        name="livekit_token",
    ),

    path(
        "meetings/<str:meeting_code>/lock-toggle/",
        security_views.toggle_meeting_lock,
        name="toggle_meeting_lock",
    ),

    path(
        "meetings/<str:meeting_code>/waiting-room-toggle/",
        security_views.toggle_waiting_room,
        name="toggle_waiting_room",
    ),

    path(
        "meetings/<str:meeting_code>/leave/",
        lifecycle_views.leave_meeting,
        name="leave_meeting",
    ),

    path(
        "meetings/<str:meeting_code>/remove/<int:participant_id>/",
        lifecycle_views.remove_participant,
        name="remove_participant",
    ),

    path(
        "meetings/<str:meeting_code>/end/",
        lifecycle_views.end_meeting,
        name="end_meeting",
    ),

    path(
        "meetings/<str:meeting_code>/",
        views.meeting_detail,
        name="meeting_detail",
    ),
]