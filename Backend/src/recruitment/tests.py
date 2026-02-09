from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model

from .models import JobOffer, Application


class RecruitmentApiTests(APITestCase):
    def setUp(self):
        User = get_user_model()
        self.rh_user = User.objects.create_user(
            username="rh",
            email="rh@example.com",
            password="testpass123",
            first_name="RH",
            last_name="User",
            role="RH",
        )
        self.candidate_user = User.objects.create_user(
            username="candidate",
            email="candidate@example.com",
            password="testpass123",
            first_name="Cand",
            last_name="User",
            role="CANDIDATE",
        )

        self.open_job = JobOffer.objects.create(
            title="Dev Backend",
            department="IT",
            location="Dakar",
            job_type="full_time",
            description="Desc",
            requirements="Python\nDjango",
            salary_range="800k-1M",
            status="open",
            created_by=self.rh_user,
        )
        self.closed_job = JobOffer.objects.create(
            title="Comptable",
            department="Finance",
            location="Dakar",
            job_type="full_time",
            description="Desc",
            requirements="Excel",
            salary_range="400k-600k",
            status="closed",
            created_by=self.rh_user,
        )

    def test_candidate_sees_only_open_jobs(self):
        self.client.force_authenticate(user=self.candidate_user)
        url = reverse("joboffer-list")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get("results", response.data)
        titles = {item["title"] for item in results}
        self.assertIn(self.open_job.title, titles)
        self.assertNotIn(self.closed_job.title, titles)

    def test_candidate_can_apply(self):
        self.client.force_authenticate(user=self.candidate_user)
        url = reverse("application-list")
        cv = SimpleUploadedFile("cv.pdf", b"dummy pdf content", content_type="application/pdf")
        payload = {
            "job_offer": self.open_job.id,
            "cv": cv,
            "cover_letter": "Motivation",
        }
        response = self.client.post(url, payload, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Application.objects.count(), 1)
        app = Application.objects.first()
        self.assertEqual(app.candidate, self.candidate_user)
        self.assertEqual(app.job_offer, self.open_job)

    def test_rh_can_create_job(self):
        self.client.force_authenticate(user=self.rh_user)
        url = reverse("joboffer-list")
        payload = {
            "title": "Chef de projet",
            "department": "IT",
            "location": "Dakar",
            "job_type": "full_time",
            "description": "Desc",
            "requirements": "Gestion",
            "salary_range": "1M-1.3M",
            "status": "open",
        }
        response = self.client.post(url, payload)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(JobOffer.objects.count(), 3)
