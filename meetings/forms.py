from django import forms

from .models import Meeting


class CreateMeetingForm(forms.ModelForm):

    password = forms.CharField(
        required=False,
        max_length=64,
        strip=False,
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
            "waiting_room_enabled",
        ]

        widgets = {
            "title": forms.TextInput(
                attrs={
                    "class": "form-control",
                    "placeholder": "Enter meeting title",
                }
            ),
            "waiting_room_enabled": forms.CheckboxInput(
                attrs={
                    "class": "form-check-input",
                }
            ),
        }
class JoinMeetingForm(forms.Form):

    meeting_code = forms.CharField(
        max_length=20,
        widget=forms.TextInput(
            attrs={
                "class": "form-control",
                "placeholder": "ABC-DEF-GH2",
                "autocomplete": "off",
            }
        ),
    )

    password = forms.CharField(
        required=False,
        max_length=64,
        strip=False,
        widget=forms.PasswordInput(
            attrs={
                "class": "form-control",
                "placeholder": "Enter meeting password",
                "autocomplete": "current-password",
            }
        ),
    )

    def clean_meeting_code(self):
        code = self.cleaned_data["meeting_code"]

        code = code.strip().upper()
        code = code.replace(" ", "")

        # Allow users to enter a code without hyphens.
        plain_code = code.replace("-", "")

        if len(plain_code) == 9:
            code = (
                f"{plain_code[:3]}-"
                f"{plain_code[3:6]}-"
                f"{plain_code[6:]}"
            )

        return code