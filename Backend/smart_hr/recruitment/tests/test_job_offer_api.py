import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from smart_hr.recruitment.models import JobOffer
from smart_hr.users.models import User

pytestmark = pytest.mark.django_db


@pytest.fixture()
def rh_user(db):
    return User.objects.create_user(
        username="rh_test",
        email="rh@test.com",
        password="pass1234!",
        role=User.Role.RH,
        is_email_verified=True,
    )


@pytest.fixture()
def candidate_user(db):
    return User.objects.create_user(
        username="cand_test",
        email="candidate@test.com",
        password="pass1234!",
        role=User.Role.CANDIDATE,
        is_email_verified=True,
    )


@pytest.fixture()
def employee_user(db):
    return User.objects.create_user(
        username="emp_test",
        email="emp@test.com",
        password="pass1234!",
        role=User.Role.EMPLOYEE,
        is_email_verified=True,
    )


@pytest.fixture()
def job_offer(rh_user):
    return JobOffer.objects.create(
        title="Développeur Django",
        department="Tech",
        description="Poste backend Django",
        requirements="Python\nDjango",
        status=JobOffer.Status.OPEN,
        created_by=rh_user,
    )


@pytest.fixture()
def internal_job_offer(rh_user):
    return JobOffer.objects.create(
        title="Poste Interne Senior",
        department="RH",
        description="Mobilité interne",
        status=JobOffer.Status.OPEN,
        is_internal=True,
        created_by=rh_user,
    )


LIST_URL = "/api/v1/recruitment/job-offers/"


class TestJobOfferVisibility:
    def test_anonymous_sees_only_open_external(self, job_offer, internal_job_offer):
        client = APIClient()
        response = client.get(LIST_URL)
        assert response.status_code == status.HTTP_200_OK
        titles = [item["title"] for item in response.data["results"]]
        assert job_offer.title in titles
        assert internal_job_offer.title not in titles

    def test_employee_sees_open_including_internal(self, employee_user, job_offer, internal_job_offer):
        client = APIClient()
        client.force_authenticate(user=employee_user)
        response = client.get(LIST_URL)
        assert response.status_code == status.HTTP_200_OK
        titles = [item["title"] for item in response.data["results"]]
        assert job_offer.title in titles
        assert internal_job_offer.title in titles

    def test_candidate_sees_only_external(self, candidate_user, job_offer, internal_job_offer):
        client = APIClient()
        client.force_authenticate(user=candidate_user)
        response = client.get(LIST_URL)
        titles = [item["title"] for item in response.data["results"]]
        assert job_offer.title in titles
        assert internal_job_offer.title not in titles

    def test_rh_sees_all(self, rh_user, job_offer, internal_job_offer):
        client = APIClient()
        client.force_authenticate(user=rh_user)
        response = client.get(LIST_URL)
        titles = [item["title"] for item in response.data["results"]]
        assert job_offer.title in titles
        assert internal_job_offer.title in titles


class TestJobOfferCRUD:
    def test_rh_can_create_job_offer(self, rh_user):
        client = APIClient()
        client.force_authenticate(user=rh_user)
        payload = {
            "title": "Data Engineer",
            "department": "Data",
            "description": "Big data role",
            "requirements": "Python\nSpark",
            "status": "open",
        }
        response = client.post(LIST_URL, payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        assert JobOffer.objects.filter(title="Data Engineer").exists()

    def test_candidate_cannot_create(self, candidate_user):
        client = APIClient()
        client.force_authenticate(user=candidate_user)
        response = client.post(LIST_URL, {"title": "hack"}, format="json")
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_anonymous_cannot_create(self):
        client = APIClient()
        response = client.post(LIST_URL, {"title": "hack"}, format="json")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_rh_can_update_job_offer(self, rh_user, job_offer):
        client = APIClient()
        client.force_authenticate(user=rh_user)
        url = f"/api/v1/recruitment/job-offers/{job_offer.pk}/"
        response = client.patch(url, {"title": "Senior Django"}, format="json")
        assert response.status_code == status.HTTP_200_OK
        job_offer.refresh_from_db()
        assert job_offer.title == "Senior Django"

    def test_rh_can_delete_job_offer(self, rh_user, job_offer):
        client = APIClient()
        client.force_authenticate(user=rh_user)
        url = f"/api/v1/recruitment/job-offers/{job_offer.pk}/"
        response = client.delete(url)
        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not JobOffer.objects.filter(pk=job_offer.pk).exists()

    def test_retrieve_job_offer(self, job_offer):
        client = APIClient()
        url = f"/api/v1/recruitment/job-offers/{job_offer.pk}/"
        response = client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["title"] == job_offer.title

    def test_search_job_offers(self, rh_user, job_offer):
        client = APIClient()
        client.force_authenticate(user=rh_user)
        response = client.get(LIST_URL + "?search=Django")
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) >= 1


class TestJobOfferPipeline:
    def test_pipeline_requires_rh(self, candidate_user, job_offer):
        client = APIClient()
        client.force_authenticate(user=candidate_user)
        url = f"/api/v1/recruitment/job-offers/{job_offer.pk}/pipeline/"
        response = client.get(url)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_rh_can_access_pipeline(self, rh_user, job_offer):
        client = APIClient()
        client.force_authenticate(user=rh_user)
        url = f"/api/v1/recruitment/job-offers/{job_offer.pk}/pipeline/"
        response = client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert "pipeline" in response.data
        assert "totals" in response.data
        assert response.data["job_offer_id"] == job_offer.pk
