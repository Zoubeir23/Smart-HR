from rest_framework.pagination import PageNumberPagination


class LargeResultsSetPagination(PageNumberPagination):
    """Pagination standard (20/page) autorisant le client à demander plus.

    Les pages de gestion RH (employés, congés, paie...) chargent la liste
    entière côté frontend pour y appliquer recherche/tri/pagination locaux ;
    sans `page_size_query_param`, elles restaient plafonnées à 20 résultats
    et les enregistrements au-delà devenaient invisibles. `max_page_size`
    empêche l'abus via `?page_size=999999999`.
    """

    page_size_query_param = "page_size"
    max_page_size = 200
