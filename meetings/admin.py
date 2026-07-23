from django.contrib import admin

from .models import Meeting, MeetingParticipant

@admin.register(Meeting)
class MeetingAdmin(admin.ModelAdmin):

    list_display = [
        "title",
        "meeting_code",
        "host",
        "status",
        "waiting_room_enabled",
        "created_at",
    ]

    list_filter = [
        "status",
        "waiting_room_enabled",
        "is_locked",
    ]

    search_fields = [
        "title",
        "meeting_code",
        "host__username",
    ]

    readonly_fields = [
        "meeting_code",
        "password_hash",
        "created_at",
        "started_at",
        "ended_at",
    ]
@admin.register(MeetingParticipant)
class MeetingParticipantAdmin(admin.ModelAdmin):

    list_display = [
        "display_name",
        "meeting",
        "role",
        "status",
        "joined_at",
        "admitted_at",
    ]

    list_filter = [
        "role",
        "status",
    ]

    search_fields = [
        "display_name",
        "user__username",
        "meeting__meeting_code",
        "meeting__title",
    ]

    readonly_fields = [
        "joined_at",
        "admitted_at",
        "left_at",
    ]