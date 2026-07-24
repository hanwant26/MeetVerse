from django import forms
from django.contrib.auth.models import User
from django.contrib.auth.forms import (
    UserCreationForm,
)
from django.contrib.auth.password_validation import (
    validate_password,
)
from django.core.exceptions import (
    ValidationError,
)


class RegisterForm(UserCreationForm):
    """
    Form for creating a new MeetVerse account.
    """

    email = forms.EmailField(
        required=True,
        widget=forms.EmailInput(
            attrs={
                "class": "form-control",
                "placeholder": (
                    "Enter your email"
                ),
                "autocomplete": "email",
            }
        ),
    )

    class Meta:
        model = User

        fields = [
            "username",
            "email",
            "password1",
            "password2",
        ]

    def __init__(
        self,
        *args,
        **kwargs
    ):
        super().__init__(
            *args,
            **kwargs
        )

        self.fields[
            "username"
        ].widget.attrs.update(
            {
                "class": "form-control",
                "placeholder": (
                    "Choose a username"
                ),
                "autocomplete": (
                    "username"
                ),
            }
        )

        self.fields[
            "password1"
        ].widget.attrs.update(
            {
                "class": "form-control",
                "placeholder": (
                    "Create a password"
                ),
                "autocomplete": (
                    "new-password"
                ),
            }
        )

        self.fields[
            "password2"
        ].widget.attrs.update(
            {
                "class": "form-control",
                "placeholder": (
                    "Confirm your password"
                ),
                "autocomplete": (
                    "new-password"
                ),
            }
        )

    def clean_email(self):
        email = (
            self.cleaned_data["email"]
            .strip()
            .lower()
        )

        if User.objects.filter(
            email__iexact=email
        ).exists():
            raise forms.ValidationError(
                (
                    "An account with this email "
                    "address already exists."
                )
            )

        return email


class ForgotPasswordOTPForm(
    forms.Form
):
    """
    Request a password-reset OTP.
    """

    email = forms.EmailField(
        required=True,
        widget=forms.EmailInput(
            attrs={
                "class": "form-control",
                "placeholder": (
                    "Enter your registered email"
                ),
                "autocomplete": "email",
                "autofocus": True,
            }
        ),
    )

    def clean_email(self):
        return (
            self.cleaned_data["email"]
            .strip()
            .lower()
        )


class VerifyPasswordResetOTPForm(
    forms.Form
):
    """
    Verify the OTP and create a new password.
    """

    otp = forms.CharField(
        min_length=6,
        max_length=6,
        widget=forms.TextInput(
            attrs={
                "class": "form-control text-center",
                "placeholder": "Enter 6-digit OTP",
                "autocomplete": "one-time-code",
                "inputmode": "numeric",
                "pattern": "[0-9]{6}",
                "maxlength": "6",
                "autofocus": True,
            }
        ),
    )

    new_password1 = forms.CharField(
        widget=forms.PasswordInput(
            attrs={
                "class": "form-control",
                "placeholder": (
                    "Enter new password"
                ),
                "autocomplete": "new-password",
            }
        ),
    )

    new_password2 = forms.CharField(
        widget=forms.PasswordInput(
            attrs={
                "class": "form-control",
                "placeholder": (
                    "Confirm new password"
                ),
                "autocomplete": "new-password",
            }
        ),
    )

    def __init__(
        self,
        *args,
        user=None,
        **kwargs
    ):
        super().__init__(
            *args,
            **kwargs
        )

        self.user = user

    def clean_otp(self):
        otp = (
            self.cleaned_data["otp"]
            .strip()
        )

        if not otp.isdigit():
            raise forms.ValidationError(
                "Enter a valid six-digit OTP."
            )

        return otp

    def clean(self):
        cleaned_data = super().clean()

        password1 = cleaned_data.get(
            "new_password1"
        )

        password2 = cleaned_data.get(
            "new_password2"
        )

        if not password1 or not password2:
            return cleaned_data

        if password1 != password2:
            self.add_error(
                "new_password2",
                "The two passwords do not match.",
            )

            return cleaned_data

        try:
            validate_password(
                password1,
                user=self.user,
            )

        except ValidationError as error:
            self.add_error(
                "new_password1",
                error,
            )

        return cleaned_data