from django.contrib import admin
from django.urls import include, path


urlpatterns = [
    path(
        "admin/",
        admin.site.urls,
    ),

    path(
        "accounts/",
        include("accounts.urls"),
    ),

    path(
        "chat/",
        include("chat.urls"),
    ),

    path(
        "attendance/",
        include("attendance.urls"),
    ),

    path(
        "moderation/",
        include(
            "meetings.moderation_urls"
        ),
    ),

    path(
        "schedule/",
        include(
            "meetings.scheduling_urls"
        ),
    ),

    path(
        "",
        include("meetings.urls"),
    ),
]