from django.contrib.auth.mixins import LoginRequiredMixin
from django.contrib.messages.views import SuccessMessageMixin
from django.db.models import QuerySet
from django.urls import reverse
from django.utils.translation import gettext_lazy as _
from django.views.generic import DetailView
from django.views.generic import RedirectView
from django.views.generic import UpdateView

from smart_hr.users.models import User


class UserDetailView(LoginRequiredMixin, DetailView):
    """Affiche la page détail d'un utilisateur via son username."""

    model = User
    slug_field = "username"
    slug_url_kwarg = "username"


user_detail_view = UserDetailView.as_view()


class UserUpdateView(LoginRequiredMixin, SuccessMessageMixin, UpdateView):
    """Permet à l'utilisateur connecté de mettre à jour ses informations."""

    model = User
    fields = ["name"]
    success_message = _("Information successfully updated")

    def get_success_url(self) -> str:
        """Redirige vers la page détail de l'utilisateur après mise à jour."""
        assert self.request.user.is_authenticated  # type guard
        return self.request.user.get_absolute_url()

    def get_object(self, queryset: QuerySet | None = None) -> User:
        """Retourne toujours l'utilisateur connecté pour éviter l'édition d'un tiers."""
        assert self.request.user.is_authenticated  # type guard
        return self.request.user


user_update_view = UserUpdateView.as_view()


class UserRedirectView(LoginRequiredMixin, RedirectView):
    """Redirection utilitaire vers la page profil de l'utilisateur connecté."""

    permanent = False

    def get_redirect_url(self) -> str:
        """Construit l'URL de destination profil à partir du username courant."""
        return reverse("users:detail", kwargs={"username": self.request.user.username})


user_redirect_view = UserRedirectView.as_view()
