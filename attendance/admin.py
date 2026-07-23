from django.contrib import admin
from django.utils import timezone

from .models import AttendanceSession


@admin.register(AttendanceSession)
class AttendanceSessionAdmin(admin.ModelAdmin):
    list_display = [
        "display_name",
        "meeting",
        "role",
        "joined_at",
        "left_at",
        "formatted_duration",
        "is_active",
    ]

    search_fields = [
        "display_name",
        "user__username",
        "user__email",
        "meeting__meeting_code",
        "meeting__title",
    ]

    list_filter = [
        "role",
        "is_active",
        "joined_at",
    ]

    readonly_fields = [
        "joined_at",
        "left_at",
        "duration_seconds",
        "formatted_duration",
    ]

    date_hierarchy = "joined_at"

    def formatted_duration(self, obj):
        total_seconds = obj.duration_seconds

        if obj.is_active:
            total_seconds = max(
                int(
                    (
                        timezone.now()
                        - obj.joined_at
                    ).total_seconds()
                ),
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

    formatted_duration.short_description = "Duration"