import uuid

from django.conf import settings
from django.db import models
from django.utils import timezone


class PasswordResetOTP(models.Model):
    """
    Store one-time password codes used for
    resetting MeetVerse account passwords.
    """

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="password_reset_otps",
    )

    email = models.EmailField(
        db_index=True,
    )

    otp_hash = models.CharField(
        max_length=128,
    )

    expires_at = models.DateTimeField()

    attempts = models.PositiveSmallIntegerField(
        default=0,
    )

    max_attempts = models.PositiveSmallIntegerField(
        default=5,
    )

    is_used = models.BooleanField(
        default=False,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    class Meta:
        ordering = [
            "-created_at",
        ]

    def __str__(self):
        return (
            f"Password reset request for "
            f"{self.email}"
        )

    @property
    def is_expired(self):
        return timezone.now() >= self.expires_at

    @property
    def is_blocked(self):
        return self.attempts >= self.max_attempts

    @property
    def attempts_remaining(self):
        return max(
            self.max_attempts - self.attempts,
            0,
        )