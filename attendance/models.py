from django.conf import settings
from django.db import models
from django.utils import timezone

from meetings.models import Meeting, MeetingParticipant


class AttendanceSession(models.Model):
    """
    Stores one attendance session whenever a user joins a meeting.
    """

    meeting = models.ForeignKey(
        Meeting,
        on_delete=models.CASCADE,
        related_name="attendance_sessions",
    )

    participant = models.ForeignKey(
        MeetingParticipant,
        on_delete=models.SET_NULL,
        related_name="attendance_sessions",
        null=True,
        blank=True,
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="attendance_sessions",
    )

    display_name = models.CharField(
        max_length=150,
    )

    role = models.CharField(
        max_length=30,
        default="Participant",
    )

    joined_at = models.DateTimeField(
        default=timezone.now,
    )

    left_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    duration_seconds = models.PositiveIntegerField(
        default=0,
    )

    is_active = models.BooleanField(
        default=True,
    )

    class Meta:
        ordering = ["joined_at"]

    def close_session(self, leave_time=None):
        """
        Close an active session and calculate its duration.
        """

        if not self.is_active:
            return

        leave_time = leave_time or timezone.now()

        if leave_time < self.joined_at:
            leave_time = self.joined_at

        duration = leave_time - self.joined_at

        self.left_at = leave_time
        self.duration_seconds = max(
            int(duration.total_seconds()),
            0,
        )
        self.is_active = False

        self.save(
            update_fields=[
                "left_at",
                "duration_seconds",
                "is_active",
            ]
        )

    def __str__(self):
        return (
            f"{self.display_name} - "
            f"{self.meeting.meeting_code}"
        )