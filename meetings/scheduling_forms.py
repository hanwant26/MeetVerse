from datetime import datetime, time, timedelta

from django import forms
from django.core.exceptions import ValidationError
from django.utils import timezone

from .models import Meeting


HOUR_CHOICES = [
    (str(hour), f"{hour:02d}")
    for hour in range(1, 13)
]

MINUTE_CHOICES = [
    (f"{minute:02d}", f"{minute:02d}")
    for minute in range(0, 60, 5)
]

PERIOD_CHOICES = [
    ("AM", "AM"),
    ("PM", "PM"),
]


class ScheduleMeetingForm(forms.ModelForm):
    schedule_date = forms.DateField(
        label="Meeting date",
        widget=forms.DateInput(
            attrs={
                "class": "form-control",
                "type": "date",
            }
        ),
    )

    schedule_hour = forms.ChoiceField(
        label="Hour",
        choices=HOUR_CHOICES,
        widget=forms.Select(
            attrs={
                "class": "form-select",
            }
        ),
    )

    schedule_minute = forms.ChoiceField(
        label="Minute",
        choices=MINUTE_CHOICES,
        widget=forms.Select(
            attrs={
                "class": "form-select",
            }
        ),
    )

    schedule_period = forms.ChoiceField(
        label="AM/PM",
        choices=PERIOD_CHOICES,
        widget=forms.Select(
            attrs={
                "class": "form-select",
            }
        ),
    )

    meeting_password = forms.CharField(
        required=False,
        max_length=100,
        label="Meeting password",
        help_text=(
            "Optional. Leave empty when no password "
            "is required."
        ),
        widget=forms.PasswordInput(
            attrs={
                "class": "form-control",
                "placeholder": "Optional meeting password",
                "autocomplete": "new-password",
            }
        ),
    )

    class Meta:
        model = Meeting

        fields = [
            "title",
            "description",
            "schedule_date",
            "schedule_hour",
            "schedule_minute",
            "schedule_period",
            "duration_minutes",
            "meeting_password",
            "waiting_room_enabled",
        ]

        widgets = {
            "title": forms.TextInput(
                attrs={
                    "class": "form-control",
                    "placeholder": (
                        "Example: MCA Project Discussion"
                    ),
                    "autofocus": True,
                }
            ),

            "description": forms.Textarea(
                attrs={
                    "class": "form-control",
                    "rows": 4,
                    "placeholder": (
                        "Add agenda or meeting details"
                    ),
                }
            ),

            "duration_minutes": forms.NumberInput(
                attrs={
                    "class": "form-control",
                    "min": 15,
                    "max": 480,
                    "step": 15,
                }
            ),

            "waiting_room_enabled": (
                forms.CheckboxInput(
                    attrs={
                        "class": "form-check-input",
                    }
                )
            ),
        }

        labels = {
            "title": "Meeting title",
            "description": "Description",
            "duration_minutes": (
                "Planned duration in minutes"
            ),
            "waiting_room_enabled": (
                "Enable waiting room"
            ),
        }

        help_texts = {
            "duration_minutes": (
                "Choose between 15 and 480 minutes."
            ),
        }

    def __init__(
        self,
        *args,
        editing=False,
        **kwargs,
    ):
        self.editing = editing

        super().__init__(
            *args,
            **kwargs,
        )

        self.fields[
            "schedule_date"
        ].widget.attrs["min"] = (
            timezone.localdate().isoformat()
        )

        if editing:
            self.fields[
                "meeting_password"
            ].help_text = (
                "Leave empty to keep the current "
                "meeting password."
            )

            self.fields[
                "meeting_password"
            ].widget.attrs["placeholder"] = (
                "Leave empty to keep current password"
            )

        if (
            not self.is_bound
            and self.instance
            and self.instance.pk
            and self.instance.scheduled_at
        ):
            scheduled_time = timezone.localtime(
                self.instance.scheduled_at
            )

            hour_12 = scheduled_time.hour % 12

            if hour_12 == 0:
                hour_12 = 12

            period = (
                "AM"
                if scheduled_time.hour < 12
                else "PM"
            )

            self.initial.update(
                {
                    "schedule_date": (
                        scheduled_time.date()
                    ),
                    "schedule_hour": str(
                        hour_12
                    ),
                    "schedule_minute": (
                        f"{scheduled_time.minute:02d}"
                    ),
                    "schedule_period": period,
                }
            )

        elif not self.is_bound:
            self.fields[
                "duration_minutes"
            ].initial = 60

    def clean_title(self):
        title = self.cleaned_data[
            "title"
        ].strip()

        if len(title) < 3:
            raise ValidationError(
                "Meeting title must contain "
                "at least 3 characters."
            )

        return title

    def clean_description(self):
        return self.cleaned_data.get(
            "description",
            "",
        ).strip()

    def clean(self):
        cleaned_data = super().clean()

        schedule_date = cleaned_data.get(
            "schedule_date"
        )

        schedule_hour = cleaned_data.get(
            "schedule_hour"
        )

        schedule_minute = cleaned_data.get(
            "schedule_minute"
        )

        schedule_period = cleaned_data.get(
            "schedule_period"
        )

        if not all(
            [
                schedule_date,
                schedule_hour,
                schedule_minute,
                schedule_period,
            ]
        ):
            return cleaned_data

        hour = int(schedule_hour)
        minute = int(schedule_minute)

        if schedule_period == "AM":
            if hour == 12:
                hour = 0
        else:
            if hour != 12:
                hour += 12

        selected_time = time(
            hour=hour,
            minute=minute,
        )

        naive_datetime = datetime.combine(
            schedule_date,
            selected_time,
        )

        current_timezone = (
            timezone.get_current_timezone()
        )

        scheduled_at = timezone.make_aware(
            naive_datetime,
            current_timezone,
        )

        original_time_unchanged = False

        if (
            self.instance
            and self.instance.pk
            and self.instance.scheduled_at
        ):
            original_time = timezone.localtime(
                self.instance.scheduled_at
            ).replace(
                second=0,
                microsecond=0,
            )

            selected_local_time = (
                timezone.localtime(
                    scheduled_at
                ).replace(
                    second=0,
                    microsecond=0,
                )
            )

            original_time_unchanged = (
                original_time
                == selected_local_time
            )

        minimum_time = (
            timezone.now()
            + timedelta(minutes=5)
        )

        if (
            scheduled_at < minimum_time
            and not original_time_unchanged
        ):
            self.add_error(
                "schedule_date",
                (
                    "Choose a meeting time at least "
                    "5 minutes from now."
                ),
            )

            return cleaned_data

        cleaned_data["scheduled_at"] = (
            scheduled_at
        )

        return cleaned_data

    def save(self, commit=True):
        meeting = super().save(
            commit=False
        )

        meeting.scheduled_at = (
            self.cleaned_data[
                "scheduled_at"
            ]
        )

        if commit:
            meeting.save()
            self.save_m2m()

        return meeting