import secrets
from datetime import timedelta

from django.conf import settings
from django.contrib.auth.hashers import (
    check_password,
    make_password,
)
from django.core.validators import (
    MaxValueValidator,
    MinValueValidator,
)
from django.db import models


MEETING_CODE_CHARACTERS = (
    "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
)


def generate_meeting_code():
    """
    Generate a readable meeting code.

    Example:
    ABC-DEF-GH2
    """

    groups = []

    for _ in range(3):
        group = "".join(
            secrets.choice(
                MEETING_CODE_CHARACTERS
            )
            for _ in range(3)
        )

        groups.append(group)

    return "-".join(groups)


class Meeting(models.Model):

    class Status(models.TextChoices):
        UPCOMING = "upcoming", "Upcoming"
        LIVE = "live", "Live"
        ENDED = "ended", "Ended"

    title = models.CharField(
        max_length=150,
        default="Instant Meeting",
    )

    description = models.TextField(
        blank=True,
    )

    meeting_code = models.CharField(
        max_length=11,
        unique=True,
        editable=False,
    )

    host = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="hosted_meetings",
    )

    password_hash = models.CharField(
        max_length=128,
        blank=True,
        editable=False,
    )

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.UPCOMING,
    )

    scheduled_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text=(
            "Leave empty for an instant meeting."
        ),
    )

    duration_minutes = models.PositiveIntegerField(
        default=60,
        validators=[
            MinValueValidator(15),
            MaxValueValidator(480),
        ],
        help_text=(
            "Planned meeting duration "
            "between 15 and 480 minutes."
        ),
    )

    waiting_room_enabled = models.BooleanField(
        default=True,
    )

    is_locked = models.BooleanField(
        default=False,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    started_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    ended_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    class Meta:
        ordering = [
            "-created_at",
        ]

        indexes = [
            models.Index(
                fields=[
                    "status",
                    "scheduled_at",
                ],
                name="meeting_status_schedule_idx",
            ),
            models.Index(
                fields=[
                    "host",
                    "status",
                ],
                name="meeting_host_status_idx",
            ),
        ]

    def save(self, *args, **kwargs):
        """
        Generate a unique meeting code automatically.
        """

        if not self.meeting_code:
            while True:
                code = generate_meeting_code()

                meeting_exists = (
                    Meeting.objects.filter(
                        meeting_code=code
                    ).exists()
                )

                if not meeting_exists:
                    self.meeting_code = code
                    break

        super().save(*args, **kwargs)

    def set_password(self, raw_password):
        """
        Hash and save the meeting password.
        """

        if raw_password:
            self.password_hash = make_password(
                raw_password
            )
        else:
            self.password_hash = ""

    def check_meeting_password(
        self,
        raw_password,
    ):
        """
        Check a submitted meeting password.
        """

        if not self.password_hash:
            return True

        return check_password(
            raw_password,
            self.password_hash,
        )

    @property
    def has_password(self):
        """
        Return whether this meeting has a password.
        """

        return bool(self.password_hash)

    @property
    def is_scheduled(self):
        """
        Return whether this is a scheduled meeting.
        """

        return self.scheduled_at is not None

    @property
    def scheduled_end_at(self):
        """
        Return the planned meeting ending time.
        """

        if self.scheduled_at is None:
            return None

        return (
            self.scheduled_at
            + timedelta(
                minutes=self.duration_minutes
            )
        )

    @property
    def is_upcoming(self):
        return (
            self.status
            == self.Status.UPCOMING
        )

    @property
    def is_live(self):
        return (
            self.status
            == self.Status.LIVE
        )

    @property
    def is_ended(self):
        return (
            self.status
            == self.Status.ENDED
        )

    def __str__(self):
        return (
            f"{self.title} "
            f"({self.meeting_code})"
        )


class MeetingParticipant(models.Model):

    class Role(models.TextChoices):
        HOST = "host", "Host"
        PARTICIPANT = (
            "participant",
            "Participant",
        )

    class Status(models.TextChoices):
        WAITING = "waiting", "Waiting"
        ADMITTED = "admitted", "Admitted"
        REJECTED = "rejected", "Rejected"
        LEFT = "left", "Left"

    meeting = models.ForeignKey(
        Meeting,
        on_delete=models.CASCADE,
        related_name="participants",
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="meeting_participations",
    )

    display_name = models.CharField(
        max_length=150,
    )

    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.PARTICIPANT,
    )

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.WAITING,
    )

    joined_at = models.DateTimeField(
        auto_now_add=True,
    )

    admitted_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    left_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    class Meta:
        ordering = [
            "joined_at",
        ]

        constraints = [
            models.UniqueConstraint(
                fields=[
                    "meeting",
                    "user",
                ],
                name=(
                    "unique_user_per_meeting"
                ),
            )
        ]

        indexes = [
            models.Index(
                fields=[
                    "meeting",
                    "status",
                ],
                name="participant_meeting_status_idx",
            ),
        ]

    def __str__(self):
        return (
            f"{self.display_name} - "
            f"{self.meeting.meeting_code}"
        )