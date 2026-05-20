from __future__ import annotations

from django.conf import settings
from django.http import HttpRequest
from django.http import HttpResponse

from smart_hr.recruitment.models import JobOffer

SITE_URL: str = getattr(settings, "SITE_URL", "https://smart-hr.tech")

_STATIC_PAGES = [
    {"loc": f"{SITE_URL}/", "changefreq": "weekly", "priority": "1.0"},
    {"loc": f"{SITE_URL}/jobs", "changefreq": "daily", "priority": "0.8"},
]


def _render_url(loc: str, lastmod: str, changefreq: str, priority: str) -> str:
    return (
        f"  <url>\n"
        f"    <loc>{loc}</loc>\n"
        f"    <lastmod>{lastmod}</lastmod>\n"
        f"    <changefreq>{changefreq}</changefreq>\n"
        f"    <priority>{priority}</priority>\n"
        f"  </url>"
    )


def sitemap_view(request: HttpRequest) -> HttpResponse:
    """Génère le sitemap XML incluant les offres d'emploi ouvertes."""
    lines: list[str] = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        "",
    ]

    lines.extend(
        _render_url(
            loc=page["loc"],
            lastmod="2026-05-20",
            changefreq=page["changefreq"],
            priority=page["priority"],
        )
        for page in _STATIC_PAGES
    )

    open_job_offers = JobOffer.objects.filter(status=JobOffer.Status.OPEN).only("id", "updated_at").order_by("-updated_at")

    lines.extend(
        _render_url(
            loc=f"{SITE_URL}/jobs/{offer.id}/apply",
            lastmod=offer.updated_at.strftime("%Y-%m-%d") if offer.updated_at else "2026-05-20",
            changefreq="weekly",
            priority="0.6",
        )
        for offer in open_job_offers
    )

    lines += ["", "</urlset>"]
    xml_content = "\n".join(lines)
    return HttpResponse(xml_content, content_type="application/xml; charset=utf-8")
